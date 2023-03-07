/*
 * Flocking - Creative audio synthesis for the Web!
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

/*global require, Float32Array, window, AudioContext, webkitAudioContext, jQuery*/
/*jshint white: false, newcap: true, regexp: true, browser: true,
    forin: false, nomen: true, bitwise: false, maxerr: 100,
    indent: 4, plusplus: false, curly: true, eqeqeq: true,
    freeze: true, latedef: true, noarg: true, nonew: true, quotmark: double, undef: true,
    unused: true, strict: true, asi: false, boss: false, evil: false, expr: false,
    funcscope: false*/

    var fluid = fluid || require("infusion"),
    flock = fluid.registerNamespace("flock");

(function () {
    "use strict";

    var $ = jQuery;

    flock.fluid = fluid;

    flock.init = function (options) {
        // TODO: Distribute these from top level on the environment to the audioSystem
        // so that users can more easily specify them in their environment's defaults.
        var enviroOpts = !options ? undefined : {
            components: {
                audioSystem: {
                    options: {
                        model: options
                    }
                }
            }
        };

        var enviro = flock.enviro(enviroOpts);

        return enviro;
    };

    flock.browser = function () {
        if (typeof navigator === "undefined") {
            return {};
        }

        // This is a modified version of jQuery's browser detection code,
        // which they removed from jQuery 2.0.
        // Some of us still have to live in the messy reality of the web.
        var ua = navigator.userAgent.toLowerCase(),
            browser = {},
            match,
            matched;

        match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
            /(webkit)[ \/]([\w.]+)/.exec(ua) ||
            /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
            /(msie) ([\w.]+)/.exec(ua) ||
            ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];

        matched = {
            browser: match[1] || "",
            version: match[2] || "0"
        };

        if (matched.browser) {
            browser[matched.browser] = true;
            browser.version = matched.version;
        }

        // Chrome is Webkit, but Webkit is also Safari.
        if (browser.chrome) {
            browser.webkit = true;
        } else if (browser.webkit) {
            browser.safari = true;
        }

        return browser;
    };

    // TODO: Move to components in the static environment and into the appropriate platform files.
    fluid.registerNamespace("flock.platform");
    flock.platform.isBrowser = typeof window !== "undefined";
    flock.platform.hasRequire = typeof require !== "undefined";
    flock.platform.os = flock.platform.isBrowser ? window.navigator.platform : "unknown";
    flock.platform.isLinux = flock.platform.os.indexOf("Linux") > -1;
    flock.platform.isAndroid = flock.platform.isLinux && flock.platform.os.indexOf("arm") > -1;
    flock.platform.isIOS = flock.platform.os === "iPhone" || flock.platform.os === "iPad" || flock.platform.os === "iPod";
    flock.platform.isMobile = flock.platform.isAndroid || flock.platform.isIOS;
    flock.platform.browser = flock.browser();
    flock.platform.isWebAudio = typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined";
    flock.platform.audioEngine = flock.platform.isBrowser ? "webAudio" : "unknown";

    if (flock.platform.browser && flock.platform.browser.version !== undefined) {
        var dotIdx = flock.platform.browser.version.indexOf(".");

        flock.platform.browser.majorVersionNumber = Number(dotIdx < 0 ?
            flock.platform.browser.version :
            flock.platform.browser.version.substring(0, dotIdx));
    }


    /***********************
     * Synths and Playback *
     ***********************/

    fluid.defaults("flock.audioSystem", {
        gradeNames: ["fluid.modelComponent"],

        channelRange: {
            min: 1,
            max: 32
        },

        outputBusRange: {
            min: 2,
            max: 1024
        },

        inputBusRange: {
            min: 1, // TODO: This constraint should be removed.
            max: 32
        },

        model: {
            rates: {
                audio: 44100,
                control: 689.0625,
                scheduled: 0,
                demand: 0,
                constant: 0
            },
            blockSize: 64,
            numBlocks: 16, // TODO: Move this and its transform into the web/output-manager.js
            chans: 2,
            numInputBuses: 2,
            numBuses: 8,
            bufferSize: "@expand:flock.audioSystem.defaultBufferSize()"
        },

        modelRelay: [
            {
                target: "rates.control",
                singleTransform: {
                    type: "fluid.transforms.binaryOp",
                    left: "{that}.model.rates.audio",
                    operator: "/",
                    right: "{that}.model.blockSize"
                }
            },
            {
                target: "numBlocks",
                singleTransform: {
                    type: "fluid.transforms.binaryOp",
                    left: "{that}.model.bufferSize",
                    operator: "/",
                    right: "{that}.model.blockSize"
                }
            },
            {
                target: "chans",
                singleTransform: {
                    type: "fluid.transforms.limitRange",
                    input: "{that}.model.chans",
                    min: "{that}.options.channelRange.min",
                    max: "{that}.options.channelRange.max"
                }
            },
            {
                target: "numInputBuses",
                singleTransform: {
                    type: "fluid.transforms.limitRange",
                    input: "{that}.model.numInputBuses",
                    min: "{that}.options.inputBusRange.min",
                    max: "{that}.options.inputBusRange.max"
                }
            },
            {
                target: "numBuses",
                singleTransform: {
                    type: "fluid.transforms.free",
                    func: "flock.audioSystem.clampNumBuses",
                    args: [
                        "{that}.model.numBuses",
                        "{that}.options.outputBusRange",
                        "{that}.model.chans",
                        "{that}.model.numInputBuses"
                    ]
                }
            }
        ]
    });

    flock.audioSystem.clampNumBuses = function (numBuses, outputBusRange, chans, numInputBuses) {
        var numInOut = numInputBuses + chans;
        numBuses = Math.max(numBuses, numInOut);
        numBuses = Math.max(numBuses, Math.max(chans, outputBusRange.min));
        numBuses = Math.min(numBuses, outputBusRange.max);

        return numBuses;
    };

    flock.audioSystem.defaultBufferSize = function () {
        return flock.platform.isMobile ? 8192 :
            flock.platform.browser.mozilla ? 2048 : 1024;
    };


    // TODO: Refactor how buses work so that they're clearly
    // delineated into types--input, output, and interconnect.
    // TODO: Get rid of the concept of buses altogether.
    fluid.defaults("flock.busManager", {
        gradeNames: ["fluid.modelComponent"],

        model: {
            nextAvailableBus: {
                input: 0,
                interconnect: 0
            }
        },

        members: {
            buses: {
                expander: {
                    funcName: "flock.enviro.createAudioBuffers",
                    args: ["{audioSystem}.model.numBuses", "{audioSystem}.model.blockSize"]
                }
            }
        },

        invokers: {
            acquireNextBus: {
                funcName: "flock.busManager.acquireNextBus",
                args: [
                    "{arguments}.0", // The type of bus, either "input" or "interconnect".
                    "{that}.buses",
                    "{that}.applier",
                    "{that}.model",
                    "{audioSystem}.model.chans",
                    "{audioSystem}.model.numInputBuses"
                ]
            },

            reset: {
                changePath: "nextAvailableBus",
                value: {
                    input: 0,
                    interconnect: 0
                }
            }
        },

        listeners: {
            "onDestroy.reset": "{that}.reset()"
        }
    });

    flock.busManager.acquireNextBus = function (type, buses, applier, m, chans, numInputBuses) {
        var busNum = m.nextAvailableBus[type];

        if (busNum === undefined) {
            flock.fail("An invalid bus type was specified when invoking " +
                "flock.busManager.acquireNextBus(). Type was: " + type);
            return;
        }

        // Input buses start immediately after the output buses.
        var offsetBusNum = busNum + chans,
            offsetBusMax = chans + numInputBuses;

        // Interconnect buses are after the input buses.
        if (type === "interconnect") {
            offsetBusNum += numInputBuses;
            offsetBusMax = buses.length;
        }

        if (offsetBusNum >= offsetBusMax) {
            flock.fail("Unable to aquire a bus. There are insufficient buses available. " +
                "Please use an existing bus or configure additional buses using the enviroment's " +
                "numBuses and numInputBuses parameters.");
            return;
        }

        applier.change("nextAvailableBus." + type, ++busNum);

        return offsetBusNum;
    };


    fluid.defaults("flock.outputManager", {
        gradeNames: ["fluid.modelComponent"],

        model: {
            audioSettings: "{audioSystem}.model"
        },

        invokers: {
            start: "{that}.events.onStart.fire()",
            stop: "{that}.events.onStop.fire()",
            reset: "{that}.events.onReset.fire"
        },

        events: {
            onStart: "{enviro}.events.onStart",
            onStop: "{enviro}.events.onStop",
            onReset: "{enviro}.events.onReset"
        }
    });

    fluid.defaults("flock.nodeListComponent", {
        gradeNames: "fluid.component",

        members: {
            nodeList: "@expand:flock.nodeList()"
        },

        invokers: {
            /**
             * Inserts a new node at the specified index.
             *
             * @param {flock.node} nodeToInsert the node to insert
             * @param {Number} index the index to insert it at
             * @return {Number} the index at which the new node was added
             */
            insert: "flock.nodeList.insert({that}.nodeList, {arguments}.0, {arguments}.1)",

            /**
             * Inserts a new node at the head of the node list.
             *
             * @param {flock.node} nodeToInsert the node to insert
             * @return {Number} the index at which the new node was added
             */
            head: "flock.nodeList.head({that}.nodeList, {arguments}.0)",

            /**
             * Inserts a new node at the head of the node list.
             *
             * @param {flock.node} nodeToInsert the node to insert
             * @return {Number} the index at which the new node was added
             */
            tail: "flock.nodeList.tail({that}.nodeList, {arguments}.0)",

            /**
             * Adds a node before another node.
             *
             * @param {flock.node} nodeToInsert the node to add
             * @param {flock.node} targetNode the node to insert the new one before
             * @return {Number} the index the new node was added at
             */
            before: "flock.nodeList.before({that}.nodeList, {arguments}.0, {arguments}.1)",

            /**
             * Adds a node after another node.
             *
             * @param {flock.node} nodeToInsert the node to add
             * @param {flock.node} targetNode the node to insert the new one after
             * @return {Number} the index the new node was added at
             */
            after: "flock.nodeList.after({that}.nodeList, {arguments}.0, {arguments}.1)",

            /**
             * Removes the specified node.
             *
             * @param {flock.node} nodeToRemove the node to remove
             * @return {Number} the index of the removed node
             */
            remove: "flock.nodeList.remove({that}.nodeList, {arguments}.0)",

            /**
             * Replaces a node with another, removing the old one and adding the new one.
             *
             * @param {flock.node} nodeToInsert the node to add
             * @param {flock.node} nodeToReplace the node to replace
             * @return {Number} the index the new node was added at
             */
            replace: "flock.nodeList.after({that}.nodeList, {arguments}.0, {arguments}.1)"
        }
    });

    // TODO: Factor out buffer logic into a separate component.
    fluid.defaults("flock.enviro", {
        gradeNames: [
            "fluid.modelComponent",
            "flock.nodeListComponent",
            "fluid.resolveRootSingle"
        ],

        singleRootType: "flock.enviro",

        isGlobalSingleton: true,

        members: {
            buffers: {},
            bufferSources: {}
        },

        components: {
            asyncScheduler: {
                type: "flock.scheduler.async"
            },

            audioSystem: {
                type: "flock.audioSystem"
            },

            busManager: {
                type: "flock.busManager"
            }
        },

        model: {
            isPlaying: false
        },

        invokers: {
            /**
             * Generates a block of samples by evaluating all registered nodes.
             */
            generate: {
                funcName: "flock.enviro.generate",
                args: ["{busManager}.buses", "{audioSystem}.model", "{that}.nodeList.nodes"]
            },

            /**
             * Starts generating samples from all synths.
             *
             * @param {Number} dur optional duration to play in seconds
             */
            start: "flock.enviro.start({that}.model, {that}.events.onStart.fire)",

            /**
             * Deprecated. Use start() instead.
             */
            play: "{that}.start",

            /**
             * Stops generating samples.
             */
            stop: "flock.enviro.stop({that}.model, {that}.events.onStop.fire)",


            /**
             * Fully resets the state of the environment.
             */
            reset: "{that}.events.onReset.fire()",

            /**
             * Registers a shared buffer.
             *
             * @param {BufferDesc} bufDesc the buffer description object to register
             */
            registerBuffer: "flock.enviro.registerBuffer({arguments}.0, {that}.buffers)",

            /**
             * Releases a shared buffer.
             *
             * @param {String|BufferDesc} bufDesc the buffer description (or string id) to release
             */
            releaseBuffer: "flock.enviro.releaseBuffer({arguments}.0, {that}.buffers)",

            /**
             * Saves a buffer to the user's computer.
             *
             * @param {String|BufferDesc} id the id of the buffer to save
             * @param {String} path the path to save the buffer to (if relevant)
             */
            saveBuffer: {
                funcName: "flock.enviro.saveBuffer",
                args: [
                    "{arguments}.0",
                    "{that}.buffers",
                    "{audioSystem}"
                ]
            }
        },

        events: {
            onStart: null,
            onPlay: "{that}.events.onStart", // Deprecated. Use onStart instead.
            onStop: null,
            onReset: null
        },

        listeners: {
            "onCreate.registerSingleton": {
                funcName: "flock.enviro.registerGlobalSingleton",
                args: ["{that}"]
            },

            "onStart.updatePlayState": {
                changePath: "isPlaying",
                value: true
            },

            "onStop.updatePlayState": {
                changePath: "isPlaying",
                value: false
            },

            "onReset.stop": "{that}.stop()",

            "onReset.clearScheduler": {
                priority: "after:stop",
                func: "{asyncScheduler}.clearAll"
            },

            "onReset.clearAllNodes": {
                priority: "after:clearScheduler",
                func: "flock.nodeList.clearAll",
                args: ["{that}.nodeList"]
            },

            "onReset.resetBusManager": {
                priority: "after:clearAllNodes",
                func: "{busManager}.reset"
            },

            "onReset.clearBuffers": {
                priority: "after:resetBusManager",
                funcName: "fluid.clear",
                args: ["{that}.buffers"]
            }
        }
    });

    flock.enviro.registerGlobalSingleton = function (that) {
        if (that.options.isGlobalSingleton) {
            // flock.enviro.shared is deprecated. Use "flock.environment"
            // or an IoC reference to {flock.enviro} instead
            flock.environment = flock.enviro.shared = that;
        }
    };

    flock.enviro.registerBuffer = function (bufDesc, buffers) {
        if (bufDesc.id) {
            buffers[bufDesc.id] = bufDesc;
        }
    };

    flock.enviro.releaseBuffer = function (bufDesc, buffers) {
        if (!bufDesc) {
            return;
        }

        var id = typeof bufDesc === "string" ? bufDesc : bufDesc.id;
        delete buffers[id];
    };

    flock.enviro.saveBuffer = function (o, buffers, audioSystem) {
        if (typeof o === "string") {
            o = {
                buffer: o
            };
        }

        if (typeof o.buffer === "string") {
            var id = o.buffer;
            o.buffer = buffers[id];
            o.buffer.id = id;
        }

        o.type = o.type || "wav";
        o.path = o.path || o.buffer.id + "." + o.type;
        o.format = o.format || "int16";

        return audioSystem.bufferWriter.save(o, o.buffer);
    };

    flock.enviro.generate = function (buses, audioSettings, nodes) {
        flock.evaluate.clearBuses(buses,
            audioSettings.numBuses, audioSettings.blockSize);
        flock.evaluate.synths(nodes);
    };

    flock.enviro.start = function (model, onStart) {
        if (!model.isPlaying) {
            onStart();
        }
    };

    flock.enviro.stop = function (model, onStop) {
        if (model.isPlaying) {
            onStop();
        }
    };

    flock.enviro.createAudioBuffers = function (numBufs, blockSize) {
        var bufs = [],
            i;
        for (i = 0; i < numBufs; i++) {
            bufs[i] = new Float32Array(blockSize);
        }
        return bufs;
    };


    fluid.defaults("flock.autoEnviro", {
        gradeNames: ["fluid.component"],

        members: {
            enviro: "@expand:flock.autoEnviro.initEnvironment()"
        }
    });

    flock.autoEnviro.initEnvironment = function () {
        // TODO: The last vestige of globalism! Remove reference to shared environment.
        return !flock.environment ? flock.init() : flock.environment;
    };


    /**
     * An environment grade that is configured to always output
     * silence using a Web Audio GainNode. This is useful for unit testing,
     * where failures could produce painful or unexpected output.
     */
    fluid.defaults("flock.silentEnviro", {
        gradeNames: "flock.enviro",

        listeners: {
            "onCreate.insertGainNode": {
                funcName: "flock.silentEnviro.insertOutputGainNode",
                args: "{that}"
            }
        }
    });

    flock.silentEnviro.insertOutputGainNode = function (that) {
        if (that.audioSystem.nativeNodeManager) {
            that.audioSystem.nativeNodeManager.createOutputNode({
                node: "Gain",
                params: {
                    gain: 0
                }
            });
        }
    };

    fluid.defaults("flock.node", {
        gradeNames: ["flock.autoEnviro", "fluid.modelComponent"],

        addToEnvironment: "tail",

        model: {},

        members: {
            generatorFunc: "@expand:fluid.getGlobalValue({that}.options.invokers.generate.funcName)"
        },

        components: {
            enviro: "{flock.enviro}"
        },

        invokers: {
            /**
             * Plays the node. This is a convenience method that will add the
             * node to the tail of the environment's node graph and then play
             * the environmnent.
             *
             * @param {Number} dur optional duration to play this synth in seconds
             */
            play: {
                funcName: "flock.node.play",
                args: ["{that}", "{that}.enviro", "{that}.addToEnvironment"]
            },

            /**
             * Stops the synth if it is currently playing.
             * This is a convenience method that will remove the synth from the environment's node graph.
             */
            pause: "{that}.removeFromEnvironment()",

            /**
             * Adds the node to its environment's list of active nodes.
             *
             * @param {String || Boolean || Number} position the place to insert the node at;
             *     if undefined, the node's addToEnvironment option will be used.
             */
            addToEnvironment: {
                funcName: "flock.node.addToEnvironment",
                args: ["{that}", "{arguments}.0", "{that}.enviro.nodeList"]
            },

            /**
             * Removes the node from its environment's list of active nodes.
             */
            removeFromEnvironment: {
                funcName: "flock.node.removeFromEnvironment",
                args: ["{that}", "{that}.enviro.nodeList"]
            },

            /**
             * Returns a boolean describing if this node is currently
             * active in its environment's list of nodes
             * (i.e. if it is currently generating samples).
             */
            isPlaying: {
                funcName: "flock.nodeList.isNodeActive",
                args:["{that}.enviro.nodeList", "{that}"]
            },

            generate: {
                funcName: "fluid.identity"
            }
        },

        listeners: {
            "onCreate.addToEnvironment": {
                func: "{that}.addToEnvironment",
                args: ["{that}.options.addToEnvironment"]
            },

            "onDestroy.removeFromEnvironment": {
                func: "{that}.removeFromEnvironment"
            }
        }
    });

    flock.node.addToEnvironment = function (node, position, nodeList) {
        if (position === undefined) {
            position = node.options.addToEnvironment;
        }

        // Add this node to the tail of the synthesis environment if appropriate.
        if (position === undefined || position === null || position === false) {
            return;
        }

        var type = typeof (position);
        if (type === "string" && position === "head" || position === "tail") {
            flock.nodeList[position](nodeList, node);
        } else if (type === "number") {
            flock.nodeList.insert(nodeList, node, position);
        } else {
            flock.nodeList.tail(nodeList, node);
        }
    };

    flock.node.removeFromEnvironment = function (node, nodeList) {
        flock.nodeList.remove(nodeList, node);
    };

    flock.node.play = function (node, enviro, addToEnviroFn) {
        if (enviro.nodeList.nodes.indexOf(node) === -1) {
            var position = node.options.addToEnvironment || "tail";
            addToEnviroFn(position);
        }

        // TODO: This behaviour is confusing
        // since calling mySynth.play() will cause
        // all synths in the environment to be played.
        // This functionality should be removed.
        if (!enviro.model.isPlaying) {
            enviro.play();
        }
    };


    fluid.defaults("flock.noteTarget", {
        gradeNames: "fluid.component",

        noteChanges: {
            on: {
                "env.gate": 1
            },

            off: {
                "env.gate": 0
            }
        },

        invokers: {
            set: {
                funcName: "fluid.notImplemented"
            },

            noteOn: {
                func: "{that}.events.noteOn.fire"
            },

            noteOff: {
                func: "{that}.events.noteOff.fire"
            },

            noteChange: {
                funcName: "flock.noteTarget.change",
                args: [
                    "{that}",
                    "{arguments}.0", // The type of note; either "on" or "off"
                    "{arguments}.1"  // The change to apply for this note.
                ]
            }
        },

        events: {
            noteOn: null,
            noteOff: null
        },

        listeners: {
            "noteOn.handleChange": [
                "{that}.noteChange(on, {arguments}.0)"
            ],

            "noteOff.handleChange": [
                "{that}.noteChange(off, {arguments}.0)"
            ]
        }
    });

    flock.noteTarget.change = function (that, type, changeSpec) {
        var baseChange = that.options.noteChanges[type];
        var mergedChange = $.extend({}, baseChange, changeSpec);
        that.set(mergedChange);
    };

    /*******************************
     * Error Handling Conveniences *
     *******************************/

    flock.bufferDesc = function () {
        throw new Error("flock.bufferDesc is not defined. Did you forget to include the buffers.js file?");
    };
}());

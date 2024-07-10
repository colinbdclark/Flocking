/*
 * Flocking AudioWorklet Host
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.registerNamespace("flock.audioWorklet");

fluid.defaults("flock.audioWorklet.host", {
    gradeNames: "fluid.modelComponent",

    members: {
        ugenLists: []
    },

    model: {
        graphs: {
            // unitGeneratorGraph ID: graphDef
        }
    },

    components: {
        audioEnvironment: {
            type: "flock.audioEnvironment"
        }
    },

    dynamicComponents: {
        graphs: {
            type: "flock.unitGeneratorGraph",
            sources: "{that}.model.graphs",
            options: {
                graphDef: "{source}",

                components: {
                    audioEnvironment: "{host}.audioEnvironment"
                },

                listeners: {
                    "afterUGensCreated.addUGenListToHost": {
                        funcName: "flock.audioWorklet.host.addUGenListToHost",
                        args: ["{host}", "{arguments}.0"]
                    },

                    "onDestroy.removeUGenListFromHost": {
                        funcName: "flock.audioWorklet.host.removeUGenListFromHost",
                        args: ["{host}", "{that}.ugenList"]
                    }
                }
            }
        }
    },

    events: {
        onMessage: null
    },

    listeners: {
        "onMessage.updateModel": {
            funcName: "flock.audioWorklet.host.applyMessage",
            args: ["{that}.applier", "{arguments}.0.data"]
        }
    }
});

flock.audioWorklet.host.addUGenListToHost = function (host, ugenList) {
    host.ugenLists.push(ugenList);
};

flock.audioWorklet.host.removeUGenListFromHost = function (host,
    ugenList) {
    let idx = host.ugenLists.indexof(ugenList);
    if (idx > -1) {
        host.ugenLists.splice(idx, 1);
    }
};

flock.audioWorklet.host.applyMessage = function (applier, messageData) {
    applier.change("", messageData);
};

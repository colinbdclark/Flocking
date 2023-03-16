/*
 * Flocking Unit Graph
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.defaults("flock.unitGeneratorGraph", {
    gradeNames: "fluid.component",

    rate: flock.rates.AUDIO,

    graphDef: {},

    members: {
        ugenList: {
            expander: {
                funcName: "flock.ugenNodeList"
            }
        }
    },

    components: {
        audioEnvironment: {
            type: "flock.audioEnvironment"
        }
    },

    events: {
        onUGenCreated: null,
        afterUGensCreated: null
    },

    listeners: {
        "onCreate.instantiateUGens": {
            funcName: "flock.unitGeneratorGraph.instantiateUGens",
            args: [
                "{that}.options.graphDef",
                "{that}.options.rate",
                "{that}.events.onUGenCreated.fire",
                "{audioEnvironment}.buses",
                "{audioEnvironment}.buffers",
                "{audioEnvironment}.options.audioSettings"
            ]
        },

        "onCreate.fireAfterUGensCreated": {
            priority: "after:instantiateUGens",
            func: "{that}.events.afterUGensCreated.fire",
            args: ["{that}.ugenList"]
        },

        "onUGenCreated.insertIntoUGenList": {
            funcName: "flock.nodeList.tail",
            args: ["{that}.ugenList", "{arguments}.0"]
        }
    }
});

flock.unitGeneratorGraph.instantiateUGens = function (graphDef,
    rate, onUGenCreated, buses, buffers, audioSettings) {
    if (!graphDef) {
        fluid.log(fluid.logLevel.IMPORTANT,
            "Warning: An empy graphDef was found while instantiating a unit generator tree." +
            "Did you forget to include a 'graphDef' option for your unitGeneratorGraph?");
    }

    // Parse the graphDef into a graph of unit generators.
    return flock.interpret.graphDef(graphDef, {
        rate: rate,
        // If the graph is running at either demand or schedule rate,
        // override the rate of all non-constant ugens.
        overrideRate: rate === flock.rates.SCHEDULED ||
            rate === flock.rates.DEMAND,
        // TODO: Refactor the interpreter into a component that
        // fires an event instead of this visitor pattern.
        visitors: [onUGenCreated],
        buffers: buffers,
        buses: buses,
        audioSettings: audioSettings
    });
};

/*
 * Flocking Value Synth
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2013-2018, Colin Clark
 * Released under the terms of the MIT license.
 */

/*global require, flock*/

var fluid = fluid || require("infusion"),
    flock = fluid.registerNamespace("flock");

fluid.defaults("flock.synth.value", {
    gradeNames: ["flock.synth"],

    rate: "demand",
    addToEnvironment: false,

    invokers: {
        generate: {
            funcName: "flock.evaluate.synthValue"
        }
    }
});

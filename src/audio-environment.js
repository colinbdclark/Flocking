/*
 * Flocking Audio Environment
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2023, Colin Clark
 * Released under the terms of the MIT license.
 */

/**
 * A component that provides the environmental needs for
 * all unit generators.
 *
 * Typical use of this component is within an AudioWorkletProcessor.
 */
fluid.defaults("flock.audioEnvironment", {
    gradeNames: "fluid.component",

    members: {
        buses: [],
        buffers: [],
    },

    audioSettings: {
        rates: {
            audio: 48000,
            control: 48000 / 64,
            scheduled: 0,
            demand: 0,
            constant: 0
        },
        blockSize: 64,
        chans: 2,
        numInputBuses: 2,
        numBuses: 8
    }
});

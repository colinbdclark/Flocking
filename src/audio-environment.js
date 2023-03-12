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
        buses: {
            expander: {
                funcName: "flock.generateBuffers",
                args: [
                    "{that}.options.audioSettings.numBuses",
                    "{that}.options.audioSettings.blockSize"
                ]
            }
        },

        buffers: [],
    },

    audioSettings: {
        rates: {
            // All rates are in samples per second.
            audio: 48000,
            control: 48000 / 128,
            scheduled: 0,
            demand: 0,
            constant: 0
        },
        blockSize: 128,   // Number of samples in an audio processing block.
        numBlocks: 1,     // Number of blocks per Web Audio render quantum.
        numOutputs: 1,
        chans: 2,         // Number of output channels.
                          // TODO: Rename this to numOutputChannels.
        numInputBuses: 2, // TODO: Rename this to numInputs.
        numBuses: 8       // Total number of global buses
                          //  (input, output, and interconnect).
    }
});

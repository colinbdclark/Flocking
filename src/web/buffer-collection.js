/*
 * Flocking Buffer Hub
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.defaults("flock.bufferCollection", {
    gradeNames: "fluid.modelComponent",

    model: {
        buffers: {}
    },

    dynamicComponents: {
        type: "flock.webAudioBufferLoader",
        sources: "{that}.model.buffers",
        options: {
            model: {
                url: "{source}"
            },

            modelListeners: {
                isLoaded: {
                    namespace: "postBufferToWorklet"
                }
            }
        }
    }
});

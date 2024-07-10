/*
 * Flocking Web Audio Buffer Loader
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.defaults("flock.webAudioBufferLoader", {
    gradeNames: "fluid.modelComponent",

    members: {
        audioContext: undefined,
        decodedAudio: undefined
    },

    model: {
        url: undefined,
        isLoaded: false
    },

    modelListeners: {
        url: {
            namespace: "fetchURL",
            funcName: "flock.webAudioBufferLoader.fetchURL",
            args: ["{that}", "{change}"]
        }
    },

    events: {
        onError: null,
        onBufferLoaded: null,
        afterBufferLoaded: null,
        afterBufferDecoded: null
    },

    listeners: {
        "onBufferLoaded.readResponse": {
            funcName: "flock.webAudioBufferLoader.readResponse",
            args: ["{that}", "{arguments}.0"]
        },

        "afterBufferLoaded.decode": {
            funcName: "flock.webAudioBufferLoaded.decode",
            args: ["{that}", "{arguments}.0"]
        },

        "afterBufferDecoded.updateLoadStatus": {
            change: "isLoaded",
            value: true
        }
    }
});

flock.webAudioBufferLoader.fetchURL = function (that, url) {
    that.applier.change("isLoaded", false);

    let request = new Request(url);
    fetch(request).then(that.events.onBufferLoaded.fire);
};

flock.webAudioBufferLoader.readResponse = function (that, response) {
    if (!response.ok) {
        that.events.onError.fire(response.status);
    } else {
        let rawBuffer = response.arrayBuffer();
        that.events.afterBufferLoaded.fire(rawBuffer);
    }
};

flock.webAudioBufferLoaded.decode = function (that, rawBuffer) {
    that.audioContext.decodeAudioData(rawBuffer).then(function (audioBuffer) {
        that.decodedAudio = audioBuffer;
        that.events.afterBufferDecoded.fire(audioBuffer);
    });
};

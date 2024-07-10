/*
 * Flocking AudioWorkletProcessor
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.registerNamespace("flock.audioWorklet");

flock.audioWorklet.outputSilence = function (outputs) {
    for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
        let output = outputs[outIdx];
        let numChannels = output.length;

        for (let chanIdx = 0; chanIdx < numChannels; chanIdx++) {
            flock.clearBuffer(output[chanIdx]);
        }
    }
};

class FlockingAudioWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.host = flock.audioWorklet.host();
        this.port.onmessage = this.host.events.onMessage.fire;
    }

    process (inputs, outputs, parameters) {
        let audioEnvironment = this.host.audioEnvironment;
        let ugenLists = this.host.ugenLists;
        let audioSettings = audioEnvironment.options.audioSettings;
        let blockSize = audioSettings.blockSize;
        let numBlocks = audioSettings.numBlocks;
        let numBuses = audioSettings.numBuses;
        let buses = audioEnvironment.buses;

        // If there are no unit generators, write silence and bail.
        if (!ugenLists || ugenLists.length < 1) {
            flock.audioWorklet.outputSilence(outputs);
            return true;
        }

        for (let outIdx = 0; outIdx < outputs.length; outIdx++) {
            let output = outputs[outIdx];
            let numChannels = output.length;

            for (let blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
                // TODO: Read all inputs into the appropriate buses.
                // This will likely require the return of the sus BusManager.

                flock.evaluate.clearBuses(buses, numBuses, blockSize);
                flock.evaluate.ugenLists(ugenLists);

                let offset = blockIdx * audioSettings.blockSize;
                // Output each channel.
                for (let chanIdx = 0; chanIdx < numChannels; chanIdx++) {
                    let bus = buses[chanIdx],
                        channel = output[chanIdx];

                    // And output each sample.
                    for (let sampIdx = 0; sampIdx < blockSize; sampIdx++) {
                        channel[sampIdx + offset] = bus[sampIdx];
                    }
                }
            }
        }

        return true;
    }
}

registerProcessor("FlockingProcessor",
    FlockingAudioWorkletProcessor);

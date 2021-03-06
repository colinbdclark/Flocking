// Plays back a sound file while the user holds down the mouse button.
// If the user lets go of the mouse and clicks it again, playback will resume at its previous location.
// Uses a phasor and the bufferPhaseStep unit generator to play back the sound at its normal rate.

flock.synth({
    synthDef: {
        ugen: "flock.ugen.readBuffer",
        buffer: {
            id: "chord",
            url: "../shared/audio/hillier-first-chord.wav"
        },
        phase: {
            rate: "audio",
            ugen: "flock.ugen.phasor",
            step: {
                ugen: "flock.ugen.mouse.click",
                mul: {
                    ugen: "flock.ugen.bufferPhaseStep",
                    buffer: "chord"
                }
            }
        }
    }
});

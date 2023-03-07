/*!
* Flocking Oscillator Unit Generator Unit Tests
* https://github.com/lichen-community-systems/flocking
*
* Copyright 2011-2023, Colin Clark
* Released under the terms of the MIT license.

*/

var QUnit = fluid.registerNamespace("QUnit");
fluid.registerNamespace("flock.test");

QUnit.module("flock.ugen.osc() tests");

flock.test.makeOsc = function (freq, table, bufferSize, sampleRate) {
    return flock.interpret.ugenForDef({
        ugen: "flock.ugen.osc",
        inputs: {
            freq: {
                ugen: "flock.ugen.value",
                value: freq
            },
            table: table
        },
        options: {
            sampleRate: sampleRate
        }
    });
};

flock.test.makePaddedBuffer = function (values, length) {
    var buf = new Float32Array(length),
        i;
    for (i = 0; i < values.length; i++) {
        buf[i] = values[i];
    }
    return buf;
};

flock.test.assertOscOutputEquals = function (testSpec, expected, msg) {
    var osc = flock.test.makeOsc(testSpec.freq,
        testSpec.table,
        testSpec.numSamps,
        testSpec.sampleRate);
    expected = flock.test.makePaddedBuffer(expected, osc.output.length);
    osc.gen(testSpec.numSamps);
    QUnit.deepEqual(osc.output, expected, msg);
};

QUnit.test("flock.ugen.osc() empty table", function () {
    flock.test.assertOscOutputEquals({
        freq: 440,
        sampleRate: 44100,
        numSamps: 64,
        table: []
    }, new Float32Array(64), "With an empty table input, osc should output silence.");
});

QUnit.test("flock.ugen.osc() simple table lookup", function () {
    var table = new Float32Array([1, 2, 3, 4]);

    flock.test.makeOsc({
        freq: 1,
        sampleRate: 1,
        numSamps: 1,
        table: table
    }, new Float32Array([1]),
    "At a frequency of 1 and sampling rate of 1, we should only get the first value in the table.");

    flock.test.assertOscOutputEquals({
        freq: 1,
        sampleRate: 4,
        numSamps: 4,
        table: table
    },
    table,
    "At a frequency of 1 and sampling rate of 4, requesting 4 samples should return the whole table.");

    flock.test.assertOscOutputEquals({
        freq: 1,
        sampleRate: 4,
        numSamps: 8,
        table: table
    },
    new Float32Array([1, 2, 3, 4, 1, 2, 3, 4]),
    "At a frequency of 1 and sampling rate of 4, requesting 8 samples should return the whole table twice.");

    flock.test.assertOscOutputEquals({
        freq: 2,
        sampleRate: 4,
        numSamps: 4,
        table: table
    },
    new Float32Array([1, 3, 1, 3]),
    "At a frequency of 2 and sampling rate of 4, requesting 4 samples should return the first and third samples.");

    flock.test.assertOscOutputEquals({
        freq: 2,
        sampleRate: 4,
        numSamps: 16,
        table: table
    },
    new Float32Array([1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3]),
    "At a frequency of 2 and sampling rate of 4, 16 samples should still consist of the first and third samples.");
});


QUnit.module("flock.ugen.osc() tests: specific wave forms");


flock.test.createAndGenerateUGen = function (ugenType, blockSize) {
    var ugenDef = {
        ugen: ugenType,
        rate: flock.rates.AUDIO,
        inputs: {
            freq: 2,
            mul: 0.75
        },
        options: {
            sampleRate: 44100
        }
    };

    ugenDef.ugen = ugenType;
    var ug = flock.interpret.ugenForDef(ugenDef);
    ug.output = new Float32Array(blockSize);
    ug.gen(blockSize);
    return ug;
};

flock.test.testOsc = function (ugenType, otherTests) {
    QUnit.test(ugenType, function () {
        var ug = flock.test.createAndGenerateUGen(ugenType, 44100);
        flock.test.unbrokenAudioSignalInRange(ug.output, -0.75, 0.75);
        if (otherTests) {
            otherTests(ug);
        }
    });
};

flock.test.testContinuousWaveformOsc = function (ugenType, otherTests) {
    flock.test.testOsc(ugenType, function (ug) {
        flock.test.continuousArray(ug.output, 0.01,
            "The ugen should produce a continuously changing signal.");
        if (otherTests) {
            otherTests(ug);
        }
    });
};

flock.test.testSineishWaveformOsc = function (ugenType) {
    flock.test.testContinuousWaveformOsc(ugenType, function (sine) {
        flock.test.sineishArray(sine.output, 0.75, true,
            "The " + ugenType + " ugen should continuously rise and fall between 0.75/-0.75.");
    });
};

flock.test.testDroppingWaveformOsc = function (ugenType) {
    flock.test.testOsc(ugenType);
};

flock.test.testSineishWaveformOsc("flock.ugen.sinOsc");
flock.test.testContinuousWaveformOsc("flock.ugen.triOsc");
flock.test.testContinuousWaveformOsc("flock.ugen.squareOsc");
flock.test.testContinuousWaveformOsc("flock.ugen.sawOsc");

flock.test.testSineishWaveformOsc("flock.ugen.sin");
flock.test.testDroppingWaveformOsc("flock.ugen.lfPulse");
flock.test.testDroppingWaveformOsc("flock.ugen.lfSaw");


QUnit.module("flock.ugen.impulse() tests");

flock.test.createAndGenerateOneSecondImpulse = function (freq, phase,
    sampleRate) {
    var impulseDef = {
        ugen: "flock.ugen.impulse",
        freq: freq,
        phase: phase,
        options: {
            sampleRate: sampleRate
        }
    };
    var imp = flock.interpret.ugenForDef(impulseDef);

    imp.output = new Float32Array(sampleRate);
    imp.gen(sampleRate);

    return imp.output;
};

flock.test.testImpulses = function (buffer, impulseLocations, msg) {
    var i;

    flock.test.valueCount(buffer, 1.0, impulseLocations.length, msg + " should contain the expected number of impulses.");
    flock.test.arrayContainsOnlyValues(buffer, [0.0, 1.0], msg + " should only contain zeros and ones.");

    for (i = 0; i < buffer.length; i++) {
        if (impulseLocations.indexOf(i) !== -1) {
            QUnit.equal(buffer[i], 1.0, msg + ", the sample at index " + i + " should contain an impulse.");
        } else {
            if (buffer[i] !== 0.0) {
                QUnit.equal(buffer[i], 0.0, msg + ", the sample at index " + i + " should be silent.");
            }
        }
    }
};

QUnit.test("flock.ugen.impulse()", function () {
    let sampleRate = 44100;

    // TODO: Why are we always one sample late?
    var actual = flock.test.createAndGenerateOneSecondImpulse(1.0, 0.0,
        sampleRate);
    flock.test.testImpulses(actual, [],
        "With a frequency of 1 Hz and phase of 0.0");

    actual = flock.test.createAndGenerateOneSecondImpulse(1.0, 1.0,
        sampleRate);
    flock.test.testImpulses(actual, [0],
        "With a frequency of 1 Hz and phase of 1.0");

    actual = flock.test.createAndGenerateOneSecondImpulse(1.0, 0.5,
        sampleRate);
    flock.test.testImpulses(actual, [sampleRate / 2],
        "With a frequency of 1 Hz and phase of 0.5");

    actual = flock.test.createAndGenerateOneSecondImpulse(1.0, 0.01,
        sampleRate);
    flock.test.testImpulses(actual, [sampleRate - (sampleRate / 100) + 1],
        "With a frequency of 1 Hz and phase of 0.01");

    actual = flock.test.createAndGenerateOneSecondImpulse(2.0, 0.0,
        sampleRate);
    flock.test.testImpulses(actual, [sampleRate / 2],
        "With a frequency of 2 Hz and phase of 0");

    actual = flock.test.createAndGenerateOneSecondImpulse(2.0, 0.5,
        sampleRate);
    flock.test.testImpulses(actual,
        [sampleRate / 4, sampleRate - sampleRate / 4],
        "With a frequency of 2 Hz and phase of 0.5");

    actual = flock.test.createAndGenerateOneSecondImpulse(2.0, 1.0,
        sampleRate);
    flock.test.testImpulses(actual, [0, 44100 / 2],
        "With a frequency of 2 Hz and phase of 1");
});

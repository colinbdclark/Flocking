/*
 * Flocking Intepreter Tests
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */
QUnit.module("flock.interpret.ugenForDef");

QUnit.test("Special input handling", function () {
    var def = {
        ugen: "flock.test.ugen.mockWithInputs",
        inputs: {
            table: [0.0, 0.5, 1.0, 0.5, 0.0, -0.5, -1.0, -0.5, 0.0],
            freq: {
                ugen: "flock.ugen.value",
                inputs: {
                    value: 299
                }
            },
            buffer: {
                url: "https://a.url"
            }
        }
    };

    var actual = flock.interpret.ugenForDef(def);
    QUnit.equal(actual.inputs.freq.inputs.value, 299,
        "A value input should not be expanded.");
    jqUnit.assertDeepEq("A table input should not be expanded.",
        def.inputs.table, actual.inputs.table);
    jqUnit.assertDeepEq("A buffer def input should not be expanded.",
        def.inputs.buffer, actual.inputs.buffer);
});

QUnit.test("Rate expansion", function () {
    var ugenDef = {
        ugen: "flock.test.ugen.mockWithInputs",
        rate: "kr",
        freq: {
            ugen: "flock.test.ugen.mockWithInputs",
            rate: flock.rates.AUDIO,
            freq: 440
        },
        mul: {
            ugen: "flock.test.ugen.mock",
            rate: "ar"
        },
        add: {
            ugen: "flock.test.ugen.mock",
            rate: "cr"
        }
    };

    var parsed = flock.interpret.ugenForDef(ugenDef);
    QUnit.equal(parsed.rate, flock.rates.CONTROL,
        "A compressed control rate should be expanded to its full value.");
    QUnit.equal(parsed.inputs.freq.rate, flock.rates.AUDIO,
        "An already-expanded audio rate should not be mangled.");
    QUnit.equal(parsed.inputs.mul.rate, flock.rates.AUDIO,
        "A compressed audio rate should be expanded to its full value.");
    QUnit.equal(parsed.inputs.add.rate, flock.rates.CONSTANT,
        "A compressed constant rate should be expanded to its full value.");
});

QUnit.test("Options merging", function () {
    var sinOscDef = {
        ugen: "flock.test.ugen.mockWithInputs",
        phase: 1.0
    };

    var ugen = flock.interpret.ugenForDef(sinOscDef);
    QUnit.equal(ugen.rate, flock.rates.AUDIO,
        "The rate option should be supplied by the ugen's defaults.");
    QUnit.equal(ugen.inputs.freq.model.value, 440,
        "The frequency input should be supplied by the ugen's defaults.");
    QUnit.equal(ugen.inputs.phase.model.value, 1.0,
        "The ugen's default phase input should be overridden by the ugenDef.");
});

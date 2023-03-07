/*
 * Flocking Path Tests
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

var defaultFailMode = flock.debug.failHard;

QUnit.module("Path utilities", {
    teardown: function () {
        flock.debug.failHard = defaultFailMode;
    }
});

QUnit.test("flock.set()", function () {
    var root = {
        cat: "meow",
        dog: {
            sheltie: "bark"
        }
    };

    var tests = [
        {
            path: "cat",
            value: "rreow",
            msg: "Single-segment path."
        },
        {
            path: "dog.sheltie",
            value: "roof",
            msg: "Multi-segment path."
        },
        {
            path: "dog.sheltie",
            value: {
                fur: {
                    primary: "sable",
                    secondary: "white"
                }
            },
            msg: "Multi-segment path, object value."
        },
        {
            path: "dog.claws.count",
            value: 25,
            msg: "Path with non-existent middle segment should cause the container to be created."
        },
        {
            path: "dog.sheltie",
            value: undefined,
            msg: "Valid path, undefined value."
        },
        {
            path: "dog.sheltie",
            value: null,
            msg: "Valid path, null value."
        }
    ];

    fluid.each(tests, function (spec) {
        flock.set(root, spec.path, spec.value);
        QUnit.equal(flock.get(root, spec.path), spec.expected || spec.value, spec.msg);
    });

    // Error cases
    try {
        flock.set(root, "cat.claws.count", 25);
        QUnit.ok(false);
    } catch (e) {
        QUnit.ok(e.message.indexOf("cat") !== -1);
    }
});

var assertNoErrorThrown = function (fn) {
    try {
        fn();
        QUnit.ok(true, "A hard error shouldn't be thrown.");
    } catch (e) {
        QUnit.ok(false, "A hard error shouldn't be thrown.");
    }
};

var assertErrorThrown = function (fn) {
    try {
        fn();
        QUnit.ok(false, "A hard error should be thrown.");
    } catch (e) {
        QUnit.ok(true, "A hard error should be thrown.");
    }
};

QUnit.test("Getting and setting invalid paths with soft failure enabled", function () {
    flock.debug.failHard = false;

    assertNoErrorThrown(function () {
        flock.get({}, "cow.moo");
    });

    assertNoErrorThrown(function () {
        flock.set({}, "cow.moo", true);
    });
});

QUnit.test("Getting and setting invalid paths with hard failure enabled", function () {
    flock.debug.failHard = true;

    assertErrorThrown(function () {
        flock.get({}, "cow.moo");
    });

    assertErrorThrown(function () {
        flock.set({}, "cow.moo", true);
    });
});

var testInputPathExpansion = function (testSpecs) {
    fluid.each(testSpecs, function (spec) {
        var actual = flock.input.pathExpander(spec.path);
        QUnit.equal(actual, spec.expected, spec.msg,
            "Setting to a non-container type should cause an error to be thrown.");
    });
};

QUnit.test("flock.synth.inputPathExpander()", function () {
    testInputPathExpansion([
        {
            path: "cat.dog",
            expected: "cat.inputs.dog",
            msg: "With a single dot, the path should have been expanded as an input path."
        },
        {
            path: "cat.dog.hamster",
            expected: "cat.inputs.dog.inputs.hamster",
            msg: "With multiple dots, the path should have been expanded as an input path."
        },
        {
            path: "cat.dog.1.hamster",
            expected: "cat.inputs.dog.1.inputs.hamster",
            msg: "With a single-digit number, all segments except immediately preceding the number path should have been expanded."
        },
        {
            path: "cat.dog.27.hamster",
            expected: "cat.inputs.dog.27.inputs.hamster",
            msg: "With a multi-digit number, all segments except immediately preceding the number path should have been expanded."
        },
        {
            path: "cat27.dog.0.fish42",
            expected: "cat27.inputs.dog.0.inputs.fish42",
            msg: "Path segments with numbers should be handled correctly."
        },
        {
            path: "cat.dog.model.value",
            expected: "cat.inputs.dog.model.value",
            msg: "The special 'model' keyword should not be expanded"
        },
        {
            path: "cat.dog.options.isAwesome",
            expected: "cat.inputs.dog.options.isAwesome",
            msg: "The special 'options' keyword should not be expanded"
        },
        {
            path: "cat.dog.options.model",
            expected: "cat.inputs.dog.options.model",
            msg: "Reference to options.model should not be expanded"
        },
        {
            path: "cat.dog.Options.Model",
            expected: "cat.inputs.dog.inputs.Options.inputs.Model",
            msg: "The match must be case sensitive"
        },
        {
            path: "fish.modelizedCat.dogoptions.hamster.model.options.model",
            expected: "fish.inputs.modelizedCat.inputs.dogoptions.inputs.hamster.model.options.model",
            msg: "Partial matches on the words 'options' or 'model' should be ignored."
        },
        {
            path: "dog.optionsCat.modelDog.value",
            expected: "dog.inputs.optionsCat.inputs.modelDog.inputs.value",
            msg: "Partial matches on the words 'options' or 'model' should be ignored."
        },
        {
            path: "sine.freq.model",
            expected: "sine.inputs.freq.model",
            msg: "Special segment at the end should be matched"
        },
        {
            path: "sine.freq.options",
            expected: "sine.inputs.freq.options",
            msg: "Special segment at the end should be matched"
        },
        {
            path: "model.freq",
            expected: "model.inputs.freq",
            msg: "Special segment at the beginning should not be matched"
        }
    ]);
});

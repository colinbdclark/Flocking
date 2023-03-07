/*
 * Flocking Core Tests
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

QUnit.test("flock.randomAudioValue", function () {
    var buf = new Float32Array(100000);
    flock.fillBuffer(buf, flock.randomAudioValue);
    flock.test.signalInRange(buf, -1.0, 1.0);
});

QUnit.test("flock.randomValue", function () {
    var buf = new Float32Array(100000);
    flock.fillBuffer(buf, function () {
        return flock.randomValue(-12, 2);
    });
    flock.test.signalInRange(buf, -12.0, 2.0);
});

QUnit.test("flock.interpretMidiString", function () {
    QUnit.expect(8);

    function runMidiStringTest(testSpec) {
        var actual = flock.interpretMidiString(testSpec.note);
        QUnit.deepEqual(actual, testSpec.expected, testSpec.name);
    }

    var testSpecs = [
        {
            name: "No accidental, c0",
            note: "c0",
            expected: 0
        },
        {
            name: "No accidental",
            note: "e9",
            expected: 112
        },
        {
            name: "Sharp lower case",
            note: "g#6",
            expected: 80
        },
        {
            name: "Sharp upper case",
            note: "F#6",
            expected: 78
        },
        {
            name: "Flat",
            note: "Bb8",
            expected: 106
        },
        {
            name: "Two digits",
            note: "G10",
            expected: 127
        },
        {
            name: "Two digits with accidental",
            note: "C#10",
            expected: 121
        },
        {
            name: "Invalid note name",
            note: "cat27",
            expected: NaN
        }
        // What about out of range octaves? Should it work?
    ];

    fluid.each(testSpecs, runMidiStringTest);
});

QUnit.test("flock.generateBufferWithValue()", function () {
    // Buffer size and static number for the generator.
    var expected = new Float32Array([1.0, 1.0, 1.0]);
    var actual = flock.generateBufferWithValue(3, 1.0);
    QUnit.deepEqual(actual, expected, "Buffer size as a number and generator as a scalar.");
});

QUnit.test("flock.generateBuffer()", function () {
    // Buffer size and generator function
    var expected = new Float32Array([0, 42, 0, 42, 0]);
    var actual = flock.generateBuffer(5, function (i) {
        return i % 2 > 0 ? 42 : 0;
    });
    QUnit.deepEqual(actual, expected, "Buffer size as a number and generator function.");
});

QUnit.test("flock.fillBufferWithValue()", function () {
    // Pre-existing buffer and a static number for the generator.
    var expected = new Float32Array(5);
    var actual = flock.fillBufferWithValue(expected, 42.0);
    QUnit.equal(actual, expected, "When a buffer is supplied as the first argument, it should operated on in place.");
});

QUnit.test("flock.fillBuffer()", function () {
    // Pre-existing buffer and a generator function.
    var expected = new Float32Array([99.9, 199.8]);
    var inputBuffer = new Float32Array(2);
    var actual = flock.fillBuffer(inputBuffer, function (i) {
        return 99.9 * (i + 1);
    });
    QUnit.equal(actual, inputBuffer,
        "When a buffer is supplied as the first argument and a generator as the second, the buffer should operated on in place.");
    QUnit.deepEqual(actual, expected,
        "The generator should be invoked with the increment value as its first argument, and its output should be placed in the buffer.");
});

QUnit.test("flock.reverse()", function () {
    QUnit.expect(5);

    var forwardRaw = [1, 2, 3, 4, 5],
        forwardTyped = new Float32Array(forwardRaw),
        reverseRaw = [5, 4, 3, 2, 1],
        reverseTyped = new Float32Array(reverseRaw),
        actual = flock.reverse(forwardTyped);

    QUnit.deepEqual(actual, reverseTyped, "A typed array should be reversed as expected.");

    actual = flock.reverse(forwardRaw);
    QUnit.deepEqual(actual, reverseRaw, "A plain JS array should be reversed as expected.");

    var empty = [];
    actual = flock.reverse(empty);
    QUnit.equal(actual, empty, "An empty array should be returned as is.");

    var oneItemList = ["Cat"];
    actual = flock.reverse(oneItemList);
    QUnit.equal(actual, oneItemList, "A single-item list should be returned as is.");

    var nonArray = {a: "cat", b: new Float32Array([1, 2, 3])};
    actual = flock.reverse(nonArray);
    QUnit.equal(actual, nonArray, "A non array argument should be returned as is.");
});

QUnit.test("flock.normalize()", function () {
    function testNormalize(normal, unnormalized, expected) {
        var actual = flock.normalize(unnormalized, normal);
        QUnit.deepEqual(actual, expected, "Buffer normalized to " + normal + ".");
    };

    QUnit.expect(6);
    var unnormalized = [0.0, 0.5, 1.0, 1.5, 2.0];
    testNormalize(1.0, unnormalized, [0.0, 0.25, 0.5, 0.75, 1.0]);
    testNormalize(0.5, unnormalized, [0.0, 0.125, 0.25, 0.375, 0.5]);
    testNormalize(3.0, unnormalized, [0.0, 0.75, 1.5, 2.25, 3.0]);

    var mixedUnnormalized = [-1.0, -0.5, 0.0, 0.5, 1.0, 0.5, 0.0];
    testNormalize(1.0, mixedUnnormalized, mixedUnnormalized);
    testNormalize(0.5, mixedUnnormalized, [-0.5, -0.25, 0.0, 0.25, 0.5, 0.25, 0.0]);

    var negUnnormalized = [-5.0, -4.0, -3.0, -2.0, -1.0, -0.5, -0.25];
    testNormalize(1.0, negUnnormalized, [-1.0, -0.8, -0.6, -0.4, -0.2, -0.1, -0.05]);
});

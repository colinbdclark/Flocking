/*
 * Flocking Test Utilites
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.registerNamespace("flock.test");

flock.test.arrayNotNaN = function (buffer, msg) {
    var failures = [],
        i;

    for (i = 0; i < buffer.length; i++) {
        if (isNaN(buffer[i])) {
            failures.push(i);
        }
    }

    QUnit.equal(failures.length, 0, msg + (failures.length ? " NaN values found at indices: " + failures : ""));
};

flock.test.roundTo = function (value, numDecimals) {
    return parseFloat(value.toFixed(numDecimals));
};

flock.test.truncateTo = function (value, numDecimals) {
    var valueString = value.toString(),
        decIdx = valueString.indexOf(".");

    if (decIdx < 0) {
        return value;
    }

    var endIdx = decIdx + 1 + numDecimals,
        trimmed = valueString.substr(0, endIdx);

    return parseFloat(trimmed);
};

flock.test.arrayNotSilent = function (buffer, msg) {
    var numNonZero = 0,
        foundAt = -1,
        i;
    for (i = 0; i < buffer.length; i++) {
        if (buffer[i] !== 0.0) {
            foundAt = foundAt <= 0 ? i : foundAt; // Record the first index where a zero sample was found.
            numNonZero++;
        }
    }

    QUnit.ok(numNonZero > (buffer.length / 10), msg + " First silent sample found at: " + foundAt);
};

flock.test.arrayUnbroken = function (buffer, msg) {
    var numZero = 0,
        isBroken = false,
        foundAt = -1,
        i;

    for (i = 0; i < buffer.length; i++) {
        numZero = buffer[i] === 0 ? numZero + 1 : 0;

        // If we encounter more than 5 zero samples, we've got a drop.
        if (numZero > 5) {
            isBroken = true;
            foundAt = i;
            break;
        }
    }
    QUnit.ok(!isBroken, msg + " Last silent sample found at: " + foundAt);
};

flock.test.arrayWithinRange = function (buffer, min, max, msg) {
    var outOfRanges = [],
        i,
        val;

    for (i = 0; i < buffer.length; i++) {
        val = buffer[i];
        if (val < min || val > max) {
            outOfRanges.push({
                index: i,
                value: val
            });
        }
    }

    QUnit.equal(outOfRanges.length, 0, msg +
        (outOfRanges.length > 0 ? " Out of range values found at: " +
        fluid.prettyPrintJSON(outOfRanges) : ""));
};

flock.test.continuousArray = function (buffer, threshold, msg) {
    var unexpected = [],
        previous = buffer[0],
        current,
        i;
    for (i = 1; i < buffer.length; i++) {
        current = buffer[i];
        if (Math.abs(previous - current) > threshold) {
            unexpected.push({
                index: i,
                value: current,
                previous: previous
            });
        }
        previous = current;
    }

    QUnit.equal(unexpected.length, 0, msg + (unexpected.length ? " Unexpected values: " +
        fluid.prettyPrintJSON(unexpected) : ""));
};
flock.test.rampingArray = function (buffer, isAscending, msg) {
    var unexpected = [],
        previous = buffer[0],
        current,
        isExpectedDirection = false,
        i;

    for (i = 1; i < buffer.length; i++) {
        current = buffer[i];
        isExpectedDirection = isAscending ? current > previous : current < previous;
        if (!isExpectedDirection) {
            unexpected.push({
                index: i,
                value: current,
                previous: previous
            });
        }
    }
    QUnit.equal(unexpected.length, 0, msg + (unexpected.length ? " Unexpected values: " + unexpected : ""));
};

flock.test.sineishArray = function (buffer, max, isAscending, msg) {
    if (typeof isAscending === "string") {
        msg = isAscending;
        isAscending = true;
    }

    var unexpected = [],
        maxReached = false,
        fail = false,
        i,
        current,
        next;

    for (i = 0; i < buffer.length - 1; i++) {
        current = buffer[i];
        current = flock.test.roundTo(current, 6);
        next = buffer[i + 1];
        next = flock.test.roundTo(next, 6);

        if (current === next) {
            continue;
        }

        // TODO: Add support for a threshold.
        if (Math.abs(current) === max) {
            isAscending = !isAscending;
            maxReached = true;
        }

        fail = isAscending ? (next < current) : (next > current);
        if (fail) {
            unexpected.push("[index: " + i + " value: " + current + " next: " + next + "]");
        }
    }

    QUnit.equal(unexpected.length, 0, msg +
        (unexpected.length ? " Unexpected values: " + unexpected : ""));
};

flock.test.arrayContainsOnlyValues = function (buffer, values, msg) {
    var outlierVals = [],
        outlierIndices = [],
        i,
        j;

    for (i = 0; i < buffer.length; i++) {
        var val = buffer[i],
            match = false;

        for (j = 0; j < values.length; j++) {
            if (val === values[j]) {
                match = true;
                break;
            }
        }

        if (!match) {
            outlierVals.push(val);
            outlierIndices.push(i);
        }
    }

    QUnit.equal(outlierVals.length, 0, msg);
};

flock.test.valueCount = function (buffer, value, expectedNum, msg) {
    var count = 0,
        i;

    for (i = 0; i < buffer.length; i++) {
        if (buffer[i] === value) {
            count++;
        }
    }

    QUnit.equal(count, expectedNum, msg);
};

flock.test.checkBuffer = function (output, predicateFn, msg) {
    var passesCheck = false;
    for (var i = 0; i < output.length; i++) {
        passesCheck = predicateFn(output[i]);
        if (passesCheck) {
            break;
        }
    }
    QUnit.ok(passesCheck, msg);
};

flock.test.containsNegativeValues = function (output) {
    var checkNegativeValue = function (val) {
        if (val < 0.0) {
            return true;
        } else {
            return false;
        }
    };

    flock.test.checkBuffer(output, checkNegativeValue,
        "The signal should contain negative values.");
};

flock.test.containsPositiveValues = function (output) {
    var checkPositiveValue = function (val) {
        if (val > 0.0) {
            return true;
        } else {
            return false;
        }
    };

    flock.test.checkBuffer(output, checkPositiveValue,
        "The signal should contain positive values.");
};

flock.test.signalInRange = function (output, expectedMin, expectedMax, range) {
    output = range ? output.subarray(range.start, range.end) : output;
    flock.test.arrayNotNaN(output,
        "The ugen should never output NaN.");
    flock.test.arrayNotSilent(output,
        "The output should not be completely silent.");
    flock.test.arrayWithinRange(output, expectedMin, expectedMax,
        "The ugen should produce output values ranging between " + expectedMin + " and " + expectedMax + ".");
};

flock.test.unbrokenAudioSignalInRange = function (output, expectedMin, expectedMax, range) {
    output = range ? output.subarray(range.start, range.end) : output;
    flock.test.audioSignalInRange(output, expectedMin, expectedMax);
    flock.test.arrayUnbroken(output,
        "The ugen should produce an unbroken audio tone.");
};

flock.test.audioSignalInRange = function (output, expectedMin, expectedMax, range) {
    output = range ? output.subarray(range.start, range.end) : output;
    flock.test.signalInRange(output, expectedMin, expectedMax);
    flock.test.containsNegativeValues(output);
    flock.test.containsPositiveValues(output);
};

/*
 * Flocking - Creative audio synthesis for the Web!
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

let flock = fluid.registerNamespace("flock");

flock.OUT_UGEN_ID = "flocking-out";

flock.PI = Math.PI;
flock.TWOPI = 2.0 * Math.PI;
flock.HALFPI = Math.PI / 2.0;
flock.LOG01 = Math.log(0.1);
flock.LOG001 = Math.log(0.001);
flock.ROOT2 = Math.sqrt(2);

flock.rates = {
    AUDIO: "audio",
    CONTROL: "control",
    SCHEDULED: "scheduled",
    DEMAND: "demand",
    CONSTANT: "constant"
};

flock.shim = {
    AudioContext: typeof window !== "undefined" ?
        (window.AudioContext || window.webkitAudioContext) :
        undefined,
    URL: typeof window !== "undefined" ?
        (window.URL || window.webkitURL || window.msURL) :
        undefined
};

flock.debug = {
    failHard: true
};

/*************
 * Utilities *
 *************/

flock.noOp = function () {};

flock.isIterable = function (o) {
    var type = typeof o;
    return o && o.length !== undefined && type !== "string" && type !== "function";
};

flock.hasValue = function (obj, value) {
    var found = false;
    for (var key in obj) {
        if (obj[key] === value) {
            found = true;
            break;
        }
    }

    return found;
};

flock.hasTag = function (obj, tag) {
    if (!obj || !tag) {
        return false;
    }
    return obj.tags && obj.tags.indexOf(tag) > -1;
};

/**
 * Returns a random number between the specified low and high values.
 *
 * For performance reasons, this function does not perform any type checks;
 * you will need ensure that your low and high arguments are Numbers.
 *
 * @param low the minimum value
 * @param high the maximum value
 * @return a random value constrained to the specified range
 */
flock.randomValue = function (low, high) {
    var scaled = high - low;
    return Math.random() * scaled + low;
};

/**
 * Produces a random number between -1.0 and 1.0.
 *
 * @return a random audio value
 */
flock.randomAudioValue = function () {
    return Math.random() * 2.0 - 1.0;
};

flock.fillBuffer = function (buf, fillFn) {
    for (var i = 0; i < buf.length; i++) {
        buf[i] = fillFn(i, buf);
    }

    return buf;
};

flock.fillBufferWithValue = function (buf, value) {
    for (var i = 0; i < buf.length; i++) {
        buf[i] = value;
    }

    return buf;
};

flock.generateBuffer = function (length, fillFn) {
    var buf = new Float32Array(length);
    return flock.fillBuffer(buf, fillFn);
};

flock.generateBufferWithValue = function (length, value) {
    var buf = new Float32Array(length);
    return flock.fillBufferWithValue(buf, value);
};

flock.generateSilentBuffer = function (length) {
    return new Float32Array(length);
};

flock.generateBuffers = function (numBufs, length) {
    var bufs = [],
        i;
    for (i = 0; i < numBufs; i++) {
        bufs[i] = new Float32Array(length);
    }
    return bufs;
};

flock.clearBuffer = function (buf) {
    for (var i = 0; i < buf.length; i++) {
        buf[i] = 0.0;
    }

    return buf;
};


/**
 * Performs an in-place reversal of all items in the array.
 *
 * @arg {Iterable} b a buffer or array to reverse
 * @return {Iterable} the buffer, reversed
 */
flock.reverse = function (b) {
    if (!b || !flock.isIterable(b) || b.length < 2) {
        return b;
    }

    // A native implementation of reverse() exists for regular JS arrays
    // and is partially implemented for TypedArrays. Use it if possible.
    if (typeof b.reverse === "function") {
        return b.reverse();
    }

    var t;
    for (var l = 0, r = b.length - 1; l < r; l++, r--) {
        t = b[l];
        b[l] = b[r];
        b[r] = t;
    }

    return b;
};

/**
 * Randomly selects an index from the specified array.
 */
flock.randomIndex = function (arr) {
    var max = arr.length - 1;
    return Math.round(Math.random() * max);
};

/**
 * Selects an item from an array-like object using the specified strategy.
 *
 * @param {Array-like object} arr the array to choose from
 * @param {Function} a selection strategy; defaults to flock.randomIndex
 * @return a randomly selected list item
 */
flock.arrayChoose = function (arr, strategy) {
    strategy = strategy || flock.randomIndex;
    arr = fluid.makeArray(arr);
    var idx = strategy(arr);
    return arr[idx];
};

/**
 * Randomly selects an item from an array or object.
 *
 * @param {Array-like object|Object} collection the object to choose from
 * @return a randomly selected item from collection
 */
flock.choose = function (collection, strategy) {
    var key, val;

    if (flock.isIterable(collection)) {
        val = flock.arrayChoose(collection, strategy);
        return val;
    }

    key = flock.arrayChoose(collection.keys, strategy);
    val = collection[key];
    return val;
};

/**
 * Shuffles an array-like object in place.
 * Uses the Fisher-Yates/Durstenfeld/Knuth algorithm, which is
 * described here:
 *   https://www.frankmitchell.org/2015/01/fisher-yates/
 * and here:
 *   https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
 *
 * @param arr the array to shuffle
 * @return the shuffled array
 */
// TODO: Unit tests!
flock.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    return arr;
};

/**
 * Normalizes the specified buffer in place to the specified value.
 *
 * @param {Arrayable} buffer the buffer to normalize
 * @param {Number} normal the value to normalize the buffer to
 * @param {Arrayable} a buffer to output values into; if omitted, buffer will be modified in place
 * @return the buffer, normalized in place
 */
flock.normalize = function (buffer, normal, output) {
    output = output || buffer;

    var maxVal = 0.0,
        i,
        current,
        val;

    normal = normal === undefined ? 1.0 : normal;
    // Find the maximum value in the buffer.
    for (i = 0; i < buffer.length; i++) {
        current = Math.abs(buffer[i]);
        if (current > maxVal) {
            maxVal = current;
        }
    }

    // And then normalize the buffer in place.
    if (maxVal > 0.0) {
        for (i = 0; i < buffer.length; i++) {
            val = buffer[i];
            output[i] = (val / maxVal) * normal;
        }
    }

    return output;
};

flock.generateFourierTable = function (size, scale, numHarms, phase, amps) {
    phase *= flock.TWOPI;

    return flock.generateBuffer(size, function (i) {
        var harm,
            amp,
            w,
            val = 0.0;

        for (harm = 0; harm < numHarms; harm++) {
            amp = amps ? amps[harm] : 1.0;
            w = (harm + 1) * (i * scale);
            val += amp * Math.cos(w + phase);
        }

        return val;
    });
};

flock.generateNormalizedFourierTable = function (size, scale, numHarms, phase, ampGenFn) {
    var amps = flock.generateBuffer(numHarms, function (harm) {
        return ampGenFn(harm + 1); //  Harmonics are indexed from 1 instead of 0.
    });

    var table = flock.generateFourierTable(size, scale, numHarms, phase, amps);
    return flock.normalize(table);
};

flock.fillTable = function (sizeOrTable, fillFn) {
    var len = typeof (sizeOrTable) === "number" ? sizeOrTable : sizeOrTable.length;
    return fillFn(sizeOrTable, flock.TWOPI / len);
};

flock.tableGenerators = {
    sin: function (size, scale) {
        return flock.generateBuffer(size, function (i) {
            return Math.sin(i * scale);
        });
    },

    tri: function (size, scale) {
        return flock.generateNormalizedFourierTable(size, scale, 1000, 1.0, function (harm) {
            // Only odd harmonics,
            // amplitudes decreasing by the inverse square of the harmonic number
            return harm % 2 === 0 ? 0.0 : 1.0 / (harm * harm);
        });
    },

    saw: function (size, scale) {
        return flock.generateNormalizedFourierTable(size, scale, 10, -0.25, function (harm) {
            // All harmonics,
            // amplitudes decreasing by the inverse of the harmonic number
            return 1.0 / harm;
        });
    },

    square: function (size, scale) {
        return flock.generateNormalizedFourierTable(size, scale, 10, -0.25, function (harm) {
            // Only odd harmonics,
            // amplitudes decreasing by the inverse of the harmonic number
            return harm % 2 === 0 ? 0.0 : 1.0 / harm;
        });
    },

    hann: function (size) {
        // Hanning envelope: sin^2(i) for i from 0 to pi
        return flock.generateBuffer(size, function (i) {
            var y = Math.sin(Math.PI * i / size);
            return y * y;
        });
    },

    sinWindow: function (size) {
        return flock.generateBuffer(size, function (i) {
            return Math.sin(Math.PI * i / size);
        });
    }
};

flock.range = function (buf) {
    var range = {
        max: Number.NEGATIVE_INFINITY,
        min: Infinity
    };
    var i, val;

    for (i = 0; i < buf.length; i++) {
        val = buf[i];
        if (val > range.max) {
            range.max = val;
        }
        if (val < range.min) {
            range.min = val;
        }
    }

    return range;
};

flock.scale = function (buf) {
    if (!buf) {
        return;
    }

    var range = flock.range(buf),
        mul = (range.max - range.min) / 2,
        sub = (range.max + range.min) / 2,
        i;

    for (i = 0; i < buf.length; i++) {
        buf[i] = (buf[i] - sub) / mul;
    }

    return buf;
};

flock.copyBuffer = function (buffer, start, end) {
    if (end === undefined) {
        end = buffer.length;
    }

    var len = end - start,
        target = new Float32Array(len),
        i,
        j;

    for (i = start, j = 0; i < end; i++, j++) {
        target[j] = buffer[i];
    }

    return target;
};

flock.copyToBuffer = function (source, target) {
    var len = Math.min(source.length, target.length);
    for (var i = 0; i < len; i++) {
        target[i] = source[i];
    }
};

flock.interpretMidiString = function (midiStr) {
    if (!midiStr || midiStr.length < 2) {
        return NaN;
    }

    midiStr = midiStr.toLowerCase();

    var secondChar = midiStr.charAt(1),
        splitIdx = secondChar === "#" || secondChar === "b" ? 2 : 1,
        note = midiStr.substring(0, splitIdx),
        octave = Number(midiStr.substring(splitIdx)),
        pitchClass = flock.midiFreq.noteNames[note],
        midiNum = octave * 12 + pitchClass;

    return midiNum;
};

flock.midiFreq = function (midi, a4Freq, a4NoteNum, notesPerOctave) {
    a4Freq = a4Freq === undefined ? 440 : a4Freq;
    a4NoteNum = a4NoteNum === undefined ? 69 : a4NoteNum;
    notesPerOctave = notesPerOctave || 12;

    if (typeof midi === "string") {
        midi = flock.interpretMidiString(midi);
    }

    return a4Freq * Math.pow(2, (midi - a4NoteNum) * 1 / notesPerOctave);
};

flock.midiFreq.noteNames = {
    "b#": 0,
    "c": 0,
    "c#": 1,
    "db": 1,
    "d": 2,
    "d#": 3,
    "eb": 3,
    "e": 4,
    "e#": 5,
    "f": 5,
    "f#": 6,
    "gb": 6,
    "g": 7,
    "g#": 8,
    "ab": 8,
    "a": 9,
    "a#": 10,
    "bb": 10,
    "b": 11,
    "cb": 11
};

flock.interpolate = {
    /**
     * Performs simple truncation.
     */
    none: function (idx, table) {
        idx = idx % table.length;

        return table[idx | 0];
    },

    /**
     * Performs linear interpolation.
     */
    linear: function (idx, table) {
        var len = table.length;
        idx = idx % len;

        var i1 = idx | 0,
            i2 = (i1 + 1) % len,
            frac = idx - i1,
            y1 = table[i1],
            y2 = table[i2];

        return y1 + frac * (y2 - y1);
    },

    /**
     * Performs Hermite cubic interpolation.
     *
     * Based on Laurent De Soras' implementation at:
     * http://www.musicdsp.org/showArchiveComment.php?ArchiveID=93
     *
     * @param idx {Number} an index into the table
     * @param table {Arrayable} the table from which values around idx should be drawn and interpolated
     * @return {Number} an interpolated value
     */
    hermite: function (idx, table) {
        var len = table.length,
            intPortion = Math.floor(idx),
            i0 = intPortion % len,
            frac = idx - intPortion,
            im1 = i0 > 0 ? i0 - 1 : len - 1,
            i1 = (i0 + 1) % len,
            i2 = (i0 + 2) % len,
            xm1 = table[im1],
            x0 = table[i0],
            x1 = table[i1],
            x2 = table[i2],
            c = (x1 - xm1) * 0.5,
            v = x0 - x1,
            w = c + v,
            a = w + v + (x2 - x0) * 0.5,
            bNeg = w + a,
            val = (((a * frac) - bNeg) * frac + c) * frac + x0;

        return val;
    }
};

flock.interpolate.cubic = flock.interpolate.hermite;

flock.log = {
    fail: function (msg) {
        fluid.log(fluid.logLevel.FAIL, msg);
    },

    warn: function (msg) {
        fluid.log(fluid.logLevel.WARN, msg);
    },

    debug: function (msg) {
        fluid.log(fluid.logLevel.INFO, msg);
    }
};

flock.fail = function (e) {
    if (flock.debug.failHard) {
        e = e instanceof Error ? e : new Error(e);
        throw e;
    } else {
        flock.log.fail(e);
    }
};

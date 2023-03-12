/*
* Flocking Interpreter
 * https://github.com/lichen-community-systems/flocking
*
* Copyright 2011-2023, Colin Clark
* Released under the terms of the MIT license.
*/

fluid.registerNamespace("flock.interpret");

flock.interpret.graphDef = function (graphDef, options) {
    if (!graphDef) {
        graphDef = [];
    }

    if (!flock.interpret.graphDef.hasOutUGen(graphDef)) {
        // We didn't get an out ugen specified, so we need to make one.
        graphDef = flock.interpret.graphDef.makeOutUGenDef(graphDef, options);
    }

    return flock.interpret.ugenForDef(graphDef, options);
};

flock.interpret.graphDef.hasOutUGen = function (graphDef) {
    // FIXME: This is hostile to third-party extension.
    return !flock.isIterable(graphDef) && (
        graphDef.id === flock.OUT_UGEN_ID ||
        graphDef.ugen === "flock.ugen.out" ||
        graphDef.ugen === "flock.ugen.valueOut"
    );
};

flock.interpret.graphDef.makeOutUGenDef = function (ugenDef, options) {
    ugenDef = {
        id: flock.OUT_UGEN_ID,
        ugen: "flock.ugen.valueOut",
        inputs: {
            sources: ugenDef
        }
    };

    if (options.rate === flock.rates.AUDIO) {
        ugenDef.ugen = "flock.ugen.out";
        ugenDef.inputs.bus = 0;
        ugenDef.inputs.expand = options.audioSettings.chans;
    }

    return ugenDef;
};

flock.interpret.instantiateUGen = function (ugenDef, interpretedInputs, options) {
    var rates = options.audioSettings.rates,
        blockSize = options.audioSettings.blockSize;

    // Assume audio rate if no rate was specified by the user.
    if (!ugenDef.rate) {
        ugenDef.rate = flock.rates.AUDIO;
    }

    if (!flock.hasValue(flock.rates, ugenDef.rate)) {
        flock.fail("An invalid rate was specified for a unit generator. ugenDef was: " +
            fluid.prettyPrintJSON(ugenDef));

        if (!flock.debug.failHard) {
            var oldRate = ugenDef.rate;
            ugenDef.rate = flock.rates.AUDIO;
            flock.log.warn("Overriding invalid unit generator rate. Rate is now '" +
                ugenDef.rate + "'; was: " + fluid.prettyPrintJSON(oldRate));
        }
    }

    var sampleRate;
    // Set the ugen's sample rate value according to the rate the user specified.
    if (ugenDef.options && ugenDef.options.sampleRate !== undefined) {
        sampleRate = ugenDef.options.sampleRate;
    } else {
        sampleRate = rates[ugenDef.rate];
    }

    // FIXME: Use Infusion's options merging!
    ugenDef.options = $.extend(true, {}, ugenDef.options, {
        sampleRate: sampleRate,
        rate: ugenDef.rate,
        audioSettings: {
            rates: rates,
            blockSize: blockSize
        }
    });

    var outputBufferSize = ugenDef.rate === flock.rates.AUDIO ? blockSize : 1,
        outputBuffers;

    if (flock.hasTag(ugenDef.options, "flock.ugen.multiChannelOutput")) {
        var numOutputs = ugenDef.options.numOutputs || 1;
        outputBuffers = [];

        for (var i = 0; i < numOutputs; i++) {
            outputBuffers.push(new Float32Array(outputBufferSize));
        }
    } else {
        outputBuffers = new Float32Array(outputBufferSize);
    }

    var ugenOpts = fluid.copy(ugenDef.options);
    ugenOpts.buffers = options.buffers;
    ugenOpts.buses = options.buses;

    return flock.invoke(undefined, ugenDef.ugen, [
        interpretedInputs,
        outputBuffers,
        ugenOpts
    ]);
};


flock.interpret.reservedWords = ["id", "ugen", "rate", "inputs", "options"];
flock.interpret.specialInputs = ["value", "buffer", "list", "table", "envelope", "durations", "values"];

flock.interpret.expandInputs = function (ugenDef) {
    if (ugenDef.inputs) {
        return ugenDef;
    }

    var inputs = {},
        prop;

    // Copy any non-reserved properties from the top-level ugenDef object into the inputs property.
    for (prop in ugenDef) {
        if (flock.interpret.reservedWords.indexOf(prop) === -1) {
            inputs[prop] = ugenDef[prop];
            delete ugenDef[prop];
        }
    }
    ugenDef.inputs = inputs;

    return ugenDef;
};

flock.interpret.ugenDefForConstantValue = function (value) {
    return {
        ugen: "flock.ugen.value",
        rate: flock.rates.CONSTANT,
        inputs: {
            value: value
        }
    };
};

flock.interpret.expandValueDef = function (ugenDef) {
    var type = typeof (ugenDef);
    if (type === "number") {
        return flock.interpret.ugenDefForConstantValue(ugenDef);
    }

    if (type === "object") {
        return ugenDef;
    }

    throw new Error("Invalid value type found in ugen definition. UGenDef was: " +
        fluid.prettyPrintJSON(ugenDef));
};

flock.interpret.rateMap = {
    "ar": flock.rates.AUDIO,
    "kr": flock.rates.CONTROL,
    "sr": flock.rates.SCHEDULED,
    "dr": flock.rates.DEMAND,
    "cr": flock.rates.CONSTANT
};

flock.interpret.expandRate = function (ugenDef, options) {
    ugenDef.rate = flock.interpret.rateMap[ugenDef.rate] || ugenDef.rate;
    if (options.overrideRate && ugenDef.rate !== flock.rates.CONSTANT) {
        ugenDef.rate = options.rate;
    }

    return ugenDef;
};

flock.interpret.ugenDef = function (ugenDefs, options) {
    var interpretFn = flock.isIterable(ugenDefs) ?
        flock.interpret.ugensForDefs : flock.interpret.ugenForDef;
    var instantiated = interpretFn(ugenDefs, options);
    return instantiated;
};

flock.interpret.ugenDef.mergeOptions = function (ugenDef) {
    // TODO: Infusion options merging.
    var defaults = flock.ugenDefaults(ugenDef.ugen) || {};

    // TODO: Insane!
    defaults = fluid.copy(defaults);
    defaults.options = defaults.ugenOptions;
    delete defaults.ugenOptions;
    //

    return $.extend(true, {}, defaults, ugenDef);
};

flock.interpret.ugensForDefs = function (ugenDefs, options) {
    var intepreted = [],
        i;
    for (i = 0; i < ugenDefs.length; i++) {
        intepreted[i] = flock.interpret.ugenForDef(ugenDefs[i], options);
    }
    return intepreted;
};

/**
 * Creates a unit generator for the specified unit generator definition spec.
 *
 * ugenDefs are plain old JSON objects describing the characteristics of the desired unit generator, including:
 *      - ugen: the type of unit generator, as string (e.g. "flock.ugen.sinOsc")
 *      - rate: the rate at which the ugen should be run, either "audio", "control", or "constant"
 *      - id: an optional unique name for the unit generator, which will make it available as a synth input
 *      - inputs: a JSON object containing named key/value pairs for inputs to the unit generator
 *           OR
 *      - inputs keyed by name at the top level of the ugenDef
 *
 * @param {UGenDef} ugenDef the unit generator definition to interpret
 * @param {Object} options an options object containing:
 *           {Object} audioSettings the audio settings
 *           {Array} buses an array of global buses
 *           {Array} buffers an array of global buffers
 *           {Array of Functions} visitors an optional list of visitor functions to invoke when the ugen has been created
 * @return the instantiated unit generator object
 */
flock.interpret.ugenForDef = function (ugenDef, options) {
    options = options || {
        audioSettings: {
            rates: []
        }
    };

    var visitors = options.visitors,
        rates = options.audioSettings.rates;

    // If we receive a plain scalar value, expand it into a value ugenDef.
    ugenDef = flock.interpret.expandValueDef(ugenDef);

    // We received an array of ugen defs.
    if (flock.isIterable(ugenDef)) {
        return flock.interpret.ugensForDefs(ugenDef, options);
    }

    ugenDef = flock.interpret.expandInputs(ugenDef);

    flock.interpret.expandRate(ugenDef, options);
    ugenDef = flock.interpret.ugenDef.mergeOptions(ugenDef, options);

    var inputDefs = ugenDef.inputs,
        inputs = {},
        inputDef;

    // TODO: This notion of "special inputs" should be refactored as a pluggable system of
    // "input expanders" that are responsible for processing input definitions of various sorts.
    // In particular, buffer management should be here so that we can initialize bufferDefs more
    // proactively and remove this behaviour from flock.ugen.buffer.
    for (inputDef in inputDefs) {
        var inputDefVal = inputDefs[inputDef];

        if (inputDefVal === null) {
            continue; // Skip null inputs.
        }

        // Create ugens for all inputs except special inputs.
        inputs[inputDef] = flock.input.shouldExpand(inputDef, ugenDef) ?
            flock.interpret.ugenForDef(inputDefVal, options) : // Interpret the ugendef and create a ugen instance.
            inputDefVal; // Don't instantiate a ugen, just pass the def on as-is.
    }

    if (!ugenDef.ugen) {
        throw new Error("Unit generator definition lacks a 'ugen' property; " +
            "can't initialize the synth graph. Value: " + fluid.prettyPrintJSON(ugenDef));
    }

    var ugen = flock.interpret.instantiateUGen(ugenDef, inputs, options);
    if (ugenDef.id) {
        ugen.id = ugenDef.id;
    }

    ugen.options.ugenDef = ugenDef;

    if (visitors) {
        for(var i = 0; i < visitors.length; i++) {
            visitors[i](ugen, ugenDef, rates);
        }
    }

    return ugen;
};

flock.interpret.expandBufferDef = function (bufDef) {
    return typeof bufDef === "string" ? {id: bufDef} :
        (flock.isIterable(bufDef) || bufDef.data || bufDef.format) ?
        flock.bufferDesc(bufDef) : bufDef;
};

flock.interpret.bufferForDef = function (bufDef, ugen, bufferSources) {
    bufDef = flock.interpret.expandBufferDef(bufDef);

    if (bufDef.data && bufDef.data.channels) {
        bufDef = flock.bufferDesc(bufDef);
        flock.interpret.bufferForDef.resolveBuffer(bufDef, ugen, bufferSources);
    } else {
        flock.interpret.bufferForDef.resolveDef(bufDef, ugen, bufferSources);
    }
};

flock.interpret.bufferForDef.createBufferSource = function (sampleRate) {
    return flock.bufferSource({
        sampleRate: sampleRate
    });
};

flock.interpret.bufferForDef.findSource = function (defOrDesc, bufferSources) {
    var source;

    if (bufferSources && defOrDesc.id) {
        source = bufferSources[defOrDesc.id];
        if (!source) {
            source = flock.interpret.bufferForDef.createBufferSource(
                sampleRate);
            bufferSources[defOrDesc.id] = source;
        }
    } else {
        source = flock.interpret.bufferForDef.createBufferSource(sampleRate);
    }

    return source;
};

flock.interpret.bufferForDef.bindToPromise = function (p, source, ugen) {
    // TODO: refactor this.
    var success = function (bufDesc) {
        source.events.onBufferUpdated.addListener(success);
        if (ugen) {
            ugen.setBuffer(bufDesc);
        }
    };

    var error = function (msg) {
        if (!msg && source.model.src && source.model.src.indexOf(".aif")) {
            msg = "if this is an AIFF file, you might need to include" +
            " flocking-audiofile-compatibility.js in some browsers.";
        }
        throw new Error("Error while resolving buffer " + source.model.src + ": " + msg);
    };

    p.then(success, error);
};

flock.interpret.bufferForDef.resolveDef = function (bufDef, ugen,
    bufferSources) {
    var source = flock.interpret.bufferForDef.findSource(bufDef, bufferSources),
        p;

    bufDef.src = bufDef.url || bufDef.src;
    if (bufDef.selector && typeof(document) !== "undefined") {
        bufDef.src = document.querySelector(bufDef.selector).files[0];
    }

    p = source.get(bufDef);
    flock.interpret.bufferForDef.bindToPromise(p, source, ugen);
};


flock.interpret.bufferForDef.resolveBuffer = function (bufDesc, ugen,
    bufferSources) {
    var source = flock.interpret.bufferForDef.findSource(bufDesc,
        bufferSources);
    var p = source.set(bufDesc);

    flock.interpret.bufferForDef.bindToPromise(p, source, ugen);
};

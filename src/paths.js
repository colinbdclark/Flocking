/*
 * Flocking Path Utilities
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

flock.pathParseError = function (root, path, token) {
    var msg = "Error parsing path '" + path + "'. Segment '" + token +
        "' could not be resolved.";

    flock.fail(msg);
};

flock.get = function (root, path) {
    if (!root) {
        return fluid.getGlobalValue(path);
    }

    if (arguments.length === 1 && typeof root === "string") {
        return fluid.getGlobalValue(root);
    }

    if (!path || path === "") {
        return;
    }

    var tokenized = path === "" ? [] : String(path).split("."),
        valForSeg = root[tokenized[0]],
        i;

    for (i = 1; i < tokenized.length; i++) {
        if (valForSeg === null || valForSeg === undefined) {
            flock.pathParseError(root, path, tokenized[i - 1]);
            return;
        }
        valForSeg = valForSeg[tokenized[i]];
    }

    return valForSeg;
};

flock.set = function (root, path, value) {
    if (!root || !path || path === "") {
        return;
    }

    var tokenized = String(path).split("."),
        l = tokenized.length,
        prop = tokenized[0],
        i,
        type;

    for (i = 1; i < l; i++) {
        root = root[prop];
        type = typeof root;
        if (type !== "object") {
            flock.fail("Error while setting a value at path '" + path +
                "'. A non-container object was found at segment '" + prop + "'. Value: " + root);

            return;
        }
        prop = tokenized[i];
        if (root[prop] === undefined) {
            root[prop] = {};
        }
    }
    root[prop] = value;

    return value;
};

flock.invoke = function (root, path, args) {
    var fn = typeof root === "function" ? root : flock.get(root, path);
    if (typeof fn !== "function") {
        flock.fail("Path '" + path + "' does not resolve to a function.");
        return;
    }
    return fn.apply(null, args);
};


fluid.registerNamespace("flock.input");

flock.input.shouldExpand = function (inputName) {
    return flock.interpret.specialInputs.indexOf(inputName) < 0;
};

// TODO: Replace this with a regular expression;
// this produces too much garbage!
flock.input.pathExpander = function (path) {
    var segs = fluid.model.parseEL(path),
        separator = "inputs",
        len = segs.length,
        penIdx = len - 1,
        togo = [],
        i;

    for (i = 0; i < penIdx; i++) {
        var seg = segs[i];
        var nextSeg = segs[i + 1];

        togo.push(seg);

        if (nextSeg === "model" || nextSeg === "options") {
            togo = togo.concat(segs.slice(i + 1, penIdx));
            break;
        }

        if (!isNaN(Number(nextSeg))) {
            continue;
        }

        togo.push(separator);
    }

    togo.push(segs[penIdx]);

    return togo.join(".");
};

flock.input.expandPaths = function (paths) {
    var expanded = {},
        path,
        expandedPath,
        value;

    for (path in paths) {
        expandedPath = flock.input.pathExpander(path);
        value = paths[path];
        expanded[expandedPath] = value;
    }

    return expanded;
};

flock.input.expandPath = function (path) {
    return (typeof path === "string") ? flock.input.pathExpander(path) : flock.input.expandPaths(path);
};

flock.input.getValueForPath = function (root, path) {
    path = flock.input.expandPath(path);
    var input = flock.get(root, path);

    // If the unit generator is a valueType ugen, return its value, otherwise return the ugen itself.
    return flock.hasTag(input, "flock.ugen.valueType") ? input.inputs.value : input;
};

flock.input.getValuesForPathArray = function (root, paths) {
    var values = {},
        i,
        path;

    for (i = 0; i < paths.length; i++) {
        path = paths[i];
        values[path] = flock.input.get(root, path);
    }

    return values;
};

flock.input.getValuesForPathObject = function (root, pathObj) {
    var key;

    for (key in pathObj) {
        pathObj[key] = flock.input.get(root, key);
    }

    return pathObj;
};

/**
 * Gets the value of the ugen at the specified path.
 *
 * @param {String} path the ugen's path within the synth graph
 * @return {Number|UGen} a scalar value in the case of a value ugen, otherwise the ugen itself
 */
flock.input.get = function (root, path) {
    return typeof path === "string" ? flock.input.getValueForPath(root, path) :
        flock.isIterable(path) ? flock.input.getValuesForPathArray(root, path) :
        flock.input.getValuesForPathObject(root, path);
};

flock.input.resolveValue = function (root, path, val, target, inputName, previousInput, valueinterpreter) {
    // Check to see if the value is actually a "get expression"
    // (i.e. an EL path wrapped in ${}) and resolve it if necessary.
    if (typeof val === "string") {
        var extracted = fluid.extractEL(val, flock.input.valueExpressionSpec);
        if (extracted) {
            var resolved = flock.input.getValueForPath(root, extracted);
            if (resolved === undefined) {
                flock.log.debug("The value expression '" + val + "' resolved to undefined. " +
                "If this isn't expected, check to ensure that your path is valid.");
            }

            return resolved;
        }
    }

    return flock.input.shouldExpand(inputName) && valueinterpreter ?
        valueinterpreter(val, path, target, previousInput) : val;
};

flock.input.valueExpressionSpec = {
    ELstyle: "${}"
};

flock.input.setValueForPath = function (root, path, val, baseTarget, valueinterpreter) {
    path = flock.input.expandPath(path);

    var previousInput = flock.get(root, path),
        lastDotIdx = path.lastIndexOf("."),
        inputName = path.slice(lastDotIdx + 1),
        target = lastDotIdx > -1 ? flock.get(root, path.slice(0, path.lastIndexOf(".inputs"))) :
            baseTarget,
        resolvedVal = flock.input.resolveValue(root, path, val, target, inputName, previousInput, valueinterpreter);

    flock.set(root, path, resolvedVal);

    if (target && target.onInputChanged) {
        target.onInputChanged(inputName);
    }

    return resolvedVal;
};

flock.input.setValuesForPaths = function (root, valueMap, baseTarget, valueinterpreter) {
    var resultMap = {},
        path,
        val,
        result;

    for (path in valueMap) {
        val = valueMap[path];
        result = flock.input.set(root, path, val, baseTarget, valueinterpreter);
        resultMap[path] = result;
    }

    return resultMap;
};

/**
 * Sets the value of the ugen at the specified path.
 *
 * @param {String} path the ugen's path within the synth graph
 * @param {Number || UGenDef} val a scalar value (for Value ugens) or a UGenDef object
 * @return {UGen} the newly created UGen that was set at the specified path
 */
flock.input.set = function (root, path, val, baseTarget, valueinterpreter) {
    return typeof path === "string" ?
        flock.input.setValueForPath(root, path, val, baseTarget, valueinterpreter) :
        flock.input.setValuesForPaths(root, path, baseTarget, valueinterpreter);
};

/*
 * Flocking Graph Evaluation Functions.
 * https://github.com/lichen-community-systems/flocking
 *
 * Copyright 2011-2023, Colin Clark
 * Released under the terms of the MIT license.
 */

fluid.registerNamespace("flock.evaluate");

flock.evaluate.ugens = function (ugens) {
    let ugen;
    for (let i = 0; i < ugens.length; i++) {
        ugen = ugens[i];
        if (ugen.gen !== undefined) {
            ugen.gen(ugen.model.blockSize);
        }
    }
};

flock.evaluate.unitGeneratorGraph = function (unitGeneratorGraph) {
    flock.evaluate.ugens(unitGeneratorGraph.ugenList.nodes);
};

flock.evaluate.ugenLists = function (ugenLists) {
    for (let i = 0; i < ugenLists.length; i++) {
        let ugenList = ugenLists[i];
        flock.evaluate.ugens(ugenList.nodes);
    }
};

flock.evaluate.clearBuses = function (buses, numBuses, busLen) {
    for (let i = 0; i < numBuses; i++) {
        let bus = buses[i];
        for (let j = 0; j < busLen; j++) {
            bus[j] = 0;
        }
    }
};

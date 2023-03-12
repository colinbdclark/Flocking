/*
* Flocking Unit Graph Tests
* https://github.com/lichen-community-systems/flocking
*
* Copyright 2011-2023, Colin Clark
* Released under the terms of the MIT license.
*/

var QUnit = fluid.registerNamespace("QUnit");

QUnit.module("Unit Graph Tests");

fluid.defaults("flock.test.unitGeneratorGraph.context", {
    gradeNames: "fluid.component",

    components: {
        audioEnvironment: {
            type: "flock.audioEnvironment"
        },

        unitGeneratorGraph: {
            type: "flock.unitGeneratorGraph"
        }
    }
});


var nestedGraphDef = {
    ugen: "flock.ugen.out",
    inputs: {
        sources: {
            ugen: "flock.test.ugen.mock",
            inputs: {
                gerbil: {
                    id: "gerbil",
                    ugen: "flock.test.ugen.mock",
                    inputs: {
                        ear: {
                            id: "ear",
                            ugen: "flock.ugen.value",
                            value: 500
                        }
                    }
                },
                cat: {
                    id: "cat",
                    ugen: "flock.test.ugen.mock"
                },
                dog: {
                    ugen: "flock.test.ugen.mock"
                }
            }
        },
        bus: 0,
        expand: 2
    }
};

QUnit.test("Unit Graph/ugenNodeList: removing ugens", function () {
    var removalTestSpecs = [
        {
            ugenToRemove: null,
            expected: {
                all: 8,
                named: 3
            },
            msg: "To start"
        },
        {
            ugenToRemove: "ugenList.namedNodes.ear",
            expected: {
                all: 7,
                named: 2
            },
            msg: "After removing a passive, named ugen"
        },
        {
            ugenToRemove: "ugenList.namedNodes.cat",
            expected: {
                all: 6,
                named: 1
            },
            msg: "After removing an active, named ugen"
        },
        // The output node has no name, so we have to address it by index.
        {
            ugenToRemove: "ugenList.nodes.5.inputs.sources.inputs.dog",
            expected: {
                all: 5,
                named: 1
            },
            msg: "After removing an active, unnamed ugen"
        },
        // And the output node has moved to a lower index after
        // one of its inputs has been deleted.
        {
            ugenToRemove: "ugenList.nodes.4",
            expected: {
                all: 0,
                named: 0
            },
            msg: "After removing a ugen with other inputs, its inputs should be recursively removed"
        }
    ];

    let context = flock.test.unitGeneratorGraph.context({
        components: {
            unitGeneratorGraph: {
                options: {
                    graphDef: nestedGraphDef
                }
            }
        }
    });

    fluid.each(removalTestSpecs, function (spec) {
        var toRemove = spec.ugenToRemove;
        if (toRemove) {
            toRemove = typeof (toRemove) === "string" ?
                flock.get(context.unitGeneratorGraph, toRemove) : toRemove;
            flock.ugenNodeList.removeTree(context.unitGeneratorGraph.ugenList,
                 toRemove, true);
        }
        QUnit.equal(context.unitGeneratorGraph.ugenList.nodes.length,
            spec.expected.all,
            spec.msg + ", there should be " + spec.expected.all +
                " all ugens.");
        QUnit.equal(Object.keys(context.unitGeneratorGraph.ugenList.namedNodes).length,
            spec.expected.named,
            spec.msg + ", there should be " + spec.expected.named +
                " named ugens.");
    });
});

// QUnit.test("flock.ugenNodeList.replace(): reattach inputs", function () {
//     var synth = flock.synth({
//         synthDef: nestedSynthDef
//     });

//     var toReplace = synth.nodeList.namedNodes.gerbil,
//         expectedInput = synth.nodeList.namedNodes.ear,
//         newUGen = flock.interpret.ugenForDef({
//             id: "gerbil",
//             ugen: "flock.test.ugen.mock"
//         });
//     flock.ugenNodeList.swapTree(synth.nodeList, newUGen, toReplace);

//     QUnit.equal(synth.nodeList.namedNodes.gerbil, newUGen,
//         "The old ugen should have been replaced by the new one.");
//     QUnit.equal(synth.nodeList.namedNodes.gerbil.inputs.ear, expectedInput,
//         "The old ugen's input should have been copied over to the new one.");
// });

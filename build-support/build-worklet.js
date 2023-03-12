const concat = require("concat");

let files = [
    // Infusion
    "src/web/jquery.standalone-worklet.js",
    "node_modules/infusion/src/framework/core/js/Fluid.js",
    "node_modules/infusion/src/framework/core/js/FluidDebugging.js",
    "node_modules/infusion/src/framework/core/js/FluidPromises.js",
    "node_modules/infusion/src/framework/core/js/DataBinding.js",
    "node_modules/infusion/src/framework/core/js/FluidIoC.js",
    "node_modules/infusion/src/framework/core/js/ModelTransformation.js",
    "node_modules/infusion/src/framework/core/js/ModelTransformationTransforms.js",

    // Flocking
    "src/core.js",
    "src/paths.js",
    "src/audio-environment.js",
    "src/node-list.js",
    "src/interpreter.js",
    "src/unit-generator-graph.js",
    "src/evaluators.js",
    "src/ugens/core.js",
    "src/ugens/oscillators.js",
    "src/web/audio-worklet-processor.js",

    // Conformance to contemporary corporate development orthodoxy
    "build-support/js/es-module-footer.js"
];

let destination = "dist/flocking-audioworklet.js";
concat(files, destination).then(function (result) {
    console.log("Audio Worklet build successfully written to " + destination);
});

// TODO: Use Terser to minify and create source maps.

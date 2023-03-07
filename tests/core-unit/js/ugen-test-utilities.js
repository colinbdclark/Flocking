/*!
* Flocking Unit Generator Test Utilities
* https://github.com/lichen-community-systems/flocking
*
* Copyright 2011-2023, Colin Clark
* Released under the terms of the MIT license.

*/

fluid.registerNamespace("flock.test.ugen");

flock.test.ugen.mock = function (inputs, output, options) {
    var that = flock.ugen(inputs, output, options);
    that.didOnInputChangedFire = false;

    that.gen = function (numSamps) {
        if (that.options.gen) {
            that.options.gen(that, numSamps);
        } else if (that.options.buffer){
            for (var i = 0; i < numSamps; i++) {
                that.output[i] = that.options.buffer[i];
            }
        }
    };

    that.onInputChanged = function () {
        that.didOnInputChangedFire = true;
    };

    that.reset = function () {
        that.didOnInputChangedFire = false;
    };

    return that;
};

flock.ugenDefaults("flock.test.ugen.mock", {
    rate: "audio",
    inputs: {},
    ugenOptions: {}
});


flock.test.ugen.mockWithInputs = function (inputs, output, options) {
    var that = flock.ugen(inputs, output, options);

    that.gen = function (numSamps) {
        that.wasGenCalled = true;
    };

    that.onInputChanged = function () {
        that.didOnInputChangedFire = true;
    };

    that.reset = function () {
        that.didOnInputChangedFire = false;
        that.wasGenCalled = false;
    };

    that.reset();
    return that;
};

flock.ugenDefaults("flock.test.ugen.mockWithInputs", {
    rate: "audio",
    inputs: {
        freq: 440,
        phase: 0.0,
        table: []
    },
    ugenOptions: {
        model: {
            value: 0.0
        },
        strideInputs: ["freq"]
    },
    tableSize: 8192
});

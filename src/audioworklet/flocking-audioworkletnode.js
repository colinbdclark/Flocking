/*
 * Flocking AudioWorkletNode
 * https://github.com/colinbdclark/flocking
 *
 * Copyright 2019, Colin Clark
 * Released under the terms of the MIT license.
 */

/*global AudioWorkletNode*/
/*jshint esversion:6*/

class FlockingAudioWorkletNode extends AudioWorkletNode { // jshint ignore:line
    constructor (context) {
        super(context, "flocking-processor");
    }
}

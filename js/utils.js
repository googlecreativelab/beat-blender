// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


export const copyToClipboard = (target)=>{
    var currentFocus = document.activeElement;
    target.select();
    target.setSelectionRange(0, target.value.length);

    // copy the selection
    var succeed;
    try {
        succeed = document.execCommand('copy');
        console.log(succeed);
    } catch(e) {
        succeed = false;
        console.log(e);
    }
    // restore original focus
    if (currentFocus && typeof currentFocus.focus === 'function') {
        currentFocus.focus();
    }

    return succeed;
};

/**
 * true if these objects have the same shallow value for the key provided
 * @param {Object} a
 * @param {Object} b
 * @param {string} key
 * @return {boolean} true if key is equal to each other
 */
export const keyEqual = (a, b, key)=> a[key] === b[key];


/**
 * true if these objects have a different shallow value for the key provided
 * @param {Object} a
 * @param {Object} b
 * @param {string} key
 * @return {boolean} true if key is not equal to each other
 */
export const keyNotEqual = (a, b, key)=> !keyEqual(a, b, key);


export const allKeysEqual = (a, b, keyArray)=>{
    for(let i=0; i<keyArray.length; i++){
        //exit as soon as a difference is found
        if(keyNotEqual(a, b, keyArray[i])){
            return false;
        }
    }
    return true;
};


/**
 * true if any provided key has a different shallow value between objects
 * @param {Object} a
 * @param {Object} b
 * @param {string[]} [keyArray] keys to test or will test all
 * @return {boolean} true if any value does not match strict equality
 */
export const anyKeyNotEqual = (a, b, keyArray)=>
    !!(keyArray || Object.keys(a)).filter(k=> keyNotEqual(a, b, k)).length;


export const clamp = (val, min, max)=> Math.max(Math.min(val, max), min);


/**
 * linear interpolation
 * @param {Number} start
 * @param {Number} end
 * @param {Number} amt
 * @returns {Number}
 */
export const lerp = (start, end, amt) =>
    (1 - amt) * start + amt * end;

/**
 * Linearly interpolate a 2D vector
 * @param {{x:Number, y:Number}} start
 * @param {{x:Number, y:Number}} end
 * @param {Number} amt
 * @returns {{x:Number, y:Number}}
 */
export const lerpPoint = (start, end, amt) =>
    ({
        x: (1 - amt) * start.x + amt * end.x,
        y: (1 - amt) * start.y + amt * end.y
    });


/**
 * lerp 2 arrays
 * example: lerpArray([255, 128, 64], [0, 0, 0], 0.5) -> [128, 64, 32]
 * @param {Array<Number>} arrA
 * @param {Array<Number>} arrB
 * @param {Number} amt
 * @param {Array<Number>} [arrC] optionally provide the result array
 */
export const lerpArray = (arrA, arrB, amt, arrC=[])=>{
    const len = Math.min(arrA.length, arrB.length);
    for(let i=0; i<len; i++){
        arrC[i] = lerp(arrA[i], arrB[i], amt);
    }
    return arrC;
};

/**
 * Calculate the distance between two 2D vectors
 * @param {{x:Number, y:Number}} a
 * @param {{x:Number, y:Number}} b
 * @returns {Number}
 */
export const distance = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Given `points` find the closest to `pt`
 * @param {Array<{x:Number, y:Number}>} points
 * @param {{x:Number, y:Number}} pt
 * @returns {x:Number, y:Number}}
 */
export const closestPoint = (points, pt) => {
    let closestPoint = null;
    let closestDistance = Number.MAX_VALUE;
    points.forEach((currPoint) => {
        const dist = distance(pt, currPoint);
        if (dist < closestDistance) {
            closestPoint = currPoint;
            closestDistance = dist;
        }
    });
    return closestPoint;
};


export const hash = (x) => {
    var nx = x * 1.380251;
    var n = Math.floor(nx);
    var f = nx - n;
    var h = 355.347391 * f + n * 5.3794610581 + 41.53823;
    h = h * h + f * h + f * f * 37.3921539 + 0.3861203;
    var nf = Math.floor(h);
    return h - nf;
};

export const smoothNoise = (x) => {
    var n = Math.floor(x);
    var f = x - n;
    var n2 = n + 1;
    var h1 = hash(n);
    var h2 = hash(n2);
    var smooth = f * f * (3 - 2 * f);
    return h1 * (1 - smooth) + h2 * smooth;
};

/**
 * generate fractal noise
 * @param {Number} x
 * @returns {number}
 */
export const fractalNoise = (x) => {
    var p = x + 11.3951031;
    var amp = 0.7;
    var scale = 10.0;
    var result = 0.0;
    for (var i = 0; i < 6; i++) {
        result += amp * smoothNoise(p * scale);
        amp *= 0.5;
        scale *= 2.0;
    }

    return result;
};


/**
 * Used to generate an array of numbers between `start` and `stop`
 * i.e. range(1, 5) = [1,2,3,4]
 * @param {Number} start
 * @param {Number} stop
 * @returns {Array<Number>}
 */
export const range = function(start, stop){
    //if only one argument is provided it was the stop
    if (arguments.length === 1) {
        stop = start;
        start = 0;
    }
    const arr = [];
    for (; start < stop; start++) {
        arr.push(start);
    }
    return arr;
};

/**
 * invoke `fn`, `n` times and collect the result
 * @param {Number} n
 * @param {Function} fn
 * @returns {Array}
 */
export const times = (n, fn)=>{
    const result = [];
    for(let i=0; i<n; i++){
        result[i] = fn(i, n);
    }
    return result;
};


export const lerpBetweenPoints = (a, b, t, out={})=>{
    out.x = lerp(a.x, b.x, t);
    out.y = lerp(a.y, b.y, t);
    return out;
};
/**
 * map a value from one range of numbers to another,
 * i.e. scalemap(0.5, 0, 2, 10, 20) = 15
 * @param value
 * @param start1
 * @param stop1
 * @param start2
 * @param stop2
 * @returns {*}
 */
export const scalemap = (  value,  start1,  stop1,  start2,  stop2 )=>
    start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));

export const pathLength = (path)=>
    path.reduce((sum, pt, i, arr)=>
        i===0 ? sum : sum + distance(arr[i-1], arr[i]), 0);


/**
 * find the point at `t` along the `path` points
 * @param {Array<{x:Number, y:Number}>} path
 * @param {Number} t
 * @param {Object} [out] optionally provide an object to mutate
 * @returns {Object}
 */
export const lerpPath = (path, t, out={})=>{

    t = clamp(t, 0, 1);

    if(t === 0 || path.length < 2){
        return path[0];
    }
    if(t === 1){
        return path[path.length-1];
    }

    const totalLength = pathLength(path);
    const wantedLength = totalLength * t;

    let lastLength = 0;
    let currLength = 0;
    let a, b;

    for(let i=1; i<path.length; i++){
        a = path[i-1];
        b = path[i];
        currLength += distance(a, b);

        if(currLength >= wantedLength){
            break;
        }
        lastLength = currLength;
    }

    const relativeLerp = scalemap(wantedLength, lastLength, currLength, 0, 1);

    return lerpBetweenPoints(a, b, relativeLerp, out);
};


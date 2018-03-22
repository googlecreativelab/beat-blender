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


import { lerpArray, times } from '../utils';
import assert from 'assert';

/**
 * Generate a gradient that interopolates across 2 dimensions
 * @param {Array<Number>} tl top-left color
 * @param {Array<Number>} tr top-right color
 * @param {Array<Number>} bl bottom-left color
 * @param {Array<Number>} br bottom-right color
 * @param {Number} columns
 * @param {Number} rows
 */
export const generate4PointGradient = (tl, tr, bl, br, columns, rows)=>{
    return times(columns, (x,columns)=>{
        const cp = x / (columns-1);
        const topColor = lerpArray(tl, tr, cp);
        const bottomColor = lerpArray(bl, br, cp);

        return times(rows, (y, rows)=>{
            const rp = y/ (rows-1);
            return lerpArray(topColor, bottomColor, rp);
        });
    });
};


// reuse these arrays always to avoid extra garbage collection
const lerpTmpTop = [];
const lerpTmpBot = [];

const shrinkToLength = (arr, length)=>{
    let attempts = 0;
    const maxAttempts = 10000;
    while(arr.length > length && attempts < maxAttempts){
        arr.pop();
        attempts++;
    }
    assert(attempts < maxAttempts, 'maxAttempts reached, Wow, somehow that array got really full');
    return arr;
};

/**
 * generate a 4-point gradient for one specified cell
 * @param {Array<Number>} tl top-left color
 * @param {Array<Number>} tr top-right color
 * @param {Array<Number>} bl bottom-left color
 * @param {Array<Number>} br bottom-right color
 * @param {Number} percentX percent between 0-1
 * @param {Number} percentY perecent between 0-1
 * @returns {Array<Number>}
 */
export const generate4PointGradientAt = (tl, tr, bl, br, percentX, percentY, result=[])=>{
    //empty any extras (this shouldn't ever actually happen)
    shrinkToLength(lerpTmpTop, tl.length);
    shrinkToLength(lerpTmpBot, tl.length);
    const topColor = lerpArray(tl, tr, percentX, lerpTmpTop);
    const bottomColor = lerpArray(bl, br, percentX, lerpTmpBot);
    return lerpArray(topColor, bottomColor, percentY, result);
};


/**
 * Generate a gradient that
 * @param {Array<Number>} tl top-left color
 * @param {Array<Number>} tr top-right color
 * @param {Array<Number>} bl bottom-left color
 * @param {Array<Number>} br bottom-right color
 * @param {Array<Number>} center center color
 * @param {Number} columns
 * @param {Number} rows
 */
export const generate5PointGradient = (tl, tr, bl, br, center, columns, rows)=>{
    return times(columns, (x,columns)=>{
        const cp = x / (columns-1);
        const topColor = lerpArray(tl, tr, cp);
        const bottomColor = lerpArray(bl, br, cp);

        return times(rows, (y, rows)=>{
            const rp = y/ (rows-1);
            const color = lerpArray(topColor, bottomColor, rp);
            const dc = (x - ~~(columns/2)) / columns;
            const dr = (y - ~~(rows/2)) / rows;
            const dist = Math.sqrt(dc*dc + dr*dr);

            return lerpArray(color, center, 1.0 - dist*2);
        });
    });
};


const numberComparator = (f1,f2)=>{
    if(f1 == f2) return 0;
    if(f1 < f2) return -1;
    if(f1 > f2) return 1;
};

const INV60DEGREES = 60.0 / 360;

export const rgbToHSV = ([r, g, b])=>{
    const hsv = [];
    var h = 0,
        s = 0,
        v = Math.max(r, g, b),
        d = v - Math.min(r, g, b);

    if (v !== 0) {
        s = d / v;
    }

    if (s !== 0) {
        if( numberComparator( r, v ) === 0 ){
            h = (g - b) / d;
        } else if ( numberComparator( g, v ) === 0 ) {
            h = 2 + (b - r) / d;
        } else {
            h = 4 + (r - g) / d;
        }
    }
    h *= INV60DEGREES;
    if (h < 0) {
        h += 1.0;
    }
    hsv[0] = h;
    hsv[1] = s;
    hsv[2] = v;

    return hsv;
};



/**
 * Converts HSV values into RGB array.
 * @param h
 * @param s
 * @param v
 * @return rgb array
 */
export const hsvToRGB = ([h, s, v])=>{
    const rgb = [];
    if(s === 0.0){
        rgb[0] = rgb[1] = rgb[2] = v;
    } else {
        h /= INV60DEGREES;
        var i =  parseInt(h,10),
            f = h - i,
            p = v * (1 - s),
            q = v * (1 - s * f),
            t = v * (1 - s * (1 - f));

        if (i === 0) {
            rgb[0] = v;
            rgb[1] = t;
            rgb[2] = p;
        } else if (i == 1) {
            rgb[0] = q;
            rgb[1] = v;
            rgb[2] = p;
        } else if (i == 2) {
            rgb[0] = p;
            rgb[1] = v;
            rgb[2] = t;
        } else if (i == 3) {
            rgb[0] = p;
            rgb[1] = q;
            rgb[2] = v;
        } else if (i == 4) {
            rgb[0] = t;
            rgb[1] = p;
            rgb[2] = v;
        } else {
            rgb[0] = v;
            rgb[1] = p;
            rgb[2] = q;
        }
    }
    return rgb;
};


export const toCSSString = (color)=>
    `rgba(${~~color[0]},${~~color[1]},${~~color[2]}, ${(color[3]||1)})`;

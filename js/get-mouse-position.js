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

/**
 * get-mouse-position is a reliable way to get the current mouse
 * position relative to the element provided, considering all offest
 * @example getMousePosition(domElement, event): {x, y}
 */

//window has a circular window.window reference
var isWindow = function( elem ){
    return elem !== null && elem === elem.window;
};

var getWindow = function( elem ){
    return isWindow(elem) ? elem : elem.nodeType === 9 ? elem.defaultView || elem.parentWindow : false;
};

//calculate the page-offset of the element
/**
 * calculate the offset of an element
 * @param {HTMLElement} element
 * @return { x:Number, y: Number }
 */
export function offset( elem, ignoreWindowOffset ){
    //true if not explicitly false
    ignoreWindowOffset = (ignoreWindowOffset === true);
    var docElem,
        win,
        box = {
            top: 0,
            left: 0
        },
        doc = elem && elem.ownerDocument;

    box.x = box.left;
    box.y = box.top;

    if (!doc) {
        return box;
    }

    docElem = doc.documentElement;

    // Make sure it's not a disconnected DOM node
    if (!document.body.contains(elem)) {
        return box;
    }

    // If we don't have gBCR, just use 0,0 rather than error
    // BlackBerry 5, iOS 3 (original iPhone)
    if (typeof elem.getBoundingClientRect !== 'undefined') {
        box = elem.getBoundingClientRect();
        box.x = box.left;
        box.y = box.top;
    }
    win = getWindow(doc);
    var page = { x: 0, y: 0 };
    if( !ignoreWindowOffset ){
        page.y = win.pageYOffset || docElem.scrollTop;
        page.x = win.pageXOffset || docElem.scrollLeft;
    }

    const box2 = {};
    Object.assign(box2, box);

    box2.top = box.y = box.top + page.y - (docElem.clientTop || 0);
    box2.left = box.x = box.left + page.x - (docElem.clientLeft || 0);
    /*box.top = box.y = box.top + win.pageYOffset - docElem.clientTop;
    box.left = box.x = box.left + win.pageXOffset - docElem.clientLeft;*/

    return box2;
}


/**
 * get the mouse position within the provided HTMLElement
 * @param {HTMLElement} element
 * @param {Event} event this requires to an event object
 * @param {Boolean} [ignoreWindowOffset] optionally ignore the window.pageYOffset
 * @return { x:Number, y:Number, toString:Function }
 */
export default function getMousePosition(element, event, ignoreWindowOffset, point={} ){
    const off = offset(element, ignoreWindowOffset);
    if( event.touches && event.touches.length === 1 ){
        event = event.touches[0];
    }

    point.x = event.clientX - off.left;
    point.y = event.clientY - off.top;
    return point;
}

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
 * this modules responsibility is to set breakpoints for the view and apply a css-style
 * for its appropriate dimensions
 */


export const DESKTOP = 'desktop';
export const MOBILE_PORTRAIT = 'mobile-portrait';
export const MOBILE_LANDSCAPE = 'mobile-landscape';
export const TABLET = 'tablet';


const queries = [
    ['(max-width: 479px)', MOBILE_PORTRAIT],
    ['(orientation: landscape) and (max-height: 440px)', MOBILE_LANDSCAPE],
    ['(max-width: 991px)', TABLET]
];

export function is(layout){
    return get() === layout;
}

export function get(){
    if(!window.matchMedia){
        //possibly a really old browser, if so its desktop
        return DESKTOP;
    }

    for(let i=0; i<queries.length; i++){
        const q = queries[i];
        if(window.matchMedia(q[0]).matches){
            return q[1];
        }
    }
    return DESKTOP;
}

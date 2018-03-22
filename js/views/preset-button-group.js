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

import { View } from './base-view';
import assert from 'assert';

let isSafari =  !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/) || /(CriOS)/i.test(navigator.userAgent);


const same = (a, b)=>{
    if(!a || !b || a.length !== b.length){
        return false;
    }
    for(let i=0; i<a.length; i++){
        if(a[i] !== b[i]){
            return false;
        }
    }
    return true;
};



const template = ({ encodedSequences, selectedCornerIndex, cornerIndices, presetBeats })=>
    `<h3>PRESET BEATS</h3>
    ${button('Generate New Beat', `preset-button generate-new-beat-button ${isSafari? 'isSafari' : ''}`)}
    ${Object.keys(presetBeats).map(key=> button(key, 'preset-button ' + (same(encodedSequences[cornerIndices[selectedCornerIndex]], presetBeats[key]) ? 'active' : ''))).join('')}`;

// the html to repeat for every preset
const button = (text, classList)=>`
    <button class="${classList}" data-value="${text}">${text}</button>`;



export class PresetButtonGroup extends View {

    constructor(domElement){
        super(domElement);

        this._setEventMap({
            'click .preset-button': (event, state)=>{
                if(event.target.classList.contains('generate-new-beat-button')) {
                    this.emit('generate-new-beat', this);
                } else {
                    const attr = event.target.attributes['data-value'];
                    assert(attr && attr.value, 'Preset Button did not have a data-value attribute');
                    const beat = state.presetBeats[attr.value];
                    this.emit('click', this, attr.value, beat);
                }
            }
        });
    }

    shouldComponentUpdate(state, previousState) {
        const i = state.cornerIndices[state.selectedCornerIndex];
        return state.selectedCornerIndex !== previousState.selectedCornerIndex ||
            (!same(state.encodedSequences[i], previousState.encodedSequences[i]) && state.selectedCornerIndex > -1);
    }

    /**
     * render the provided presets
     * @param {Object} key becomes label, value (Array) is beats
     * @return itself
     */
    render(state, previousState){
        this.domElement.classList[state.selectedCornerIndex > -1 ? 'add' : 'remove']('active');
        this.domElement.innerHTML = template(state);
        return super.render(state, previousState);
    }
}

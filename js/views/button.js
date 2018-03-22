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

import debounce from 'debounce';

import {  View } from './base-view';
import throttle from 'throttleit';
import * as playModes from '../models/play-modes';
import { anyKeyNotEqual } from '../utils';

const editTemplate = ()=>`
    <button class="undo-edit edit-sequencer-button">UNDO</button>
    <button class="clear-edit edit-sequencer-button">CLEAR</button>`;


export class EditModeGroup extends View {

    constructor(domElement){
        super(domElement);
        this._setEventMap({
            'click .save-edit': ()=> this.emit('save', this),
            'click .undo-edit': ()=>this.emit('undo', this),
            'click .clear-edit': ()=>this.emit('clear', this)
        });
    }

    shouldComponentUpdate(state, last) {
        const sci = state.selectedCornerIndex;
        const lsci = last.selectedCornerIndex;
        return sci != lsci;// || (state.editHistory[sci] &&  (state.editHistory[sci][0] !== last.editHistory[sci][0]));
    }

    render(state) {

        if(state.selectedCornerIndex > -1) {
            this.domElement.classList.add('active');
        } else {
            this.domElement.classList.remove('active');
        }

        this.domElement.innerHTML = editTemplate(state);
    }
}


export class ToggleButton extends View {
    constructor(domElement, shouldBeActive){
        super(domElement);
        this._shouldBeActive = shouldBeActive;
        this.__active = false;

        this._setEventMap({
            'click': ()=> this.emit('click', this)
        });
    }

    set active(val){
        const c = 'active';
        if(val !== this.domElement.classList.contains(c)){
            this.domElement.classList[val ? 'add' : 'remove'](c);
        }
    }

    get active(){
        return this.domElement.classList.contains('active');
    }

    render(state, last){
        this.active = this._shouldBeActive(state, last);
        return this;
    }
}





export class CustomizeBeatsButton extends ToggleButton {

    constructor(domElement, shouldBeActive){
        super(domElement, shouldBeActive);
        // this.domElement.innerHTML = bpmSliderTemplate();
        this._setEventMap({
            //dont let this be repeatedly clicked quickly
            'click' : debounce((event, state) => {
                if(state.selectedCornerIndex >=0) {
                    this.emit('done', this);
                } else {
                    this.emit('edit', this);
                }

            }, 120, true)
        });
    }

    shouldComponentUpdate(state, last) {
        return state.selectedCornerIndex !== last.selectedCornerIndex ||
            state.gridAnimationLerp  !== last.gridAnimationLerp ||
            state.interpolating !== last.interpolating;
    }

    render(state) {

        const isBusy = state.interpolating || state.gridAnimationLerp > 0 && state.gridAnimationLerp < 1;
        //if the grid is animating, dont let the button be clicked
        this.domElement.classList[ isBusy ? 'add' : 'remove' ]('disabled');

        // if(state.selectedCornerIndex === last.selectedCornerIndex){
        //     //already up to date
        //     return;
        // }
        if(isBusy) {
            this.domElement.innerHTML = 'LOADING...';
        } else if(state.selectedCornerIndex >=0) {
            this.domElement.innerHTML = 'DONE';
            this.domElement.classList.add('active');
        } else {
            this.domElement.innerHTML = 'EDIT CORNERS';
            this.domElement.classList.remove('active');
        }
    }
}


const dragDrawTemplate = (labelA, labelB)=>`
    <span class="toggle-label toggle-label-a">${labelA}</span>
    <div class="toggle-button">
        <div class="toggle-slider"></div>
    </div>
    <span class="toggle-label toggle-label-b">${labelB}</span>`;



export class DragDrawToggle extends View {
    constructor(domElement){
        super(domElement);
        this.domElement.innerHTML = dragDrawTemplate('DRAG', 'DRAW');
        this._setEventMap({
            'click': ()=> this.emit('click', this)
        });
    }


    shouldComponentUpdate(state, last){
        return anyKeyNotEqual(state, last, ['selectedCornerIndex', 'playMode']);
    }

    render({ playMode, selectedCornerIndex }){
        //const { selectedCornerIndex } = state;
        this.domElement.classList[ playMode === playModes.PATH ? 'add' : 'remove' ]('right-selected');
        this.domElement.classList[ selectedCornerIndex === -1 ? 'add' : 'remove']('active');
        /*const isOn = selectedCornerIndex > -1;
        Object.assign(this.domElement.style, {
            pointerEvents: isOn ? 'all' : 'none',
            opacity: isOn ? 0.5 : 1,
            cursor: isOn ? 'pointer' : 'inherit'
        });*/

        return this;
    }
}


const bpmSliderTemplate = ()=>`
    <svg class="bpm-slider-button toggle-button" viewBox="0 0 50 40">
        <g id="pendulumWrapper">
            <g id="pendulum">
                <line class="bpm-icon-line" x1="5" x2="25" y2="27" y1="10"></line>
                <circle class="bpm-icon-circle" cx="7" cy="12" r="3"></circle>
            </g>
        </g>
    </svg>
    <div class="bpm-slider-container">
        <input class="bpm-slider-range" type="range" min="1" max="200" step="1">
        <span class="toggle-label bpm-slider-label">120</span>
    </div>`;


export class BPMSlider extends ToggleButton {

    constructor(domElement, shouldBeActive){
        super(domElement, shouldBeActive);
        this.domElement.innerHTML = bpmSliderTemplate();
        this.pendulum = document.getElementById('pendulumWrapper');
        this.__label = document.querySelector('.bpm-slider-label');
        this._setEventMap({
            'click .bpm-slider-button': ()=> this.emit('click', this),
            //when the bpm slider moves
            'input input[type="range"]': throttle((event)=> {
                let bpmValue = parseInt(event.target.value, 10);
                this.emit('change', this, bpmValue);
            }, 1000 / 15)
        });
    }

    // shouldComponentUpdate(state, last) {
    // if(last.sequence === undefined) return false;
    // return state.sequence.activeColumn !== last.sequence.activeColumn;
    // }

    render(state, last){
        if(state.bpm !== last.bpm) {
            this.__label.innerHTML = state.bpm;
        }

        //percent through the sequence * PI
        const perc = state.sequence.activeColumn / state.sequence.columns * Math.PI;
        // there are 4 beats per measure
        const beats = 4;
        //how many degrees should this fluctuate (on each side of the cneter)
        const amp = 45;

        //add the amp at the end so its based on the center
        const angle = (Math.sin(perc * beats) ) * amp + amp;

        this.pendulum.style.transform = `rotate(${angle}deg)`;
        return super.render(state, last);
    }
}

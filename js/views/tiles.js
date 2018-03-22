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
import { toCSSString } from '../models/color';
import * as grid2d  from 'grid2d';
import { anyKeyNotEqual } from '../utils';
import { MOBILE_PORTRAIT } from '../models/responsive';


/**
 * recursively search the children elements for the child,
 * repeating the task on `parentElement`
 * @param {HTMLCollection} children
 * @param {HTMLElement} child
 * @return {Number} index of the child in the parentElement
 */
const getChildIndex = (children, child)=>{
    if(!child){
        return -1;
    }
    for(let i=0; i<children.length; i++){
        if(child === children[i]){
            return i;
        }
    }
    //check if its the parent we are looking for
    return getChildIndex(children, child.parentElement);
};


const findIndexForInput = (el, depth = 0, maxDepth = 5) =>{
    const foundCorners = this.cornerOrder.filter(corner => el.classList.contains(corner));
    if (foundCorners.length || depth > maxDepth) {
        return foundCorners[0];
    }
    return findIndexForInput(el.parentElement, depth++);
};


export class Corners extends View {


    constructor(domElement) {
        super(domElement);
        const el = this.domElement;

        this.cornerOrder = ['tl', 'tr', 'bl', 'br'];

        this._setEventMap({
            'click': (event)=>{
                event.preventDefault();
                const i = getChildIndex(el.children, event.target);
                if(i > -1) {
                    this.emit('click', this, i);
                }
            },
            'mouseenter': (event)=> event.target.children[0].classList.add('edit'),
            'mouseleave': (event)=> event.target.children[0].classList.remove('edit')
        });
    }

    shouldComponentUpdate(state, last){
        return anyKeyNotEqual(state, last, ['innerWidth', 'innerHeight', 'selectedCornerIndex']);
    }

    render(state){

        const cw = grid2d.cellWidth(state.layoutGrid);
        //const ch = grid2d.cellHeight(state.layoutGrid);
        const li = state.layoutItems.gridContainer;

        const tW = state.layout === MOBILE_PORTRAIT ? state.innerWidth : cw * (li[1].column - li[0].column) * state.innerWidth;

        const w = ~~(grid2d.cellWidth(state.grid) * tW);

        const calcBorder = (index)=>
            state.selectedCornerIndex === index ? '4px solid white' : 'none';

        this.domElement.style.display = (state.selectedCornerIndex === -1) ? 'none' : 'block';

        this.domElement.innerHTML = this.cornerOrder
            .map((corner, index)=>{
                const color = toCSSString(state.gradient[index]);
                const border = calcBorder(index);
                return `
                <div class="corner tile ${corner}" style="/*background-color: ${color};*/ border: ${border}; width: ${w}px; height: ${w}px">
                    <span class="corner-label">${(index+1)}</span>
                    <div class="corner-background"></div>
                </div>`;
            })
            .join('');
    }

}


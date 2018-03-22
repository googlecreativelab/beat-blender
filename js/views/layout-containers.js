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

import * as grid2d from 'grid2d';
import { View } from './base-view';
import { MOBILE_PORTRAIT } from '../models/responsive';

/**
 * These layout containers are responsible for watching
 * the `state.layoutGrid` and adapting their dimensions to their item
 */

const li = (s, l, item, i)=>
    s.layoutItems[item][i].column !== !l.layoutItems[item][i].column ||
    s.layoutItems[item][i].row !== l.layoutItems[item][i].row;

const changed = (s, l, item)=>
    s.innerWidth !== l.innerWidth ||
    s.innerHeight !== l.innerHeight ||
    s.layoutItems && !l.layoutItems ||
    li(s, l, item, 0) ||
    li(s, l, item, 1);


/**
 * GridContainer is the element containing the gradient grid (grid.js)
 * and 4 editable corners (tiles.js)
 */
export class GridContainer extends View {

    constructor(domElement){
        super(domElement);
    }

    shouldComponentUpdate(state, last){
        return changed(state, last, 'gridContainer');
    }

    render(state){

        if(state.layout === MOBILE_PORTRAIT){
            Object.assign(this.domElement.style, {
                position: 'relative',
                top: 0,
                left: 0,
                width: '100%',
                height: 'auto'
            });

            return;
        }

        const cw = grid2d.cellWidth(state.layoutGrid);
        const ch = grid2d.cellHeight(state.layoutGrid);
        const li = state.layoutItems.gridContainer;

        const width = `${cw * (li[1].column - li[0].column) * state.innerWidth}px`;

        Object.assign(this.domElement.style, {
            position: 'absolute',
            left: `${cw * li[0].column * state.innerWidth}px`,
            top: `${ch * li[0].row * state.innerHeight}px`,
            width,
            height: width
        });
    }
}



/**
 * SequencerContainer is the container holding
 * the editable sequencer, the presets and the button
 */
export class SequencerContainer extends View {

    constructor(domElement){
        super(domElement);
    }

    shouldComponentUpdate(state, last){
        return changed(state, last, 'sequencerContainer');
    }

    render(state){

        if(state.layout === MOBILE_PORTRAIT){
            Object.assign(this.domElement.style, {
                position: 'relative',
                top: 0,
                left: 0,
                width: '100%',
                height: `${state.innerHeight}px`
            });

            return;
        }

        const cw = grid2d.cellWidth(state.layoutGrid);
        const ch = grid2d.cellHeight(state.layoutGrid);
        const li = state.layoutItems.sequencerContainer;

        Object.assign(this.domElement.style, {
            position: 'absolute',
            left: `${cw * li[0].column * state.innerWidth}px`,
            top: `${ch * li[0].row * state.innerHeight}px`,
            width: `${cw * (li[1].column - li[0].column) * state.innerWidth}px`,
            height: `${ch * (li[1].row - li[0].row) * state.innerHeight}px`
        });

    }
}

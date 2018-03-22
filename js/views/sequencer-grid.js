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
import { dpr, setCanvasSize, renderGrid } from '../canvas-utils';
import getMousePosition from '../get-mouse-position';
import { notesToMatrix } from '../samples';
import { times, lerpArray } from '../utils';
import * as responsive from '../models/responsive';


export class SequencerGridView extends View {

    constructor(domElement){
        super(domElement || document.createElement('canvas'));

        this.context = this.domElement.getContext('2d');

        let mouseDown = false;
        const pt = {};
        let lastIndex = -1;


        const onMouseDown = (event, { selectedCornerIndex, sequence })=>{
            mouseDown = true;
            //only toggle if the grid is in editable mode with a corner selected
            if(selectedCornerIndex < 0){
                return;
            }

            if(event.touches && event.touches.length){
                event.preventDefault();
            }

            const scaledGrid = grid2d.scale(sequence, this.domElement.clientWidth, this.domElement.clientHeight);
            getMousePosition(this.domElement, event, true, pt);

            const cellIndex = grid2d.closestCellIndex(scaledGrid, pt);
            if(cellIndex > -1){
                //flip it and make a boolean
                const pos = grid2d.cellPosition(scaledGrid, cellIndex);
                lastIndex = cellIndex;
                this.emit('toggle', this, pos, cellIndex);
            }
        };

        const onMouseLeave = () => {
            this.emit('mouseleave', this);
        };

        const onMouseMove = (event, { selectedCornerIndex, sequence })=>{
            //only toggle if the grid is in editable mode with a corner selected
            if(selectedCornerIndex < 0){
                return;
            }

            if(event.touches && event.touches.length){
                //touchstart might not get triggered first
                mouseDown = true;
                event.preventDefault();
            }

            const scaledGrid = grid2d.scale(sequence, this.domElement.clientWidth, this.domElement.clientHeight);
            getMousePosition(this.domElement, event, true, pt);

            const cellIndex = grid2d.intersectsCellIndex(scaledGrid, pt);

            if(cellIndex > -1){
                const pos = grid2d.cellPosition(scaledGrid, cellIndex);
                if(mouseDown){
                    if(cellIndex !== lastIndex){
                        this.emit('toggle', this, pos, cellIndex);
                        lastIndex = cellIndex;
                    }
                } else {
                    //we are on a cell, mouse is not down and we don't care if it was the last one
                    this.emit('hover', this, pos, cellIndex);
                }
            }
        };


        const onMouseUp = ()=> mouseDown = false;


        this._setEventMap({
            'mouseover'  : (event)=> event.target.title && (event.target.title = ''),
            //dont bind to both (it will get triggered twice), touch if available
            [window.ontouchstart ? 'touchstart' : 'mousedown']  : onMouseDown,
            'mousemove'  : onMouseMove,
            'mouseleave'  : onMouseLeave,
            'mouseup'    : onMouseUp,
            'touchmove'  : onMouseMove,
            'touchend'   : onMouseUp
        });

    }

    render(state, last){

        if(state.innerWidth !== last.innerWidth || state.innerHeight !== last.innerHeight){
            //resize
            const width = state.layout === responsive.MOBILE_PORTRAIT ? state.innerWidth : state.innerWidth * 0.5 * 0.8;
            setCanvasSize(this.domElement,  width, width/2);
        }

        const c = this.context;
        const {
            sequence,
            encodedSequences,
            selectedIndex,
            selectedCornerIndex
        } = state;

        this.domElement.style.cursor = selectedCornerIndex >= 0 ? 'pointer' : 'inherit';

        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
        const matrix = notesToMatrix(encodedSequences[selectedIndex], sequence.columns, sequence.rows);

        const { colorOn, colorOff } = sequence;
        /*
        const colorOn = sequence.selectedCornerIndex >= 0 ? state.gradient[sequence.selectedCornerIndex] : sequence.colorOn;
        const colorOff = sequence.colorOff;*/

        const colors = times(sequence.columns, (x)=>{
            let opacity = x === sequence.activeColumn ? 1 : (x/8 % 2 < 1) ? 0.33 : 0.2;
            if(selectedCornerIndex >= 0){
                opacity += 0.2;
            }

            return times(sequence.rows, (y)=> !!matrix[x][y] ?
                [colorOn[0], colorOn[1], colorOn[2], opacity] :
                [colorOff[0], colorOff[1], colorOff[2], opacity]
            );
        });


        const getColor = (x,y)=>{
            const hovCR = state.sequence.hoverCellPosition;
            const c = colors[x][y];
            if(hovCR && hovCR.column === x && hovCR.row === y){
                return lerpArray(c, colorOn, 0.25);
                //return [c[0], c[1], c[2], c[3] + 0.4];
            }
            return c;
        };

        renderGrid(c, sequence, getColor, c.canvas.width/dpr(), c.canvas.height/dpr(), ()=>true, v=>v);

        return this;
    }
}


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

/**
 * render the `state.layoutGrid` on top of the page,
 * useful for debugging positioning at different resolutions
 * this module is mainly just for fun tbh :)
 */


export class DebugLayoutGrid extends View {

    constructor(color='rgba(255,128,128,1)'){
        super(document.createElement('canvas'));
        this.ctx = this.domElement.getContext('2d');
        this.color = color;
    }

    shouldComponentUpdate(state, last){
        const g = state.layoutGrid;
        //this will be undefined the first time
        const pg = last.layoutGrid;
        return state.showDebugLayoutGrid !== last.showDebugLayoutGrid ||
            g !== pg ||
            g.column != pg.column || g.row !== pg.row ||
            state.innerWidth !== last.innerWidth ||
            state.innerHeight !== last.innerHeight;
    }

    render(state){

        this.ctx.lineWidth = 1;
        if(!this.domElement.parentElement){
            //inject it if its not in the active DOM
            document.body.appendChild(this.domElement);
        }

        if(!state.showDebugLayoutGrid){
            //if its in the dom, take it out
            this.domElement.parentElement && this.domElement.parentElement.removeChild(this.domElement);
            return;
        }

        Object.assign(this.domElement.style, {
            pointerEvents: 'none',
            zIndex: 10,
            position: 'fixed',
            top: 0,
            left: 0,
            boxSizing: 'border-box'
        });

        this.domElement.width = state.innerWidth;
        this.domElement.height = state.innerHeight;
        const grid = Object.assign({}, state.layoutGrid);
        grid.width = state.innerWidth;
        grid.height = state.innerHeight;
        const cells = grid2d.createCells(grid);
        this.ctx.clearRect(0, 0, this.domElement.width, this.domElement.height);

        this.ctx.strokeStyle = this.color;
        cells.forEach(cell=>
            this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height)
        );

        this.ctx.lineWidth = 2;
        Object.keys(state.layoutItems).forEach(key=>{

            const [a, b] = state.layoutItems[key];

            const tl = {
                x: grid2d.xForColumn(grid, a.column),
                y: grid2d.yForRow(grid, a.row)
            };

            const br = {
                x: grid2d.xForColumn(grid, b.column),
                y: grid2d.yForRow(grid, b.row)
            };

            this.ctx.beginPath();
            this.ctx.moveTo(tl.x, tl.y);
            this.ctx.lineTo(br.x, br.y);
            this.ctx.stroke();

        });

    }
}

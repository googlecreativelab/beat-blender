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

import { quadIn as ease } from 'eases';
import animitter from 'animitter';
import * as grid2d from 'grid2d';

import { View } from './base-view';
import { notesToMatrix } from '../samples';
import { scalemap, clamp, distance, pathLength, times, lerpPath, allKeysEqual } from '../utils';
import { setCanvasSize, dpr, renderToNewCanvas, renderGrid, renderPath, renderPoints } from '../canvas-utils';
import getMousePosition from '../get-mouse-position';
import * as playModes from '../models/play-modes';
import * as responsive from '../models/responsive';




const sAlpha = (c, v)=>[c[0],c[1],c[2],v];

const renderCell = (ctx, cell, alpha, pattern1, pattern2, widthScale=1, heightScale=1)=>{
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pattern1;
    //const r = Math.round;
    const c = (v)=>v;//Math.ceil;
    const f = (v)=>v;//Math.round;
    ctx.fillRect(
        f(cell.x * widthScale),
        f(cell.y * heightScale),
        c(cell.width * widthScale),
        c(cell.height * heightScale)
    );

    ctx.globalAlpha *= 1.3;
    ctx.fillStyle = pattern2;
    ctx.fillRect(
        f(cell.x * widthScale),
        f(cell.y * heightScale),
        c(cell.width * widthScale),
        c(cell.height * heightScale)
    );
};




export const renderPuck = (ctx, puck, scaleX=1, scaleY=1)=>{
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20 * dpr();
    ctx.beginPath();
    ctx.arc(puck.x * dpr() * scaleX, puck.y * dpr() * scaleY, puck.radius * scaleX * dpr(), 0, Math.PI * 2);
    ctx.fill();
    // ctx.shadowColor = 'none';
    // ctx.shadowBlur = 0;
};

const highlightActiveCell = (ctx, state)=>{
    //const ga = ctx.globalAlpha;
    //ctx.globalAlpha = 0.25;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = dpr();
    const cell = grid2d.createCellForIndex(tmpGrid, state.selectedIndex);
    ctx.strokeRect(cell.x * dpr(), cell.y * dpr(), cell.width * dpr(), cell.height * dpr());
    //ctx.globalAlpha = ga;
};

const renderPathPoints = (ctx, state)=>{
    if(state.playMode === playModes.PATH && state.path.length > 2){
        const n = pathLength(state.path) * 30;
        const pts = times(n, (i, n)=> lerpPath(state.path, i/(n-1)));

        //renderPoints(c, state.path, 'blue', tmpGrid.width, tmpGrid.height);
        renderPoints(ctx, pts, 'rgba(255,0,0, 0.2)', tmpGrid.width, tmpGrid.height);
    }
};


//reusing for rendering
const tmpGrid = {};

const hitsPuck = (pt, puck, threshold=0)=>
    distance(pt, puck) < puck.radius + threshold;





const sizeEqual = (state, last)=> allKeysEqual(state, last, ['innerWidth', 'innerHeight', 'layout']);
const gridEqual = (state, last)=> allKeysEqual(state, last, ['innerWidth', 'innerHeight', 'sequenceUUID']);


export class GridView extends View {

    constructor(domElement){
        super(domElement || document.createElement('canvas'));

        this.context = this.domElement.getContext('2d');
        this.cursor = { x: 0, y: 0 };

        let mouseDown = false;
        let isPuckHit = false;

        let scaleX;
        let scaleY;

        const updateCursor = (event)=>{
            getMousePosition(this.domElement, event, true, this.cursor);

            scaleX = this.domElement.clientWidth;
            scaleY = this.domElement.clientHeight;

            this.cursor.x /= scaleX;
            this.cursor.y /= scaleY;
        };

        const onMouseDown = (event, state)=>{
            updateCursor(event);

            mouseDown = true;
            //both grid and cursor are normalized 0-1
            const cell = grid2d.intersectsCellPosition(state.grid, this.cursor);
            this.emit('down', this, this.cursor);
            if((isPuckHit = hitsPuck(this.cursor, state.puck))){
                this.emit('drag', this, this.cursor, cell, event);
            } else if(cell && state.playMode === playModes.DRAG){
                const color = state.fullGradient[cell.column][cell.row];
                this.emit('select', this, this.cursor, cell, color, event);
            } else if(state.playMode === playModes.PATH){
                this.emit('draw-new', this, this.cursor, event);
            }
        };

        const onMouseMove = (event, state)=>{
            updateCursor(event);

            //dont scroll on touchmove
            if((event.touches && event.touches.length && isPuckHit) || state.playMode === playModes.PATH){
                event.preventDefault();
            }

            this.domElement.style.cursor = hitsPuck(this.cursor, state.puck, 0.03) ? 'pointer' : 'inherit';

            const closestCell = grid2d.intersectsCellPosition(state.grid, this.cursor);
            if(!closestCell){
                return;
            }
            //this.emit('move', this, this.cursor, closestCell);
            if(!mouseDown){
                return;
            }

            if(isPuckHit && state.playMode === playModes.DRAG){
                this.emit('drag', this, this.cursor, closestCell);
            } else if(state.playMode === playModes.PATH){
                this.emit('draw', this, this.cursor, closestCell);
            }
        };

        const onMouseUp = ()=>{
            mouseDown = false;
            isPuckHit = false;
            this.emit('up', this, this.cursor);
        };




        this._setEventMap({
            'mousedown'  : onMouseDown,
            'touchstart' : onMouseDown,
            'mousemove'  : onMouseMove,
            'touchmove'  : onMouseMove,
            'mouseup'    : onMouseUp,
            'touchend'   : onMouseUp
        });
    }

    getSequencePattern(state, last){
        //!anyKeyNotEqual(state, last, ['innerWidth', 'innerHeight', 'sequenceUUID']);
        if(this.__cachedSequencePattern && gridEqual(state, last)){
            return this.__cachedSequencePattern;
        }

        const {
            grid,
            fullGradient:colors
        } = state;

        const c = this.context;


        grid2d.scale(grid, c.canvas.width/dpr(), c.canvas.height/dpr(), tmpGrid);
        tmpGrid.paddingRight = tmpGrid.paddingLeft = tmpGrid.paddingTop = tmpGrid.paddingBottom = 2;

        //create a new image data for all the rendered sequences
        this.__cachedSequencePattern = c.createPattern(renderToNewCanvas(this.context.canvas, (ctx)=>{
            const entireMatrix = state.encodedSequences.map(seq=>
                notesToMatrix(seq, state.sequence.columns, state.sequence.rows)
            );

            for(let col=0; col<grid.columns; col++){
                for(let row=0; row<grid.rows; row++){
                    const matrix = entireMatrix[grid2d.cellIndex(grid,col, row)];
                    const cell = grid2d.createCellForPosition(tmpGrid, col, row);

                    cell.columns = state.sequence.columns;
                    cell.rows = state.sequence.rows;
                    const getColor = ()=>sAlpha(colors[col][row], 1);
                    const shouldRenderCell = (x,y)=>!!matrix[x][y];
                    renderGrid(ctx, cell, getColor, 1, 1, shouldRenderCell);
                }
            }
        }), 'repeat');

        return this.__cachedSequencePattern;
    }

    getGradientPattern(state, last){
        if(this.__cachedGradientPattern && gridEqual(state, last)){
            return this.__cachedGradientPattern;
        }
        const {
            grid,
            fullGradient:colors
        } = state;
        const c = this.context;


        tmpGrid.paddingRight = tmpGrid.paddingLeft = tmpGrid.paddingTop = tmpGrid.paddingBottom = 0;
        grid2d.scale(grid, c.canvas.width/dpr(), c.canvas.height/dpr(), tmpGrid);


        this.__cachedGradientPattern = c.createPattern(renderToNewCanvas(c.canvas, (ctx)=>{
            renderGrid(ctx, tmpGrid, (x, y)=> colors[x][y]); //Math.min(colors[x][y][3],0.85)));
        }), 'repeat');

        return this.__cachedGradientPattern;
    }

    getCells(state, last){
        if(this.__cells &&
            state.grid.columns === last.grid.columns &&
            state.grid.rows === last.grid.rows
        ){
            return this.__cells;
        }

        const values = (obj)=>{
            const result = [];
            for(let prop in obj){
                result.push(obj[prop]);
            }
            return result;
        };


        const cells = grid2d.createCells(state.grid)
            .map(cell=>{
                const cellCen = grid2d.center(cell);
                const cen = { x: 0.5, y: 0.5 };
                cell.distance = distance(cellCen, cen);
                return cell;
            })
            .sort((a,b)=> a.distance > b.distance ? -1 : 1);

        const cellReduce = cells.reduce((mem, cell)=>{
            const dist = Math.floor(cell.distance * 1000) / 1000;
            mem[dist] = mem[dist] || [];
            mem[dist].push(cell);
            return mem;
        }, {});

        this.__cells = values(cellReduce)
            .sort((a,b)=> a[0].distance < b[0].distance ? 1 : -1);

        return this.__cells;
    }



    onStart(){
        if(!this.transitionIn){
            this.transitionIn = animitter((delta, elapsed)=>{
                const delay = 100;
                const t = clamp((elapsed-delay) / 1200, 0, 1);
                if( t >= 1){
                    this.transitionIn.complete();
                }
                this.emit('transition', this, t);
            });//.start();

            //don't start this one
            this.transitionOut = animitter((delta, elapsed)=>{
                const lowerCap = 0;//0.15;
                const t = 1 - clamp(elapsed / 300, lowerCap, 1);
                if( t <= lowerCap) { //0.2) {
                    this.transitionOut.complete();
                }
                this.emit('transition', this, t);
            });
        }
    }

    __shouldStartTransitionIn({ isShowingSplash, gridAnimationLerp, selectedCornerIndex }, last){
        if(!isShowingSplash && last.isShowingSplash){
            return true;
        }
        return this.transitionIn && !this.transitionIn.isRunning() &&
            gridAnimationLerp < 1 && selectedCornerIndex === -1;
    }


    render(state, last){

        if(state.selectedCornerIndex !== last.selectedCornerIndex){
            //disable pointer-events during edit mode
            this.domElement.style.pointerEvents = (state.selectedCornerIndex === -1) ? 'all' : 'none';
        }

        if(this.__shouldStartTransitionIn(state, last)){
            this.transitionIn.reset().start();
        }
        if(!sizeEqual(state,last)){

            const cw = grid2d.cellWidth(state.layoutGrid);
            //const ch = grid2d.cellHeight(state.layoutGrid);
            const li = state.layoutItems.gridContainer;
            let width = cw * (li[1].column - li[0].column) * state.innerWidth;
            if(state.layout === responsive.MOBILE_PORTRAIT){
                width = state.innerWidth;
            }

            setCanvasSize(this.domElement, width, width);
        }

        if(state.selectedCornerIndex > -1 && last.selectedCornerIndex === -1){
            this.transitionOut.reset().start();
        }


        let {
            grid,
            gridAnimationLerp:t
        } = state;

        t = ease(t);


        const c = this.context;
        const { width, height } = this.domElement;

        c.clearRect(0, 0, width, height);
        c.save();
        c.translate(grid.x, grid.y);


        const gradientPattern = this.getGradientPattern(state, last);
        const seqPattern = this.getSequencePattern(state, last);
        const cells = this.getCells(state, last);
        const maxAlpha = 0.8;



        if(t < 1 ) {

            // this tiers is normal
            const tiers = Math.max(1, Math.floor(cells.length*t));

            //this tiers causes the fun 8-bit flickering
            /*const tiers = Math.max(
                1,
                Math.floor(cells.length * clamp(scalemap(t, 0, 0.66, 0, 1), 0, 1))
            );*/

            cells.forEach((nested, i, arr) => {
                if (i >= tiers) {
                    return false;
                }
                const alph = i === 0 ? maxAlpha : clamp(scalemap(t, 1 / (arr.length - 1) * i, 0.9, 0, maxAlpha), 0, maxAlpha);

                //const alph = scalemap(t, 1/(arr.length-1)*i, 1, 0, 0.8);
                nested.forEach(cell => renderCell(c, cell, alph, gradientPattern, seqPattern, width, height));
            });
        } else {
            //this just renders all cells as one rect
            c.globalAlpha = maxAlpha;
            c.fillStyle = gradientPattern;
            c.fillRect(0, 0, width, height);

            c.globalAlpha = 1;
            c.fillStyle = seqPattern;
            c.fillRect(0, 0, width, height);
        }


        c.globalAlpha = 1;
        const extrasAlpha = scalemap(state.gridAnimationLerp, 0.95, 1, 0, 1);
        if(extrasAlpha > 0){
            c.globalAlpha = extrasAlpha;
            highlightActiveCell(c, state);
            //render the points that are actually being lerped between
            false && renderPathPoints(c, state);
            renderPath(c, state.path, width / dpr(), height / dpr());

            if(state.selectedCornerIndex < 0){
                renderPuck(c, state.puck, width / dpr(), height / dpr());
            }
        }

        c.restore();
        return this;
    }
}

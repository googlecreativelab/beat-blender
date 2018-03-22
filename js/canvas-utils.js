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
import { toCSSString } from './models/color';


/**
 * this module is for functions that assist in rendering common application
 * data to a canvas, for example a grid
 */


export const dpr = ()=> 2; //window.devicePixelRatio || 1;


export const setCanvasSize = (canvas, width, height)=>{
    canvas.width = width * dpr();
    canvas.height = height * dpr();
    // scaling to dpr should be covered in css, not in this function
    // Object.assign(canvas.style, {
    //     width: (canvas.width / dpr()) + 'px',
    //     height: (canvas.height / dpr()) + 'px'
    // });
    return canvas;
};



export const renderToNewCanvas = ({ width, height }, fn)=>{
    const el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    const ctx = el.getContext('2d');
    fn(ctx);
    return el;
};


export const renderGridStrokes = (ctx, grid, color, lineWidth=2, widthScale=1, heightScale=1)=>{
    ctx.strokeStyle = toCSSString(color);
    ctx.lineWidth = lineWidth * dpr();
    ctx.beginPath();
    const h = 2;
    for(let col=0; col<grid.columns; col++){
        const x = grid2d.xForColumn(grid, col) * widthScale;
        ctx.clearRect(x-h, x*2, 0, ctx.canvas.height);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightScale);
    }
    ctx.stroke();

    ctx.beginPath();
    for(let row=0; row<grid.rows; row++){
        const y = grid2d.yForRow(grid, row) * heightScale;
        ctx.clearRect(0, y-h, ctx.canvas.height, h*2);
        ctx.moveTo(0, y);
        ctx.lineTo(widthScale, y);
    }
    ctx.stroke();
};


/**
 * render a grid on a canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {grid2d.Grid} grid
 * @param {Function(column,row):Array} getColor
 * @param {Number} [widthScale=1]
 * @param {Nmber} [heightScale=1]
 */
export const renderGrid = (ctx, grid, getColor, widthScale=1, heightScale=1, shouldRenderCell=(()=>true), rounding=Math.ceil)=>{

    const cw = rounding(grid2d.cellWidth(grid) * dpr() * widthScale);
    const ch = rounding(grid2d.cellHeight(grid) * dpr() * heightScale);


    for(let x=0; x<grid.columns; x++){
        for(let y=0; y<grid.rows; y++){
            if(!shouldRenderCell(x,y)){
                continue;
            }
            //if its not a multi-dimensional array just use the same color
            const color = getColor(x, y); //colors[0].length ? colors[x][y] : colors;
            const cx = rounding(grid2d.xForColumn(grid, x) * dpr() * widthScale);
            const cy = rounding(grid2d.yForRow(grid, y) * dpr() * heightScale);
            ctx.fillStyle = toCSSString(color);
            ctx.fillRect(cx , cy, cw, ch);
            // ctx.fillStyle = 'black';
            // ctx.font = '28px Arial';
            // ctx.fillText(grid2d.cellIndex(grid, x, y), cx, cy + 28);
        }
    }
};


export const renderPath = (ctx, positions, widthScale=1, heightScale=1)=>{
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 10 * dpr();
    ctx.beginPath();
    for(let i=0; i<positions.length; i++){
        ctx[i===0 ? 'moveTo' : 'lineTo'](positions[i].x * dpr() * widthScale, positions[i].y * dpr() * heightScale);
    }
    ctx.stroke();

};

export const renderPoints = (ctx, points, color='red', widthScale=1, heightScale=1)=>{
    ctx.fillStyle = color;
    for(let i=0; i<points.length; i++){
        ctx.beginPath();
        ctx.arc(points[i].x * dpr() * widthScale, points[i].y * dpr() * heightScale, 4, 0, Math.PI * 2);
        ctx.fill();
    }
};


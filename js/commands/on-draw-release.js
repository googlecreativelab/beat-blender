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


import { lerpPath, pathLength, times } from '../utils';
import * as grid2d from 'grid2d';

export default function({ state, set }){
    if(!state.path.length){
        return;
    }

    const n = pathLength(state.path) * 30;
    const equids = times(n, (i, n)=> lerpPath(state.path, i/(n-1)));


    const cells = [];

    const points = [];
    let lastCell = {};
    for(let i=0; i<equids.length; i++){
        const cell = grid2d.intersectsCellPosition(state.grid, equids[i]);
        if(cell.column === lastCell.column && cell.row === lastCell.row){
            continue;
        }
        cells.push(cell);
        points.push(grid2d.center(grid2d.createCellForPosition(state.grid,cell)));
        lastCell = cell;
    }

    set({
        path: equids,
        pathIntersections: cells
    });
}

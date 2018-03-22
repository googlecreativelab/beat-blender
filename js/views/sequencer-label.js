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
import { xForColumn, yForRow } from 'grid2d';
import { MOBILE_PORTRAIT } from '../models/responsive';



export class SequencerLabel extends View {
    constructor(domElement){
        super(domElement);
    }

    render(state){
        let label = '';
        /*const { width } = this.domElement.getBoundingClientRect();
        const height = ~~(cellHeight(state.grid) * width / 2);
        this.domElement.style.height = `${height}px`;*/

        const lg = state.layoutGrid;
        const [a, b] = state.layoutItems.sequencerLabel;

        if(!a || !b){
            return;
        }

        const x1 = xForColumn(lg, a.column);
        const x2 = xForColumn(lg, b.column);
        const y1 = yForRow(lg, a.row);
        const y2 = yForRow(lg, b.row);

        const height = `${(y2-y1) * state.innerHeight}px`;

        let css = (state.layout === MOBILE_PORTRAIT) ? ({
            position: 'relative',
            top: 0,
            left: 0,
            width: '100%',
            height
        }) : ({
            position: 'absolute',
            left: `${x1 * state.innerWidth}px`,
            top: `${y1 * state.innerHeight}px`,
            width: `${(x2-x1) * state.innerWidth}px`,
            height
        });

        Object.assign(this.domElement.style, css);

        if(state.selectedCornerIndex > -1){
            label = `Editing corner ${state.selectedCornerIndex + 1}`;
        } else {
            label = ''; //`Sampling column ${pos.column + 1}, row ${pos.row + 1}`;
        }
        this.domElement.innerHTML = label;
    }
}

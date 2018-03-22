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

const DEFAULT_TEXT = 'Select Midi Out';


const template = (text, isSelected)=>  `
    <option ${isSelected ? 'selected' : ''}>${text}</option>`;


export class SelectMidiOut extends View {

    constructor(domElement){
        super(domElement);

        this._setEventMap({
            'change': (evt)=> this.emit('change', this, evt.target.selectedIndex -1) //-1 because of the default option
        });
    }

    shouldComponentUpdate({ midiOut }, { midiOut:lMidiOut }){
        //deep-equals cause it could be a clone
        if(midiOut && !lMidiOut){
            return true;
        }
        if(midiOut.length !== lMidiOut.length){
            return true;
        }

        for(let i=0; i<midiOut.length; i++){
            if(midiOut[i] !== lMidiOut[i]){
                return true;
            }
        }
        return false;
    }

    render(state){
        this.domElement.innerHTML = [
            template(DEFAULT_TEXT)
        ]
            .concat(state.midiOut.map((device,i)=>template(device, i === state.selectedMidiOutIndex)))
            .join('');

        return super.render();
    }


}

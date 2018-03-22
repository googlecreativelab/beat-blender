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

import Tone from 'tone';
import { range } from '../utils';
import { getMidiNoteFromDrumRow, urls as sampleURLs, getURLIndexForNote } from '../samples';
import { View } from './base-view';
import { sendMIDIToDevice } from '../midi-out';
import { anyKeyNotEqual } from '../utils';
import assert from 'assert';


export class SequencePlayer extends View {
    constructor(){
        super(document.body);

        this.onEveryNote = this.onEveryNote.bind(this);
        this.onPlayerLoaded = this.onPlayerLoaded.bind(this);

        this.loop = new Tone.Sequence(this.onEveryNote, range(0, 32), '16n');
        this.notesOn = [];
    }

    onEveryNote(tickTime, col){
        if(!this.player.loaded){
            return;
        }
        this.emit('note', this, tickTime, col);
    }

    onPlayerLoaded(player){
        console.log(player);
        //setSequencerUINotes(mLSequencer.currNotes);
        Tone.Transport.start();
        console.log('Tone.Transport started');
    }

    shouldComponentUpdate(s, l){
        //first time or column changed
        return s.playing !== l.playing ||
            s.bpm !== l.bpm ||
            (!l.sequence && s.sequence) ||
            s.sequence.time !== l.sequence.time ||
            s.sequence.activeColumn !== l.sequence.activeColumn ||
            anyKeyNotEqual(s.activeNotes, l.activeNotes);
    }

    render(state, last){
        //load samples
        if(!this.player){
            assert(Array.isArray(sampleURLs), `sampleURLs should be an array, received ${sampleURLs}`);
            this.player = new Tone.Players(sampleURLs, this.onPlayerLoaded).toMaster();
        }
        //toggle play/pause
        if(state.playing && this.loop.state !== 'started'){
            this.loop.start();
        } else if(!state.playing && this.loop.state === 'started'){
            this.loop.stop();
        }
        //update bpm
        Tone.Transport.bpm.value = state.bpm;

        const notes = state.activeNotes;

        const midiDeviceName = state.midiOut[state.selectedMidiOutIndex];
        const channel = 10;
        const hasNotesOn = this.notesOn.length > 0 && notes.length > 0 || state.sequence.activeColumn == 1;
        if(midiDeviceName && hasNotesOn) {
            this.notesOn.forEach((midiNoteOn) => {
                sendMIDIToDevice(midiDeviceName, midiNoteOn, false, Math.random() * 0.5 + 0.5, channel);
            });
            this.notesOn = [];
        }

        for (let i = 0; i < notes.length; i++) {
            const vel = Math.random() * 0.5 + 0.5;

            let midiNote = getMidiNoteFromDrumRow(notes[i]);

            const midiDeviceName = state.midiOut[state.selectedMidiOutIndex];
            if(midiDeviceName && state.selectedMidiOutIndex >= 0) {
                sendMIDIToDevice(midiDeviceName, midiNote, true, vel, channel);
                this.notesOn.push(midiNote);
            } else {
                const player = this.player.get(getURLIndexForNote(midiNote));
                const time = state.sequence.time !== last.sequence.time ? state.sequence.time : Tone.Transport.now();

                player.start(time, 0, '2n', 0, vel);
            }

        }
        return this;
    }
}

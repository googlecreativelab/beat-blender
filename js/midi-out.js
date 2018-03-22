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

import assert from 'assert';

const MIDI_EVENT_ON = 0x90;
const MIDI_EVENT_OFF = 0x80;

const midiDevices = {};


/**
 * Watch for MIDI access devices being added or removed
 * @param {Function} [onChange(err, midiDevices)]
 */
export const watchMIDIDevices = (onChange) => {
    assert.equal(typeof onChange, 'function', `requires a function to report changes to, received ${onChange}`);

    const updateMidiOutState = () => {
        onChange(null, midiDevices);
    };

    if(typeof navigator.requestMIDIAccess !== 'function'){
        onChange(new Error('navigator.requestMIDIAccess does not exist'));
        return;
    }

    navigator.requestMIDIAccess().then((midi) => {

        midi.outputs.forEach((output) => {
            /*console.log(`
            Output midi device [type: '${output.type}']
            id: ${output.id}
            manufacturer: ${output.manufacturer}
            name:${output.name}
            version: ${output.version}`);*/
            midiDevices[output.name] = output;
        });

        midi.onstatechange = (e) => {
            if(e.port.state == 'disconnected') {
                delete midiDevices[e.port.name];
                updateMidiOutState();
            } else if(e.port.state == 'connected') {
                if(!(e.port.name in midiDevices)) {
                    midi.outputs.forEach((output) => {
                        if(output.name == e.port.name){
                            midiDevices[e.port.name] = output;
                            updateMidiOutState();
                        }
                    });
                }
            }
        };
        updateMidiOutState();
    }, onChange);
};

/**
 * send a MIDI Note to a MIDI Device
 * @param {String} outputDeviceName the device to use
 * @param {Number} outnoteNum the note to send
 * @param {Boolean} shouldTurnNoteOn are we turning this note on or off?
 * @param {Number} currVelocity velocity to send note at
 * @param {Number} channel
 */
export const sendMIDIToDevice = (outputDeviceName, outnoteNum, shouldTurnNoteOn, currVelocity, channel) => {
    const outputDevice = midiDevices[outputDeviceName];
    assert(outputDevice, `MIDI Device ${outputDeviceName} does not exist`);
    const eventToSend = shouldTurnNoteOn ? MIDI_EVENT_ON : MIDI_EVENT_OFF;
    outputDevice.send([eventToSend + channel - 1, outnoteNum, 0x03]);
};


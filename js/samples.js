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

import { times } from './utils';
import assert from 'assert';

/**
 * this represents every MIDI Drum Note,
 * the first index of the nested array is the name of the mp3 file to load,
 * i.e. "36.mp3"
 */
const notesBySample = [
    [36, 35],
    [38, 27, 28, 31, 32, 33, 34, 37, 39, 40, 56, 65, 66, 75, 85],
    [42, 44, 54, 68, 69, 70, 71, 73, 78, 80],
    [46, 67, 72, 74, 79, 81],
    [45, 29, 41, 61, 64, 84],
    [48, 47, 60, 63, 77, 86, 87],
    [50, 30, 43, 62, 76, 83],
    [49, 55, 57, 58],
    [51, 52, 53, 59, 82]
];

/**
 * this is an array of the URLs to load
 * @type {Array<string>}
 */
export const urls = notesBySample.map(notes=> `/ai/beat-blender/view/assets/audio/drums/${notes[0]}.mp3`);

/**
 * this is a map of every unique note to the array-index it is found in
 * so if its value is "3" then play `urls[3]`
 */
const noteFlatMap = notesBySample.reduce((mem, notes, i)=>{
    notes.forEach(note=> mem[note] = i);
    return mem;
}, {});


/**
 * get the index in the urls array for the given note
 * @return {Number}
 */
export const getURLIndexForNote = (note)=> noteFlatMap[note];

const map = {
    36: 0,
    38: 1,
    42: 2,
    46: 3,
    45: 4,
    48: 5,
    50: 6,
    49: 7,
    51: 8
};

const revMap = {
    0: 36,
    1: 38,
    2: 42,
    3: 46,
    4: 45,
    5: 48,
    6: 50,
    7: 49,
    8: 51
};

export const getDrumRowFromNotePitch = (pitch)=> map[pitch];
export const getMidiNoteFromDrumRow = (row)=> revMap[row];


/**
 * calculate the sequencers matrix values (0|1) for each column and row
 * @param {Array<{startTime:Number, pitch:Number}>} notes
 * @param {Number} columns
 * @param {Number} rows
 * @param {Array<Array<Number>>} [matrix] optionally provide a matrix to reuse
 * @returns {Array<Array<Number>>}
 */
export const notesToMatrix = (notes, columns, rows, matrix)=>{
    assert(Array.isArray(notes), `notes should be array, received ${notes}`);
    assert.equal(typeof columns, 'number', `invalid columns ${columns}`);
    assert.equal(typeof rows, 'number', `invalid rows ${columns}`);
    //2d array of all 0s matching our current matrix size
    matrix = matrix || times(columns, ()=>times(rows,()=>0));

    notes.forEach((note, column) => {
        const notes = getLabelsFromEncoding(note, columns);
        notes.forEach((row) => {
            matrix[column][row] = 1;
        });
    });
    return matrix;
};

export const iNoteSequenceToEncodedNotes = (sequences, columns)=>{
    const encodedSequences = times(sequences.length, ()=>times(columns,()=>0));
    sequences.forEach((sequence, sequenceIndex)  => {
        sequence.notes.forEach(note => {
            encodedSequences[sequenceIndex][note.quantizedStartStep] += Math.pow(2, getDrumRowFromNotePitch(note.pitch));
        });
    });
    return encodedSequences;
};

export const encodedNotesToINoteSequence = (notes, columns)=>{
    assert(Array.isArray(notes), `notes should be array, received ${notes}`);
    //2d array of all 0s matching our current matrix size
    let sequenceNotes = [];
    notes.forEach((note, column) => {
        const notes = getLabelsFromEncoding(note, columns);
        notes.forEach((row) => {
            sequenceNotes.push({pitch: getMidiNoteFromDrumRow(row), quantizedStartStep: column});
            // matrix[column][row] = 1;
        });
    });
    return {notes: sequenceNotes};
};

/**
 * expands a given value to retrive the lables
 * @param {Number} value the encoded value to expand
 * @param {Number} numRows height of the initially encoded column
 * @returns {Array<Number>} decoded lables
 */
export const getLabelsFromEncoding = (value, numRows) => {
    let labels = [];
    for (var i = 0; i < numRows; i++) {
        if(((value >> i) & 1) == 1) {
            labels.push(i);
        }
    }
    return labels;
};


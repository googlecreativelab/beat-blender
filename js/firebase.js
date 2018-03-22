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

/*global: firebase */
import { generate as uuid }  from 'shortid';
const { firebase } = window;

// Initialize Firebase
const config = {
    //put your firebase config here
};


//uncomment here to use database
//firebase.initializeApp(config);


//the keys in state that we care about storing
const keys = [
    'encodedSequences',
    'sequenceUUID',
    'selectedIndex',
    'sequence',
    'bpm',
    'playMode',
    'path',
    'pathIntersections',
    'pathLerp',
    'puck',
    'gradient',
    'grid'
];

const parseState = (state)=>
    keys.reduce((mem, key)=>{
        mem[key] = state[key];
        return mem;
    }, {});


export const save = (state)=>{
    const id = uuid();
    return firebase.database().ref(`shares/${id}`)
        .set(parseState(state))
        .then(function(){ console.log(arguments); return id; });
};

export const get = (uid='')=>
    firebase.database().ref(`shares/${uid}`).once('value');




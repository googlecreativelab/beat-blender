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
const isSupported = (()=>{
    if(/(edge|trident|SM-G920|SM-G925)/i.test(navigator.userAgent)){
        //if its edge or samsung
        return false;
    }

    if(/safari/i.test(navigator.userAgent)){
        const matches = navigator.userAgent.match(/Version\/([0-9._]+).*Safari/);
        if(matches && matches.length > 1){
            const versionPieces = matches[1].split(/[._]/).slice(0,3);
            if(Number(versionPieces[0]) <= 9){
                //iOS 9 and lower deeplearn wont work
                return false;
            }
        }
    }

    return true;

})();

if(!isSupported) {
    gtag('event', 'not-supported', navigator.userAgent);
    document.querySelector('.device-supported').style.display = 'none';
    document.querySelector('.device-not-supported').style.display = 'block';
}

//polyfill
window.Object.assign = window.Object.assign || require('object-assign');
require('whatwg-fetch');


import debounce from 'debounce';
import queryString from 'qs';
import * as grid2d from 'grid2d';
import { generate as uuid } from 'shortid';
import animitter from 'animitter';
import page from 'page';
import Tone from 'tone';
import {MusicVAE} from '@magenta/music-vae';
import StartAudioContext from 'startaudiocontext';
import assert from 'assert';

import * as db  from './firebase';

//this is our state manager and view-renderer
import hub from './hub';

//views
import { GridContainer, SequencerContainer } from './views/layout-containers';
import { Corners } from './views/tiles';
import { EditModeGroup, ToggleButton, DragDrawToggle, BPMSlider,  CustomizeBeatsButton} from './views/button';
import { GridView } from './views/grid';
import { SequencerGridView } from './views/sequencer-grid';
import { SequencePlayer } from './views/sequence-player';
import { PresetButtonGroup } from './views/preset-button-group';
import { SelectMidiOut } from './views/select-midi-out';
import { DebugLayoutGrid } from './views/debug-layout-grid';

//models
import { get as getResponsiveLayout } from './models/responsive';
import * as playModes from './models/play-modes';
import * as modals from './models/modals';
import { generate4PointGradientAt, generate4PointGradient } from './models/color';
import { notesToMatrix, encodedNotesToINoteSequence, iNoteSequenceToEncodedNotes, getLabelsFromEncoding } from './samples';

//commands
import onDrawPath from './commands/on-draw-path';
import onDrawRelease from './commands/on-draw-release';
import onPuckDrag from './commands/on-puck-drag';
import { watchMIDIDevices } from './midi-out';
import { UndoManager } from './commands/undo-manager';

import { times, lerpPath, anyKeyNotEqual } from './utils';
import * as debugMode from './debug-mode';
import { SequencerLabel } from './views/sequencer-label';
import { Modal } from './views/modal';

//analytics
const gtag = window.gtag || (function(){ console.warn('gtag not found, did not track', arguments); });
const gEvent = function(){ gtag.apply(null, ['event', ...arguments]); };

console.log(isSupported + ' SUPPORTED');



const app = hub({
    options: {
        debug: false,
        immutable: true
    },
    state: {
        isShowingSplash: true,
        interpolating: false,
        loading: true,
        layout: getResponsiveLayout(),
        layoutGrid: { columns: 20, rows: 20 },
        showDebugLayoutGrid: false,
        presetBeats: require('../json/preset-beats.json')[0],
        //the current audio data
        encodedSequences: require('../json/response.json'),
        sequenceUUID: uuid(),
        selectedIndex: 60,
        selectedCornerIndex: -1,
        lastSelectedCornerIndex: -1,

        sequence: {
            //how much total time since load has played (from Tone)
            time: 0,
            cachedSequence: null,
            //colorOn: [0, 0, 0, 1],
            colorOff: [64, 64, 64, 1],
            activeColumn: 0,
            hoverCellPosition: null,

            //grid
            columns: 32,
            rows: 9,
            paddingRight: 0.006,
            paddingBottom: 0.006,
            rowMajor: false
        },
        //the undo functionality, 1 array for each corner
        editHistory: [
            [],
            [],
            [],
            []
        ],
        playing: false,
        bpm: 120,
        sampleTemperature: 0.5,
        modal: modals.NONE,
        playMode: playModes.DRAG,
        //the line drawing across the cells
        path: [],
        //the cells that line intersects
        pathIntersections: [],
        //current progress through path
        pathLerp: 0,
        //the cursor on the cells
        puck: {
            x: 0.5,
            y: 0.5,
            //make it a little bigger on touch devices

            radius: typeof window.ontouchend === 'object' ? 0.045 : 0.03
        },
        //RGBA values for grid gradient
        gradient: [
            //top-left
            [167, 176, 251, 1],
            //top-right
            [228, 129, 248, 1],
            //bottom-left
            [165, 249, 209, 1],
            //bottom-right
            [204, 247, 153, 1]
        ],
        //the main colorful grid
        grid: {
            columns: 11,
            rows: 11
        },
        gridAnimationLerp: 0,
        activeNotes: [],
        midiOut: [],
        selectedMidiOutIndex: -1,
        bpmSliderOpen: false,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,

        shareURL: ''
    },

    computed: {
        cornerIndices: (state, last)=>{
            const { grid } = state;
            if(grid && last.grid && grid.columns === last.grid.columns && grid.rows === last.grid.rows && state.cornerIndices){
                return state.cornerIndices;
            }
            const total = grid.columns * grid.rows;
            return [0, grid.columns - 1, total - grid.columns, total - 1];
        },
        'sequence.colorOn': (state, last)=>{
            const {
                grid,
                selectedIndex,
                gradient
            } = state;

            if(selectedIndex === last.selectedIndex){
                return state.sequence.colorOn;
            }
            //default cell position
            const cellPosition = grid2d.cellPosition(grid, selectedIndex);

            return generate4PointGradientAt(
                gradient[0], gradient[1],
                gradient[2], gradient[3],
                cellPosition.column / (grid.columns - 1),
                cellPosition.row / (grid.rows - 1)
            );
        },
        fullGradient: (state, last)=>{
            if(state.gradient === last.gradient){
                return state.fullGradient;
            }
            const { gradient, grid } = state;
            return generate4PointGradient(
                gradient[0], gradient[1],
                gradient[2], gradient[3],
                grid.columns, grid.rows
            );
        },

        layoutItems: (state, last)=>{
            const g = state.layoutGrid;
            const pg = last.layoutGrid;

            if( g  &&
                pg &&
                state.innerWidth === last.innerWidth &&
                state.innerHeight === last.innerHeight &&
                g.columns === pg.columns &&
                g.rows === pg.rows
            ){
                return state.layoutItems;
            }

            const aspectRatio = (a, b)=>
                ((b.column - a.column) / g.columns * state.innerWidth) /  ((b.row - a.row) / g.rows * state.innerHeight);


            const gridContainer = [
                { column: 2, row: 3 },
                { column: 9, row: 17 }
            ];

            const sequencerContainer = [
                { column: 11, row: 3 },
                { column: 18, row: 17 }
            ];

            let [ a, b ] = gridContainer;

            let c = 0;
            while((b.column > a.column + 1) && aspectRatio(a,b) > 1 && c < 50){
                b.column--;
                c++;
            }

            if(aspectRatio(a,b) >= 0.85 && aspectRatio(a,b) <= 1){
                a.row--;
            } else if(aspectRatio(a,b) <= 0.66){
                a.row += 2;
            }

            [a, b] = sequencerContainer;
            c = 0;

            while(a.column < b.column - 1 && aspectRatio(a,b) > 1 && c < 50){
                a.column++;
                c++;
            }

            a.row = gridContainer[0].row;


            return {
                gridContainer,
                sequencerContainer,
                sequencerLabel: [
                    { column: a.column, row: a.row - 1 },
                    { column: b.column, row: a.row }
                ]
            };
        }
    }
});



//setup tracking encodedSequences into editHistory
const undoManager = new UndoManager(app, 'editHistory', 'encodedSequences');

//these are convenient in console
window.app = app;
window.grid2d = grid2d;

let musicVAEInitialized = false;
let musicVAEInitializing = false;

//these will be initialized in the page router
let musicVAESampler = new MusicVAE('https://storage.googleapis.com/download.magenta.tensorflow.org/models/music_vae/dljs/drums_lokl_q8');
let musicVAE = new MusicVAE('https://storage.googleapis.com/download.magenta.tensorflow.org/models/music_vae/dljs/drums_hikl_q16');


/**
 * interpolate the current encodedSequences from state into
 * a new series
 * @returns {PromiseLike<T>}
 */
const updateMusicVAE = () => {
    const { encodedSequences, grid, cornerIndices } = app.state;

    //cornerIndices are out of order from musicVAE corners
    const corners = [0,2,1,3].map(i=> cornerIndices[i])
        .map(index=> encodedSequences[index])
        .map(sequence => encodedNotesToINoteSequence(sequence, app.state.sequence.columns) );
    const output = musicVAE.interpolate(corners, grid.columns);

    const encodedNoteSequences = iNoteSequenceToEncodedNotes(output, app.state.sequence.columns);

    [0,2,1,3].forEach((i, j) => encodedNoteSequences[cornerIndices[i]] =  iNoteSequenceToEncodedNotes([corners[j]], app.state.sequence.columns)[0]); //swap out reconstructed corners with the original drums

    app.set({
        sequenceUUID: uuid(),
        encodedSequences: encodedNoteSequences,
        allSequences: output.map(noteSequence=> noteSequence.constructor.toObject(noteSequence))
    });
};

/**
 * Samples new drum beats from the latentspace
 * @returns {PromiseLike<T>}
 */
const sampleFromLatentSpace = (numSamples) =>
    iNoteSequenceToEncodedNotes(musicVAESampler.sample(numSamples, app.state.sampleTemperature), app.state.sequence.columns);

watchMIDIDevices(function onChange(err, midiDevices){
    if(err) {
        document.querySelector('#midi-output-container').style.display = 'none';
        console.log(err);
        return;
    }
    app.setDeep('midiOut', Object.keys(midiDevices));
});

//used to play back audio on ios
StartAudioContext(Tone.context, '.splash-play-button').then(function(){
    console.log('audio context started');
});


app.addView([
    new DebugLayoutGrid(),
    new GridContainer('#grid-container'),
    new SequencerContainer('#sequencer-container'),
    //the Tone.js audio player view
    new SequencePlayer()
        .on('note', (view, time, col)=>{
            const state = app.state;

            const sequence = state.encodedSequences[state.selectedIndex];
            const column = sequence[col];

            const notes = getLabelsFromEncoding(column, state.sequence.rows);

            app.set({
                activeNotes: notes,
                sequence: {
                    time,
                    activeColumn: col % state.sequence.columns
                }
            });
        }),

    // the gradient grid for selecting the encodedSequence
    new GridView('#grid-view')
        .on('transition', (view, t)=> app.setDeep('gridAnimationLerp', t))
        .on('drag', (view, cursor, cell)=> onPuckDrag(app, cursor, cell))
        .on('draw-new', ()=> {
            gEvent('draw-new-path');
            app.set({
                path: [],
                pathLerp: 0,
                pathIntersections: []
            });
        })
        .on('draw', (view, cursor)=> onDrawPath(app, cursor))
        .on('up',   ()=> onDrawRelease(app)),

    // the 4 editable corners that only appear in edit mode
    new Corners('#group-corners')
        .on('click', (view, i)=>{
            gEvent('corner-clicked', { corner: i });
            const selectedIndex = app.state.cornerIndices[i];
            app.set({
                selectedCornerIndex: i,
                selectedIndex,
                sequence: {
                    cachedSequence: app.state.encodedSequences[selectedIndex].slice(0)
                }
            });
        }),

    new SequencerLabel('.sequencer-label'),
    // the editable sequencer grid that shows the currently selected sequence
    new SequencerGridView('#sequencer-view')
        .on('mouseleave', ()=> app.setDeep('sequence.hoverCellPosition', null))
        .on('hover', (view, cellPosition)=> app.setDeep('sequence.hoverCellPosition', cellPosition))
        .on('toggle', (view, cellPosition)=>{

            const selectedCornerIndex = app.state.selectedCornerIndex;
            const index = app.state.cornerIndices[selectedCornerIndex];
            //clone
            const sequenceNotes = app.state.encodedSequences[index].slice(0);

            //if the cell was previously a 0, add the note because we are turning it on, if it was a 1, subtract the note
            const note = Math.pow(2, cellPosition.row);
            const matrix = notesToMatrix(sequenceNotes, app.state.sequence.columns, app.state.sequence.rows);
            const shift = !matrix[cellPosition.column][cellPosition.row] ? note : -1 * note;
            sequenceNotes[cellPosition.column] += shift;
            //grab the sequence from index and push it into the history at selectedCornerIndex 0-3
            undoManager.pushHistory(selectedCornerIndex, index);

            if(!app.state.playing && shift > 0){
                /*const activeNotes = app.state.activeNotes.slice(0);
                 activeNotes.push(cellPosition.row);*/
                app.setDeep('activeNotes', [cellPosition.row]);
            }

            app.setDeep(`encodedSequences.${index}`, sequenceNotes);
        }),

    new Modal('.modal').on('exit', ()=>page('/')),

    // the buttons that appear under the sequencer while editing
    new EditModeGroup('.edit-mode-group')
        .on('undo', () => {
            const selectedCornerIndex = app.state.selectedCornerIndex;
            const cornerSequenceIndex = app.state.cornerIndices[selectedCornerIndex];

            if(!undoManager.size(selectedCornerIndex)){
                console.log('undo is empty');
                return;
            }

            //get the most recent change and re-assign it to the encoded sequences
            const last = undoManager.popHistory(selectedCornerIndex);
            app.setDeep(`encodedSequences.${cornerSequenceIndex}`, last);
        })
        .on('clear',() =>  {
            gEvent('clear-sequence');
            const { sequence, cornerIndices, selectedCornerIndex } = app.state;
            const zeros = times(sequence.columns, ()=>0);

            undoManager.pushHistory(selectedCornerIndex, cornerIndices[selectedCornerIndex]);
            app.setDeep(`encodedSequences.${cornerIndices[selectedCornerIndex]}`, zeros);
        }),

    // this consumes the preset-beats.json and builds out the HTML
    // for selecting a preset
    new PresetButtonGroup('.preset-button-container')
        .on('click', (view, name, beat)=>{
            gEvent('click-preset', { preset: name });
            console.log(`setting beat ${name}: `, beat);
            const { cornerIndices, selectedCornerIndex } = app.state;
            const index = cornerIndices[selectedCornerIndex];
            undoManager.pushHistory(selectedCornerIndex, index);
            app.setDeep(`encodedSequences.${index}`, beat);
        })
        .on('generate-new-beat', ()=> {
            gEvent('generate-beat');
            const beat = sampleFromLatentSpace(1);
            const { cornerIndices, selectedCornerIndex } = app.state;
            const index = cornerIndices[selectedCornerIndex];
            app.setDeep(`encodedSequences.${index}`, beat[0]);
        }),

    new DragDrawToggle('#drag-draw-toggle')
        .on('click', ()=>{
            const playMode = app.state.playMode === playModes.DRAG? playModes.PATH : playModes.DRAG;
            app.set({
                playMode,
                path: []
            });
        }),

    new ToggleButton('#play-pause-button', (state)=> state.playing)
        .on('click', ()=> app.set({ playing: !app.state.playing})),
    new CustomizeBeatsButton('#edit-corners-button', (state)=> state.selectedCornerIndex > 0)
        .on('done', ()=> {
            gEvent('interpolate', 'done-button');
            //calculate where the puck is on the grid and return it as the selectedIndex
            const selectedIndex = grid2d.intersectsCellIndex(app.state.grid, app.state.puck);
            undoManager.resetHistory();
            app.setDeep('sequence.hoverCellPosition', null);
            app.set({
                interpolating: true,
                selectedIndex,
                lastSelectedCornerIndex: app.state.selectedCornerIndex,
                selectedCornerIndex: -1
            });

            app.render();
            const sleep = (ms)=> new Promise(res=> setTimeout(res, ms));
            sleep(16)
                .then(updateMusicVAE)
                .then(sleep(64))
                .then(()=> app.set({ gridAnimationLerp: 0, interpolating: false }));

        })
        .on('edit', ()=> {
            gEvent('edit');
            const selectedCornerIndex = app.state.lastSelectedCornerIndex !== -1? app.state.lastSelectedCornerIndex : 0;
            const selectedIndex = app.state.cornerIndices[selectedCornerIndex];
            const cachedSequence = app.state.encodedSequences[selectedIndex].slice(0);

            app.set({
                selectedCornerIndex: selectedCornerIndex,
                selectedIndex,
                sequence: {
                    cachedSequence
                }
            });
        }),

    new BPMSlider('#bpm-slider', (state)=> state.bpmSliderOpen)
        .on('change',( view, bpm)=>{
            app.set({ bpm });
        })
        .on('click', ()=> {
            if(!app.state.bpmSliderOpen){
                gEvent('open-bpm');
            }
            app.set({ bpmSliderOpen: !app.state.bpmSliderOpen });
        }),

    // the drop-down for selecting a midi out device
    new SelectMidiOut('#midi-out-selector')
        .on('change', (view, selectedMidiOutIndex)=>{
            gEvent('change-midi-out');
            app.set({ selectedMidiOutIndex });
            //find out wha index was selected
            console.log(`current midiOut: ${app.state.midiOut[selectedMidiOutIndex]}`);
        }),

    //simplistic view wrapping the body
    {
        events: {
            //close bpm should anywhere be clicked
            'click': (event, state) => {
                const targetIsSlider= ()=>
                    event.target.classList.value.indexOf('bpm-slider') > -1;

                if(state.bpmSliderOpen && !targetIsSlider()) {
                    app.set({ bpmSliderOpen: false });
                }
            },
            //any empty anchor url return false to avoid hash on url
            'click [href="#"]': ()=> false,
            'click #about': ()=> page('/about'),
            'click #share': ()=> page('/share')
        },

        /**
        * simple component to start / stop updating pathLerp
        * if we are playing in pathMode, we should be updating it at 60fp
        */
        shouldComponentUpdate: (state, last)=>
            anyKeyNotEqual(state, last, ['playing', 'playMode', 'selectedCornerIndex', 'modal', 'isShowingSplash']) ||
            (state.path.length >= 2 && last.path.length < 2),

        render: function(state){
            document.querySelector('.wrapper').style.display = app.state.modal === modals.NONE && !app.state.isShowingSplash? 'block': 'none';

            //update pathLerp 60fps, or stop
            if(state.playing && state.playMode === playModes.PATH && state.selectedCornerIndex === -1){
                loop.on('update', updatePathLerp);
            } else {
                loop.off('update', updatePathLerp);
            }
        }
    }
]);



/**
 * update the pathLerp state variable to move along the drawn path
 */
function updatePathLerp(){
    const { state } = app;

    if(state.playMode !== playModes.PATH || !state.path.length || state.selectedCornerIndex > -1){
        return;
    }

    //if its playing, we aren't editing a corner and we are in path mode, update moving along the path
    const selectedIndex = grid2d.intersectsCellIndex(state.grid, state.puck);
    let pathLerpDelta = loop.deltaTime/1000 / (Tone.Transport.toSeconds('16n') * state.sequence.columns * state.pathIntersections.length);
    if(!isFinite(pathLerpDelta)){
        return;
    }

    const pathLerp = (state.pathLerp + pathLerpDelta) % 1;
    const { x, y } = lerpPath(state.path, state.pathLerp);

    assert.ok(isFinite(selectedIndex), 'selectedIndex is not finite');
    assert(isFinite(x + y), 'new puck values are invalid');
    assert(isFinite(pathLerp), 'pathLerp is invalid');

    app.set({
        selectedIndex,
        pathLerp,
        puck: { x, y }
    });
}

window.addEventListener('orientationchange', (event) => {
    console.log(event);
    console.log('changed orientation');

});

window.addEventListener('resize', debounce(()=>{

    const { innerWidth, innerHeight } = window;
    app.set({
        layout: getResponsiveLayout(),
        innerWidth,
        innerHeight
    });
}, 1000/10));

window.addEventListener('keydown', (evt)=>{
    if(evt.code === 'Space'){
        app.set({ playing: !app.state.playing });
        evt.preventDefault();
    }
});



const loop = animitter()
    .on('start', app.onStart)
    .on('update', app.render)
    .on('stop', app.onStop);



function onPlayReady(ctx){
    const playButton = document.querySelector('.splash-play-button');

    function init(){
        gEvent('on-splash-play-clicked');
        document.body.classList.remove('loading');
        app.setDeep('isShowingSplash', false);
        loop.start();
    }

    if(ctx.params.uid){
        init();
    } else {
        playButton.addEventListener('click', init);
        playButton.innerHTML = 'PLAY';
    }
}


//just putting this on the window for dev purposes
window.loop = loop;

page.base('/ai/beat-blender/view');


//parse all queries
page('*', function parseQueries(ctx, next){
    ctx.query = queryString.parse(location.search.slice(1));
    console.log(ctx);
    //pass it on to the next handler!!
    next();
});

page('*', function initializeMusicVAE(ctx, next){
    if(!!ctx.query.checkpoint){
        //swap out the checkpoint!
        musicVAE = new MusicVAE(ctx.query.checkpoint);
    }
    if(!!ctx.query.samplerCheckpoint){
        musicVAESampler = new MusicVAE(ctx.query.samplerCheckpoint);
        //initialize both now that their checkpoints are final\
    }

    if(!musicVAEInitializing){
        //make sure to only do this once
        musicVAEInitializing = true;
        //initialize VAE and temporarily use it for sampling too
        //once the main VAE is loaded, begin loading the sampler
        //when that has finished place it back as the reference for sampler
        const tmpSampler = musicVAESampler;
        musicVAESampler = musicVAE;
        musicVAE
            .initialize()
            .then(function() {
                musicVAEInitialized = true;
                onPlayReady(ctx);
                console.log(`loaded musicvae with checkpont ${musicVAE.checkpointURL}`);

                //start loading sampler after main VAE is initialized
                tmpSampler.initialize().then((vae)=>{
                    musicVAESampler = vae;
                    console.log('Sampler Loaded');
                });
                //if a custom checkpoint is provided, lets immediately interpolate to those results
                if(!!ctx.query.checkpoint){
                    updateMusicVAE();
                }
            });
    }
    next();
});

page('*', function initializeGUI(ctx, next){
    if(!!ctx.query.debug){
        debugMode.initialize(app.state, page);
    }
    next();
});

//client-side router
page('/', ()=>{
    app.set({ modal: modals.NONE });
    //we might still be on the splash without the loop started
    //render once in case
    loop.update();
});
page('/about', ()=>{
    gEvent('about');
    app.set({
        playing: false,
        modal: modals.ABOUT
    });
    //it might be a direct-link, so we should render once
    //even if we havent started the app yet
    loop.update();
});
page('/share', ()=>{
    gEvent('share-create');
    //generate the share
    const next = (id)=>{
        console.log(`saved ${id}`);
        app.setDeep('shareURL', `${location.href}/${id}`);
        app.setDeep('modal', modals.SHARE);
        loop.update();
    };

    db.save(app.state)
        .then(next, next);
});
page('/share/:uid', (context)=>{
    gEvent('share-return', { uid: context.params.uid });
    db.get(context.params.uid)
        .then(
            (snapshot)=> app.set(snapshot.val()),
            (err)=> console.error(err)
        );
});
page('/main', ()=>{
    function autoPlay(){
        if(musicVAEInitialized){
            window.onPlay();
        } else {
            setTimeout(autoPlay, 32);
        }
    }

    autoPlay();
});

page();







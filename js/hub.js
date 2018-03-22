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

import eventMap from 'event-map';
import assert from 'assert';
import { generate as uuid } from 'shortid';
import deepMixin from 'mixin-deep';
import deepExtend from 'deep-extend';
import { set as setObjectPath } from 'object-path';

Object.freeze = Object.freeze || (()=>{});


/**
 * this module is a home-rolled minimal mvc manager
 */
export default function app({ options, state, computed }){

    options = options || {};
    computed = computed || {};

    const DEBUG = !!options.debug;
    const IMMUTABLE = !!options.immutable;

    const removeEventsMap = {};
    const uuidMap = {};

    const findUuid = (view)=>{
        for(let key in uuidMap){
            if(uuidMap[key] === view){
                return key;
            }
        }
    };

    const getNextState = (changes)=>
        applyComputed((IMMUTABLE ? deepExtend : deepMixin)({}, app.state, changes));

    //Object.freeze(state);

    //start dirty, first render should be (state, {})
    let stateIsDirty = true;

    const views = [];

    //this is what gets exported
    const app = {
        lastState: {},
        state: {},
        views,
        set,
        setDeep,
        onStart,
        onStop,
        addView,
        removeView,
        render,
        toJSON
    };


    app.set(state);

    function applyComputed(state){
        for(let prop in computed){
            setObjectPath(state, prop, computed[prop](state, app.lastState));
        }
        return state;
    }

    /**
     * provide a pattern to a single deep property
     * @example setDeep('gradient.0.3', 1) //will set state.gradient[0][3] = 1
     * @param pattern
     * @param value
     * @param cb
     */
    function setDeep(pattern, value, cb=(()=>{})){
        let before, after;
        if(DEBUG) {
            before = performance.now();
        }
        const nextState = getNextState();
        setObjectPath(nextState, pattern, value);
        app.state = nextState;
        stateIsDirty = true;
        if(DEBUG) {
            after = performance.now();
            console.log(`set deep took ${after - before}ms`);
        }
        cb(app.state);
    }

    /**
     * provide an object of changes to merge into the current state, overwriting any existing
     * @param changes
     * @param cb
     */
    function set(changes, cb=(()=>{})){
        //go through and deep-merge changes
        let before, after;
        if(DEBUG) {
            before = performance.now();
        }
        const nextState = getNextState(changes);
        //const stateDiff = diff(state, nextState);
        if(DEBUG){
            after = performance.now();
            console.log(`${after-before} ms elapsed`);
        }
        app.state = nextState;
        //app.state = Object.freeze(nextState);
        stateIsDirty = true;
        cb(app.state);
    }

    /**
     * add a view, take its event map and listen for it, providing it with state
     * whenever the event occurs
     * @param view
     * @returns {{
     *  lastState:{},
     *  state:{},
     *  views:Array,
     *  set:Function,
     *  addView:Function,
     *  removeView:Function,
     *  render:Function
     * }}
     */
    function addView(view){
        if(Array.isArray(view)){
            //accept receiving multiple views as Array
            view.forEach(addView);
            return app;
        }

        assert.equal(views.indexOf(view), -1, `View ${view} already exists`);

        const id = uuid();

        uuidMap[id] = view;

        const events = {};
        for(let prop in view.events){
            events[prop] = (event)=> view.events[prop](event, app.state, app.lastState);
        }

        if(Object.keys(events).length) {
            //every view has a uuid and that will be used for registering the event map
            removeEventsMap[id] = view.domElement ? eventMap(view.domElement, events) : eventMap(events);
        }

        views.push(view);
        return app;
    }

    /**
     * remove a view, clean up its listeners as well
     * @param view
     * @returns {{
     *  lastState:{},
     *  state:{},
     *  views:Array,
     *  set:Function,
     *  addView:Function,
     *  removeView:Function,
     *  render:Function
     * }}
     */
    function removeView(view){
        const index = views.indexOf(view);
        const id = findUuid(view);
        assert.notEqual(index, -1, `View ${view} does not exist`);
        assert(!!id, 'View uuid could not be found');
        const removeEvents = removeEventsMap[id];
        removeEvents && removeEvents();
        view.remove && view.remove();
        views.splice(index, 1);
        return app;
    }

    function onStart(){
        for(let view of views){
            view.onStart && view.onStart(app.state, app.lastState);
        }
    }

    function onStop(){
        for(let view of views){
            view.onStop && view.onStop(app.state, app.lastState);
        }
    }


    function render(){
        if(!stateIsDirty){
            return;
        }
        for(let i=0; i<views.length; i++){
            const view = views[i];
            if(!view.shouldComponentUpdate || view.shouldComponentUpdate(app.state, app.lastState)) {
                views[i].render(app.state, app.lastState);
            }
        }
        stateIsDirty = false;
        app.lastState = app.state;
    }


    function strip(obj, keys){
        for(let key of keys){
            if(typeof obj[key] !== 'undefined'){
                delete obj[key];
            }
        }
        return obj;
    }


    function toJSON(stripComputed=false){
        let state = deepExtend({}, app.state);
        stripComputed && (state = strip(state, Object.keys(computed)));
        return JSON.stringify(state, null, '    ');
    }

    return app;
}


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


/**
 * Undo Manager is a wrapper for simplifying the adding and removal
 * of edits done in the sequencer. It is fairly specific for this
 * use-case and the use of `hub` and is merely intended to isolate
 * undo into one area.
 */
export class UndoManager {

    /***
     * constructs a new UndoManager
     * @param {object} app the reference to the object from hub
     * @param {string} key the key for the history Array on app.state
     * @param {string} itemKey the key for the item to be putting in / taking out of history
     * @param {number} [max=64] the maximum number of histories for each nested
     */
    constructor(app, key, itemKey, max=64){
        this.app = app;
        this.key = key;
        this.itemKey = itemKey;
        this.max = max;

        assert(Array.isArray(app.state[key]), `${key} should be an Array in state`);
        assert(Array.isArray(app.state[itemKey]), `${key} should be an Array in state`);
        assert(Array.isArray(this.get(0)), `${itemKey} should be a 2D Array in state`);
        assert(Array.isArray(app.state[itemKey][0]), `${itemKey} should be a 2D Array in state`);
        assert(typeof app.state, 'object', 'app should have state object');
        assert.equal(typeof app.setDeep, 'function', 'app should have a setDeep function');
    }

    get(index){
        return this.app.state[this.key][index];
    }

    getItem(itemIndex){
        //make a copy
        return this.app.state[this.itemKey][itemIndex].slice(0);
    }

    /**
     * remove all items from the history
     */
    resetHistory(){
        //how many nested elements are there? (4)
        const len = this.app.state[this.key].length;
        const empty = [];
        for(let i=0; i<len; i++){
            empty[i] = [];
        }
        this.app.setDeep(this.key, empty);
    }

    /**
     * add the item at `itemIndex` into the history at `index`
     * technically it puts it at the beginning with unshift()
     * @param {number} index history index
     * @param {nmber} itemIndex the index for itemKey
     */
    pushHistory(index, itemIndex){
        const hist = this.get(index);
        //unshift in the ORIGINAL DATA not the modified
        hist.unshift(this.getItem(itemIndex));
        let safety = 0;
        while(this.size(index) > this.max && safety < 1000){
            this.removeOldest(index);
            safety++;
        }
        this.app.setDeep(`${this.key}.${index}`, hist);
    }

    /**
     * remove the newest item from history
     * @param {number} index for history
     * @returns {any} newest item
     */
    popHistory(index){
        assert(this.size(index) > 0, 'history is empty');
        const hist = this.get(index);
        const last = hist.shift();
        this.app.setDeep(`${this.key}.${index}`, hist);
        return last;
    }

    removeOldest(index){
        assert(this.size(index) > 0, 'history is empty');
        const hist = this.get(index);
        const oldest = hist.pop();
        this.app.setDeep(`${this.key}.${index}`, hist);
        return oldest;
    }

    size(index){
        return this.app.state[this.key][index].length;
    }
}


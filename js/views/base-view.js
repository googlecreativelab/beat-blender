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

import { EventEmitter } from 'events';
import assert from 'assert';


export const getDOM = (dom)=>
    typeof dom === 'string' ?
        document.querySelector(dom) :
        dom;



export class View extends EventEmitter {

    constructor(domElement){
        super();
        this.domElement = getDOM(domElement);
        assert(!!this.domElement, `Unable to resolve domElement from ${domElement}`);
    }

    set visible(val){
        if(val !== this.visible){
            this.domElement.classList[val ? 'remove' : 'add']('hidden');
        }
    }

    get visible(){
        return !this.domElement.classList.contains('hidden');
    }


    _setEventMap(map){
        this.events = map;
        //this.__removeEventListeners = eventMap(this.domElement, map);
    }

    shouldComponentUpdate(){
        return true;
    }

    render(){
        return this;
    }

    removeEventListeners(){
        this.__removeEventListeners && this.__removeEventListeners();
    }

    remove(){
        this.removeEventListeners();
        this.domElement.parentElement && this.domElement.parentElement.removeChild(this.domElement);
    }
}

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
import * as modals from '../models/modals';
import { copyToClipboard } from '../utils';


const open = (url)=>
    window.open(url, 'fbShareWindow', 'height=450, width=550, top=' + (window.innerHeight / 2 - 275) + ', left=' + (window.innerWidth / 2 - 225) + ', toolbar=0, location=0, menubar=0, directories=0, scrollbars=0');


const facebookId = '224976884733659';
const description = 'Check out these beats I made using machine learning with Beat Blender';
const twitterTxt = (url)=>`${description} → ${url} #beatblender`;

const twitter = ({shareURL }) =>
    'https://twitter.com/intent/tweet?text=' + window.encodeURIComponent(twitterTxt(shareURL));

const base = 'https://experiments.withgoogle.com/ai/beat-blender/view/';

const facebook = ({ shareURL }) =>
    [`https://www.facebook.com/dialog/feed?app_id=${facebookId}`,
        '&display=popup',
        `&link=${shareURL}`,
        '&name=Beat Blender',
        `&caption=${base}`,
        `&description=${description}`,
        `&picture=${base + 'assets/share.png'}?type=png`
    ].join('');

// the html to repeat for every preset
const shareTemplate = (state)=>`
    <button class="exit"></button>
    <div class="modal-container"style="top: 50%; left:50%; transform: translate(-50%, -50%);">
        <h2>Your beats are saved at this link:</h2>
        <input class="short-url" type="text" value="${state.shareURL}"/>
        <button class="copy-link output-button">COPY LINK</button>
        <div class="social-container">
            <a class="base-button share-facebook" href="#">FACEBOOK</a>
            <a class="base-button share-twitter" href="#">TWITTER</a>
        <div/>
    </div>`;

    /*<!--a href="#" class="output-button ">EMBED CODE</a>
    <a href="#" class="output-button ">DOWNLOAD MIDI</a>
    <div class="share-embed">
        <textarea class="iframe-code">&lt;iframe width=560 height=315 src=${embedUrl} frameborder=0 allowfullscreen&gt;&lt;/iframe&gt;</textarea>
        <div class="share-center">
            <a class="copy-iframe">Copy code </a> to embed your song on a web page.
        </div>
    </div-->*/

const aboutTemplate = ()=>`
    <button class="exit"></button>
    <div class="modal-container">
        <div class="video">
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/IsZ1dzDS7Hk?enablejsapi=1&version=3&playerapiid=ytplayer" frameborder="0" allow="autoplay" encrypted-media allowfullscreen></iframe>
        </div>
        <p>
        This experiment lets you explore and create beats in a fun new way using machine learning. Just drag the circle or draw a path to discover beats. It's built using a neural network trained on over 3.8 million drum beats.
        Using <a href="https://deeplearnjs.org/" target="_blank">Deeplearn.js</a>, the neural network runs locally in your web browser. </br></br>

        Beat Blender was first presented at the 2017 NIPS conference. Built by Torin Blankensmith and Kyle Phillips from the Creative Lab and Adam Roberts from the Magenta team at Google using
        <a href="https://github.com/tensorflow/magenta/tree/master/magenta/models/music_vae" target="_blank">MusicVAE.js</a>
        and
        <a href="https://deeplearnjs.org/" target="_blank">Deeplearn.js</a>. Get the open source code on Github <a href="https://github.com/googlecreativelab/beat-blender" target="_blank">here</a>.
        </p>
    </div>`;

export class Modal extends View {

    constructor(domElement){
        super(domElement);
        this._setEventMap({
            'click .share-facebook': (event, state)=> open(facebook(state)),
            'click .share-twitter': (event, state)=> open(twitter(state)),
            'click .exit': ()=> {
                this.domElement.classList.remove('active');
                setTimeout(() => { //call exit after fade time has elapsed
                    this.emit('exit', this);

                    const video = document.querySelector('.video > iframe');
                    if(video) {
                        //pause video on exit
                        video.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
                    }

                }, 300);
            },
            'click .copy-link': (event)=>{
                const input = document.querySelector('.short-url');
                copyToClipboard(input);
                event.target.innerHTML = 'COPIED';
                event.target.classList.add('copied');
            }
        });
    }

    shouldComponentUpdate(state, previousState) {
        return state.modal !== previousState.modal;
    }

    /**
     * render the provided presets
     * @param {Object} key becomes label, value (Array) is beats
     * @return itself
     */
    render(state, previousState) {
        this.domElement.style.visibility = previousState.modal === undefined  ? 'hidden' : 'visible'; //on page load modal should be hidden
        if(state.modal === modals.ABOUT) {
            this.domElement.innerHTML = aboutTemplate(state);
            this.domElement.classList.add('active');
        } else if(state.modal === modals.SHARE) {
            this.domElement.innerHTML = shareTemplate(state);
            this.domElement.classList.add('active');
        } else {
            this.domElement.style.visibility = 'hidden';
        }
        return super.render(state, previousState);
    }
}

// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './lib-franklin.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here

function injectScript(src) {
    window.scriptsLoaded = window.scriptsLoaded || [];

    if (window.scriptsLoaded.indexOf(src)) {
        const head = document.querySelector('head');
        const script = document.createElement('script');

        script.src = src;
        script.setAttribute('async', 'true');
        head.append(script);
        window.scriptsLoaded.push(src);
    }
}


function loadLaunch() {
    window.adobeDataLayer = window.adobeDataLayer || [];

    const src = window.location.host === 'www.scaus.art'
        ? 'https://assets.adobedtm.com/f169d022e5ee/136e9e839aa8/launch-cbee0d70fe5b-development.min.js'
        : 'https://assets.adobedtm.com/f169d022e5ee/136e9e839aa8/launch-cbee0d70fe5b-development.min.js';
    injectScript(src);
}

loadLaunch();


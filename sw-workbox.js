const SW_VERSION = "0.9.051";
/*
    This is a boilerplate for a simple PWA service worker.
    When you want to create a new version of the service worker then
    
        1) Change the SW_VERSION above.
        2) run "nxp workbox-cli injectManifest"

    The web browser client should just do

      import("pwa.js");

    This in turn imports "pwa-not-cached.js".
    Any changes should be done to this later file which is not cached.

    This have been tested with GitHub Pages.
*/

// https://www.npmjs.com/package/workbox-sw
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

const logStyle = "background:blue; color:white; padding:2px; border-radius:2px;";
const logStrongStyle = logStyle + " font-size:18px;";
let swName = "PWA service worker";
function logConsole(...msg) {
    // console.log(`%c${swName}`, logStyle, ...msg);
}
function logStrongConsole(...msg) { console.log(`%c${swName}`, logStrongStyle, ...msg); }

logStrongConsole(`Service worker SW_VERSION=${SW_VERSION}`);

workbox.precaching.precacheAndRoute([{"revision":"52cc3d53b40a853994adfac4e28035d0","url":"hour.html"},{"revision":"104b7da4d74d59b641ffb764822d1850","url":"hour.svg"},{"revision":"6bfe278097e33ae7bdf4bddd1fdc2155","url":"hour2.svg"},{"revision":"2a7ad499bbb3d1444b3229a3e84e73aa","url":"manifest.json"},{"revision":"ca4894427b33cb53aea7033f2cdb1ad7","url":"pwa-not-cached.js"},{"revision":"b6fa873eafa07087d37ae6642c0c919f","url":"pwa.js"},{"revision":"9733a10260c76a60abfe450622e5201a","url":"workbox-config.js"}]);




self.addEventListener("message", errorHandlerAsyncEvent(async evt => {
    // FIX-ME: Do something when ping/keyChanged during login???
    // https://github.com/firebase/firebase-js-sdk/issues/1164
    if (evt.data?.eventType == "ping") return;
    if (evt.data?.eventType == "keyChanged") return;

    let msgType = "(NO TYPE)";
    if (evt.data) { msgType = evt.data.type; }
    logConsole("Message", { evt, msgType });
    if (evt.data) {
        switch (msgType) {
            case 'TELL_SW_NAME':
                swName = evt.data.SW_NAME;
                logStrongConsole(`got my file name "${swName}"`)
                break;
            case 'GET_VERSION':
                logStrongConsole(`GET_VERSION: ${SW_VERSION}`);
                // https://web.dev/two-way-communication-guide/
                evt.ports[0].postMessage(SW_VERSION);
                break;
            case 'SKIP_WAITING':
                // https://developer.chrome.com/docs/workbox/handling-service-worker-updates/
                self.skipWaiting();
                break;
            default:
                console.error("Unknown message data.type", { evt });
        }
    }
}));

function errorHandlerAsyncEvent(asyncFun) {
    // console.warn("typeof asyncFun", typeof asyncFun);
    return function (evt) {
        asyncFun(evt).catch(err => {
            console.log("handler", err);
            // debugger;
            throw err;
        })
    }
}

const SW_VERSION = "0.9.106";

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

workbox.precaching.precacheAndRoute([{"revision":"d0ebd014d8208e07e9a1c47ffa9c09aa","url":"hour.html"},{"revision":"104b7da4d74d59b641ffb764822d1850","url":"hour.svg"},{"revision":"6bfe278097e33ae7bdf4bddd1fdc2155","url":"hour2.svg"},{"revision":"bd8902a5e61cc2f23f87b2e8c713e08e","url":"manifest.json"},{"revision":"af4a0b3abfb474acebe92454e29e54e8","url":"pwa-not-cached.js"},{"revision":"4a0f558ef423fe0725a749a06f4bdcd5","url":"pwa.js"},{"revision":"9733a10260c76a60abfe450622e5201a","url":"workbox-config.js"}]);




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

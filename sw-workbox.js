// https://www.npmjs.com/package/workbox-sw
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');
const SW_VERSION = "0.0.39";
const logColors = "color: green; background: yellow;";
console.log(`%cThis is service worker SW_VERSION=${SW_VERSION}`, logColors);

workbox.precaching.precacheAndRoute([{"revision":"9e07e4d2b0108fe0f7081ef7d201594c","url":"hour.html"},{"revision":"104b7da4d74d59b641ffb764822d1850","url":"hour.svg"},{"revision":"6bfe278097e33ae7bdf4bddd1fdc2155","url":"hour2.svg"},{"revision":"2a7ad499bbb3d1444b3229a3e84e73aa","url":"manifest.json"}]);




self.addEventListener("message", errorHandlerAsyncEvent(async evt => {
    // FIX-ME: Do something when ping/keyChanged during login???
    // https://github.com/firebase/firebase-js-sdk/issues/1164
    if (evt.data?.eventType == "ping") return;
    if (evt.data?.eventType == "keyChanged") return;

    let msgType = "(NO TYPE)";
    if (evt.data) {
        msgType = evt.data.type;
    }
    console.log("%cservice-worker message", logColors, { evt, msgType });
    if (evt.data) {
        switch (msgType) {
            case 'GET_VERSION':
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
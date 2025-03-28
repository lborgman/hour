// See pwa.js for documentation
const SW_VERSION = "0.9.291";

// https://www.npmjs.com/package/workbox-sw
const urlWorkbox = 'https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js';


const logStyle = "background:blue; color:white; padding:2px; border-radius:2px;";
const logStrongStyle = logStyle + " font-size:18px;";
let swName = "PWA service worker";

function logConsole(...msg) {
    // console.log(`%c${swName}`, logStyle, ...msg);
}
function logStrongConsole(...msg) { console.log(`%c${swName}`, logStrongStyle, ...msg); }



logStrongConsole(`Service worker SW_VERSION=${SW_VERSION}`);



importScripts(urlWorkbox);
workbox.precaching.precacheAndRoute([{"revision":"b0a78421af923baebb18919f8701abde","url":"hour.html"},{"revision":"104b7da4d74d59b641ffb764822d1850","url":"hour.svg"},{"revision":"6bfe278097e33ae7bdf4bddd1fdc2155","url":"hour2.svg"},{"revision":"f93701e07741c718b1b84a319ed4ff65","url":"pwa-not-cached.js"},{"revision":"80e72f7af45a37a85211ab403845c228","url":"pwa.js"},{"revision":"60e7a81b2c2c6bf66b43c97a5b1f0ce5","url":"sw-reset.js"},{"revision":"5ab96a535ccf032be938484962af2632","url":"workbox-config.js"}]);




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

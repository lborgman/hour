// See pwa.js for documentation

const version = "1.0.0";
export function getVersion() { return version; }

let pwaFuns;

const logStyle = "background:yellowgreen; color:black; padding:2px; border-radius:2px;";
const logStrongStyle = logStyle + " font-size:18px;";
const styleInstallEvents = logStrongStyle + "color:red;";
function logConsole(...msg) {
    // console.log(`%cpwa-nc.js`, logStyle, ...msg);
}
function logStrongConsole(...msg) {
    console.log(`%cpwa-nc.js`, logStrongStyle, ...msg);
    // debugger;
    addScreenDebugRow(...msg);
}
function warnConsole(...msg) { console.warn(`%cpwa-nc.js`, logStyle, ...msg); }
function logInstallEvent(...msg) { console.log("%cpwa-nc", styleInstallEvents, ...msg); }


logStrongConsole(`here is module pwa-not-cached.js, ver 3, ${import.meta.url}`);



const msPleaseWaitUpdating = 4000;
let funVersion;
// const idDebugSection = "pwa-debug-output";
// let secDebug;
let swVersion;
let instWorkbox;
let canUpdateNow = false;
let ourUrlSW;


const url = new URL(import.meta.url);
const params = [...url.searchParams.keys()];
if (params.length != 1 || params[0] != "nocache") {
    throw Error(`There should be only one parameter, "nocache"`);
}

if (document.currentScript) throw Error("import .currentScript"); // is module
if (!import.meta.url) throw Error("!import.meta.url"); // is module

export function startSW(urlSW) {
    ourUrlSW = urlSW;
    logStrongConsole("startSW", ourUrlSW);
    addDebugSWinfo();
    checkPWA();
    setupForInstall();
    setupServiceWorker();
}

function addDebugLocation(loc) {
    const inner = mkElt("a", { href: loc }, loc);
    addScreenDebugRow(inner);
    // logStrongConsole(inner);
}

async function addDebugSWinfo() {
    const regs = await navigator.serviceWorker.getRegistrations();
    addScreenDebugRow(`Registered service workers: ${regs.length}`);
    const loc = location.href;
    addDebugLocation(loc);
    const u = new URL(loc);
    u.pathname = "manifest.json";
    addDebugLocation(u.href);
    // addScreenDebugRow(`navigator.userAgentData.platform: ${navigator.userAgentData?.platform}`);
    logStrongConsole(`navigator.userAgentData.platform: ${navigator.userAgentData?.platform}`);
}

async function checkPWA() {
    // logConsole("checkPWA");
    // https://web.dev/learn/pwa/detection/
    window.addEventListener('DOMContentLoaded', () => {
        let displayMode = 'browser tab';
        const modes = ["fullscreen", "standalone", "minimal-ui", "browser"];
        modes.forEach(m => {
            if (window.matchMedia(`(display-mode: ${m})`).matches) {
                displayMode = m;
                addScreenDebugRow(`matched media: ${displayMode}`)
            }
        });
        addScreenDebugRow(`DISPLAY_MODE_LAUNCH: ${displayMode}`);
    });
    // https://web.dev/get-installed-related-apps/
    const relatedApps = navigator.getInstalledRelatedApps ? await navigator.getInstalledRelatedApps() : [];
    addScreenDebugRow(`Related apps (${relatedApps.length}):`);
    relatedApps.forEach((app) => {
        addScreenDebugRow(`${app.id}, ${app.platform}, ${app.url}`);
    });
}

async function setupServiceWorker() {
    logConsole("setupServiceWorkder");
    // const swRegistration = await navigator.serviceWorker.register('/service-worker.js'); //notice the file name
    const wb = await getWorkbox();

    wb.addEventListener("message",
        // FIX-ME: errorHandlerAsyncEvent(async evt => {
        async evt => {
            logStrongConsole("got message", { evt });
            // snackbar, broadcastToClients, keepAliveCounter, messageSW
            const msgType = evt.data.type;
            switch (msgType) {
                default:
                    mkSnackbar(evt.data.text);
            }
            // }));
        });

    const showSkipWaitingPrompt = async (event) => {
        // Assuming the user accepted the update, set up a listener
        // that will reload the page as soon as the previously waiting
        // service worker has taken control.
        wb.addEventListener('controlling', () => {
            // At this point, reloading will ensure that the current
            // tab is loaded under the control of the new service worker.
            // Depending on your web app, you may want to auto-save or
            // persist transient state before triggering the reload.
            logStrongConsole("event controlling, doing reload");
            // debugger;
            window.location.reload();
        });

        // When `event.wasWaitingBeforeRegister` is true, a previously
        // updated service worker is still waiting.
        // You may want to customize the UI prompt accordingly.

        canUpdateNow = true;

        const updateAccepted = await promptForUpdate();

        if (updateAccepted) {
            // wb.messageSkipWaiting();
            setTimeout(() => wb.messageSkipWaiting(), msPleaseWaitUpdating);
        }
    };

    // Add an event listener to detect when the registered
    // service worker has installed but is waiting to activate.
    wb.addEventListener('waiting', (event) => {
        logStrongConsole("event waiting");
        showSkipWaitingPrompt(event);
    });

    wb.addEventListener('activated', async (event) => {
        logStrongConsole("activated");
        const regSW = await navigator.serviceWorker.getRegistration();
        const swLoc = regSW.active.scriptURL;
        logStrongConsole("activated, add error event listener", { regSW });
        regSW.active.addEventListener("error", evt => {
            logStrongConsole("activated, error event", evt);
        });
        // logStrongConsole("service worker added error event listener");
        addDebugLocation(swLoc);
    });

    // FIXME: is this supported???
    wb.addEventListener('error', (event) => {
        console.log("%cError from sw", "color:orange; background:black", { error });
    });
    wb.getSW().then(sw => {
        sw.addEventListener("error", evt => {
            console.log("%cError from getSW sw", "color:red; background:black", { error });
        });
        sw.onerror = (swerror) => {
            console.log("%cError from getSW sw", "color:red; background:black", { swerror });
        }
    }).catch(err => {
        console.log("%cError getSW addEventlistener", "color:red; background: yellow", { err });
    });

    try {
        const swRegistration = await wb.register(); //notice the file name
        // https://web.dev/two-way-communication-guide/

        // Can't use wb.messageSW because this goes to the latest registered version, not the active
        // const swVersion = await wb.messageSW({ type: 'GET_VERSION' });
        //
        // But we must check for .controller beeing null
        // (this happens during "hard reload" and when Lighthouse tests).
        // https://www.youtube.com/watch?v=1d3KgacJv1I
        if (navigator.serviceWorker.controller !== null) {
            const messageChannelName = new MessageChannel();
            // navigator.serviceWorker.controller.postMessage({ type: "TELL_SW_NAME", SW_NAME: ourUrlSW }, [messageChannelName.port2]);
            navigator.serviceWorker.controller.postMessage({ type: "TELL_SW_NAME", SW_NAME: ourUrlSW });

            const messageChannelVersion = new MessageChannel();
            messageChannelVersion.port1.onmessage = (event) => { saveVersion(event.data); };
            navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" }, [messageChannelVersion.port2]);

        } else {
            addScreenDebugRow(`Service Worker version: controller is null`);
        }

        return swRegistration;
    } catch (err) {
        console.error("Service worker registration failed", { err });
        alert(err);
        throw err;
    }
}

function saveVersion(ver) {
    swVersion = ver;
    logConsole(`Service Worker version: ${swVersion}`);
    if (funVersion) { funVersion(swVersion); }
}

export function getDisplayMode() {
    let displayMode = 'browser';
    const mqStandAlone = '(display-mode: standalone)';
    // console.log("navigator.standalone", navigator.standalone)
    if (navigator.standalone || window.matchMedia(mqStandAlone).matches) {
        displayMode = 'standalone';
    }
    return displayMode;
}

async function setupForInstall() {
    // FIX-ME: leave this here for now because it does not seem to be stable in Chromium.
    // Maybe have a close look on these?
    // https://love2dev.com/pwa/add-to-homescreen-library/
    // https://web.dev/learn/pwa/detection

    logStrongConsole("setupForInstall");
    const displayMode = getDisplayMode();
    logConsole({ displayMode });
    if (displayMode != "standalone") { logConsole("using default install!"); return; }

    // https://web.dev/customize-install/#criteria
    // Initialize deferredPrompt for use later to show browser install prompt.
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (evt) => {
        logStrongConsole(`**** beforeinstallprompt' event was fired.`);
        // Prevent the mini-infobar from appearing on mobile
        evt.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = evt;

        // Update UI notify the user they can install the PWA
        // This is only nessacary if standalone!
        // Otherwise the builtin browser install prompt can be used.
        if (getDisplayMode() != "browser") { createEltInstallPromotion(); }
    });

    window.addEventListener('appinstalled', () => {
        // Hide the app-provided install promotion
        hideInstallPromotion();
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        // Optionally, send analytics event to indicate successful install
        logConsole('PWA was installed');
    });

    const dialogInstallPromotion = mkElt("dialog", { id: "pwa2-dialog-install", class: "pwa2-dialog" }, [
        mkElt("h2", undefined, "Please install this app"),
        mkElt("p", undefined, [
            `This will add an icon to your home screen (or desktop).
            If relevant it also make it possible to share from other apps to this app.`,
        ]),
        mkElt("p", undefined, ["navigator.userAgentData.platform: ", navigator.userAgentData?.platform]),
    ]);
    // dialogInstallPromotion.style.display = "none";
    const btnInstall = mkElt("button", undefined, "Install");
    btnInstall.addEventListener("click", async (evt) => {
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // Optionally, send analytics event with outcome of user choice
        logConsole(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
    });

    const btnLater = mkElt("button", undefined, "Later");
    btnLater.addEventListener("click", (evt) => {
        logInstallEvent("dialog .remove");
        dialogInstallPromotion.remove();
    });

    dialogInstallPromotion.appendChild(btnInstall);
    dialogInstallPromotion.appendChild(btnLater);
    function showInstallPromotion() {
        logInstallEvent("showInstallPromotion");
        document.body.appendChild(dialogInstallPromotion);
        dialogInstallPromotion.showModal();
        // dialogInstallPromotion.style.display = null;
    }
    function hideInstallPromotion() {
        logInstallEvent("hideInstallPromotion");
        // dialogInstallPromotion.style.display = "none";
    }
    async function createEltInstallPromotion() {
        logInstallEvent("createEltInstallPromotion START");
        await promiseDOMready();
        logInstallEvent("createEltInstallPromotion END, display = null");
        showInstallPromotion();
    }

}


function mkSnackbar(msg, color, bgColor, left, bottom, msTime) {
    const snackbar = mkElt("aside");
    snackbar.textContent = msg;
    color = color || "red";
    bgColor = bgColor || "black";
    left = left || 20;
    bottom = bottom || 20;
    snackbar.style = `
            display: flex;
            color: ${color};
            background-color: ${bgColor};
            left: ${left}px;
            bottom: ${bottom}px;
            font-size: 16px;
            padding: 4px;
            border-radius: 4px;
        `;
    document.body.appendChild(snackbar);
    setTimeout(() => snackbar.remove(), msTime);
}


async function getWorkbox() {
    if (!instWorkbox) {
        // https://developer.chrome.com/docs/workbox/using-workbox-window
        const modWb = await import("https://storage.googleapis.com/workbox-cdn/releases/6.2.0/workbox-window.prod.mjs");
        instWorkbox = new modWb.Workbox(ourUrlSW);
    }
    if (instWorkbox) return instWorkbox
}


export function setVersionFun(fun) {
    funVersion = fun;
    // logConsole("got version fun", funVersion);
}

async function updateNow() {
    logConsole("pwa.updateNow, calling wb.messageSkipWaiting() 1");
    const wb = await getWorkbox();
    logConsole("pwa.updateNow, calling wb.messageSkipWaiting() 2");
    wb.messageSkipWaiting();
}

export function setPWAfuns(objFuns) {
    pwaFuns = objFuns;
}
function mkElt(type, attrib, inner) {
    return pwaFuns["mkElt"](type, attrib, inner);
}

async function promptForUpdate() {
    logConsole("prompt4update 1");
    const wb = await getWorkbox();
    const waitingVersion = await wb.messageSW({ type: 'GET_VERSION' });
    return pwaFuns["promptForUpdate"](waitingVersion);
}

function addScreenDebugRow(...txt) {
    if (!pwaFuns) return;
    const mark = document.createElement("span");
    mark.textContent = "PWA-NC";
    mark.style = logStyle + "margin-right:5px;";
    return pwaFuns["addScreenDebugRow"](mark, ...txt);
}

export function getMayLogToScreen() { return false; }

// https://web.dev/customize-install/#detect-launch-type
// https://web.dev/manifest-updates/
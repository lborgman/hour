const version = "1.1.6";

/*
    This is a boilerplate for handling a simple PWA.
    The current version of this file should always be available at

        https://github.com/lborgman/hour/blob/main/pwa.js

    This pwa handler consists of 3 parts:
    
        1) This file, pwa.js which can be cached.
        2) pwa-not-cached.js which is not cached. 
        3) sw-input.js - which I use myself here.

    The web browser client should just do

      import("pwa.js");

    This in turn imports "pwa-not-cached.js".
    Any changes to your PWA handling should be done to this later file
    which is not cached.


    The user will be automatically prompted to update.
    The styling of that dialog is done by adding a style sheet
    before all other style sheets. So you can easily override this.


    *** THE SERVICE WORKER FILE ***

    You can handle it whichever way you want.
    (I prefer to use Google Workbox, loaded from the internet.
    This works together with pwa-not-cached.js which also
    loads Workbord from the internet.)

    The only important thing is that it answers a request for version:

        self.addEventListener("message", async evt => {
            let msgType;
            if (evt.data) { msgType = evt.data.type; }
            if (evt.data) {
                switch (msgType) {
                    case 'GET_VERSION':
                        evt.ports[0].postMessage(SW_VERSION);
                        break;
                }
            }
        });

    I handle it the way below.
    When I want to create a the service worker file then I:
    
        1) Change the SW_VERSION at the top of sw-input.js
        2) run "nxp workbox-cli injectManifest"

    In the call to workbox-cli above the file workbox-config.js is used.
    I have just created this with

        npx workbox-cli wizard

    My code have been tested with Google Chrome web browser
    using GitHub Pages as the server.


    I plan to use these files in different small projects.
    If I need to change anything I will first try it out in
    the (toy) project "Get hour number":

        https://github.com/lborgman/hour
*/


const versions = {
    "pwa.js": version
}

export function getVersions() {
    return versions;
}


const logStyle = "background:yellowgreen; color:black; padding:2px; border-radius:2px;";
const logStrongStyle = logStyle + " font-size:18px;";
logStrongConsole("Here is pwa.js, ver 3", import.meta.url);

function logConsole(...msg) { console.log(`%cpwa.js`, logStyle, ...msg); }
function logStrongConsole(...msg) { console.log(`%cpwa.js`, logStrongStyle, ...msg); }

const idDebugSection = "pwa-debug-output";
const secDebug = document.getElementById(idDebugSection);
let mayLogToScreen = true;
function addScreenDebugRow(...txt) {
    if (!mayLogToScreen) return;
    if (secDebug == undefined) return;
    if (secDebug.parentElement == null) return;
    if (secDebug.textContent.trim() == "") {
        const btnClose = mkElt("button", undefined, "Close debug output");
        btnClose.addEventListener("click", evt => secDebug.remove());
        const rowClose = mkElt("div", undefined, btnClose);
        secDebug.appendChild(rowClose);
    }
    // logConsole(`checkPWA DEBUG: ${txt}`);
    logConsole(`SCREEN DEBUG`, [...txt].slice(1));
    // const pRow = mkElt("p", undefined, txt);
    const pRow = mkElt("p", undefined, [...txt]);
    secDebug.appendChild(pRow);
}




const urlPWA = new URL(import.meta.url);
const params = [...urlPWA.searchParams.keys()];
if (params.length > 0) console.error("pwa.js should have no parameters");
if (urlPWA.hash.length > 0) console.error("pwa.js should have no hash");


let modNotCached;

let theFunVersion;
let theEltVersion;
let updateTitle;

const secDlgUpdateTransition = 1;
const msDlgUpdateTransition = 1000 * secDlgUpdateTransition;

let secPleaseWaitUpdating = 2000;
let msPleaseWaitUpdating = 1000 * secPleaseWaitUpdating;

class WaitUntil {
    #evtName; #target; #prom;
    constructor(evtName, target) {
        this.#evtName = evtName;
        this.#target = target || window;
        this.#prom = simpleBlockUntilEvent(this.#target, this.#evtName);
    }
    promReady() { return this.#prom; }
    tellReady() { this.#target.dispatchEvent(new Event(this.#evtName)); }
}

const waitUntilNotCachedLoaded = new WaitUntil("pwa-loaded-not-cached");
async function loadNotCached() {
    let isOnLine = navigator.onLine;
    // console.log({ isOnLine });
    if (isOnLine) {
        urlPWA.pathname = urlPWA.pathname.replace("pwa.js", "pwa-not-cached.js");
        const ncVal = new Date().toISOString().slice(0, -5);
        urlPWA.searchParams.set("nocache", ncVal);
        let href = urlPWA.href;
        try {
            modNotCached = await import(href);
        } catch (err) {
            logStrongConsole(err.toString());
        }
        if (!modNotCached) {
            // If not loaded get http status code
            const f = await fetch(href);
            console.log(f);
            const msg = `*ERROR* http status ${f.status}, could not fetch file ${href}`;
            console.error(msg);
            const eltErr = document.createElement("dialog");
            eltErr.textContent = msg;
            eltErr.style = `
                background-color: red;
                color: yellow;
                padding: 1rem;
                font-size: 1.2rem;
                max-width: 300px;
            `;
            const btnClose = document.createElement("button");
            btnClose.textContent = "Close";
            btnClose.addEventListener("click", evt => { eltErr.remove(); })
            const pClose = document.createElement("p");
            pClose.appendChild(btnClose);
            eltErr.appendChild(pClose);

            document.body.appendChild(eltErr);
            eltErr.showModal();
            return;
        }
    } else {
        logStrongConsole("offline, can't load pwa-not-cached.js");
    }
    waitUntilNotCachedLoaded.tellReady();

    if (modNotCached.getMayLogToScreen) { mayLogToScreen = modNotCached.getMayLogToScreen(); }
    if (modNotCached.getSecPleaseWaitUpdating) {
        secPleaseWaitUpdating = modNotCached.getSecPleaseWaitUpdating();
        msPleaseWaitUpdating = 1000 * secPleaseWaitUpdating;
    }

    versions["pwa-not-cached.js"] = modNotCached.getVersion();
    const myFuns = {
        "mkElt": mkElt,
        "promptForUpdate": promptForUpdate,
        "addScreenDebugRow": addScreenDebugRow,
    }
    modNotCached.setPWAfuns(myFuns);
    addCSS();
    logStrongConsole("loadNotCached", { modNotCached });
}
if (navigator.onLine) {
    loadNotCached();
} else {
    window.addEventListener("online", evt => { loadNotCached(); }, { once: true });
}

function saveAppVersion(version) {
    const keyVersion = `PWA-version ${import.meta.url}`;
    localStorage.setItem(keyVersion, version);
}
function getSavedAppVersion() {
    const keyVersion = `PWA-version ${import.meta.url}`;
    return localStorage.getItem(keyVersion);
}

const waitUntilSetVerFun = new WaitUntil("pwa-set-version-fun");
export async function setVersionSWfun(funVersion) {
    theFunVersion = funVersion;
    // const keyVersion = `PWA-version ${import.meta.url}`;
    // logConsole({ keyVersion });
    if (navigator.onLine) {
        // if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
        const funVerSet = (version) => {
            // localStorage.setItem(keyVersion, version);
            saveAppVersion(version);
            if (theFunVersion) {
                const oldEltVersion = theEltVersion;
                theEltVersion = theFunVersion(version);
                if (!oldEltVersion) {
                    theEltVersion.style.cursor = "pointer";
                    theEltVersion.title = "Click to show more about version";
                    theEltVersion.addEventListener("click", evt => {
                        evt.stopPropagation();
                        const aPwsJs = mkElt("a", { href: import.meta.url, target: "_blank" }, "pwa.js");
                        const dlg = mkElt("dialog", { id: "pwa-dialog-versions" }, [
                            mkElt("h2", undefined, "PWA version info"),
                            mkElt("p", undefined, [
                                "This info is just for debugging.",
                                " More info can be found in the beginning of the file ",
                                aPwsJs,
                            ])
                        ]);
                        dlg.appendChild(mkElt("div", undefined, `App version: ${getSavedAppVersion()}`));

                        dlg.appendChild(mkElt("div", undefined, "Service Worker:"));
                        const sw = navigator.serviceWorker.controller;
                        const appendIndentedRow = (txt) => {
                            const row = mkElt("div", undefined, txt);
                            row.style.marginLeft = "10px";
                            dlg.appendChild(row);
                        }
                        if (sw == null) {
                            appendIndentedRow("null");
                        } else {
                            const u = sw.scriptURL;
                            const aSW = mkElt("a", { href: u, target: "_blank" }, u);
                            appendIndentedRow(mkElt("div", undefined, [
                                "scriptURL: ",
                                aSW
                            ]));
                            appendIndentedRow(mkElt("div", undefined, [
                                "state: ",
                                sw.state
                            ]));
                        }

                        for (const k in versions) {
                            const v = versions[k];
                            dlg.appendChild(mkElt("div", undefined, `${k}: ${v}`));
                        }
                        const btnClose = mkElt("button", undefined, "Close");
                        const divClose = mkElt("p", undefined, btnClose);
                        dlg.appendChild(divClose);
                        document.body.appendChild(dlg);
                        btnClose.addEventListener("click", evt => {
                            dlg.close();
                            dlg.remove();
                        });
                        dlg.showModal();
                        setTimeout(() => btnClose.focus(), 100);
                        // alert(`Clicked "${theEltVersion.id}"`);
                    });
                }
            }
        }
        await waitUntilNotCachedLoaded.promReady();
        modNotCached?.setVersionSWfun(funVerSet);
    } else {
        // const storedVersion = localStorage.getItem(keyVersion);
        const storedVersion = getSavedAppVersion();
        if (funVersion) { funVersion(storedVersion + " (offline)"); }
    }
    // logConsole("setVersionSWfun done");
    waitUntilSetVerFun.tellReady();
}
export async function setUpdateTitle(strTitle) {
    updateTitle = strTitle;
}
export async function startSW(urlSW) {
    if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
    const uSW = new URL(urlSW, location);

    /*
    let maybeGithubPages = false;
    let sureIsGithubPages = false;

    const path = uSW.pathname;
    console.log({ path });
    const lastIdx = path.lastIndexOf("/");
    const swOnTop = lastIdx == 0;

    let onTopProblem;
    if (!swOnTop) {
        onTopProblem = false;
    } else {
        if (["localhost", "127.0.0.1"].includes(uSW.hostname)) {
            const uGitConfig = new URL("./.git/config", uSW);
            const c = await fetch(uGitConfig);
            if (c.ok) {
                const t = await c.text();
                if (t.search("https://github.com/") > 0) {
                    // Could be an indication that GitHub Pages are used, but we can't be sure.
                    maybeGithubPages = true;
                }
            }
            const dlg = mkElt("dialog", {id:"pwa-dialog-sw-on-top"}, [
                mkElt("h2", undefined, "Service worker at top of domain"),
                mkElt("p", undefined, [
                    "The ",
                    mkElt("a", { href: uSW.href, tarrget: "_blank" }, "service worker"),
                    ` for this page is placed at the top of the domain `,
                    mkElt("a", {href:"${uSW.host}"}, `${uSW.protocol}//${uSW.host}/`),
                    `. That may lead to conflicts with other service workers in this domain.`
                ]),
            ]);
            if (maybeGithubPages) {
                dlg.appendChild(
                    mkElt("p", undefined, [
                        `A situation where this can be a problem is when you are hosting
                        several PWA:s on GitHub pages.
                        (I can't tell if you are doing that,
                        but I can see you are using GitHub for this project.)`
                    ])
                );
            }
            document.body.appendChild(dlg);
            dlg.showModal();
        } else if (uSW.hostname.slice(-10) == ".github.io") {
            sureIsGithubPages = true;
        }
    }
    */

    modNotCached?.startSW(urlSW);
}



// https://dev.to/somedood/promises-and-events-some-pitfalls-and-workarounds-elp
function simpleBlockUntilEvent(targ, evtName) {
    return new Promise(resolve => targ.addEventListener(evtName, resolve, { passive: true, once: true }));
}

function addCSS() {
    const idCSS = "css-pwa.js";
    const eltOld = document.getElementById(idCSS);
    if (eltOld) {
        return;
    }
    const eltCSS = document.createElement("style");
    eltCSS.id = idCSS;
    eltCSS.textContent =
        `
        dialog#pwa-dialog-versions {
            max-width: 300px;
            background: wheat;
            background: linear-gradient(240deg, #00819c 0%, #545b98 100%);
            color: black;
            border-radius: 4px;
            font-size: 16px;
        }

        dialog#pwa-dialog-versions::backdrop {
            background-color: black;
            opacity: 0.5;
        }

        dialog#pwa-dialog-versions a {
            color: darkblue;
        }


        dialog#pwa-dialog-update {
            background: linear-gradient(200deg, #4b6cb7 0%, #182848 100%);
            background: linear-gradient(240deg, #00819c 0%, #3a47d5 100%);
            background: linear-gradient(240deg, #00819c 0%, #2b35a3 100%);
            font-size: 1.2rem;
            color: white;
            border: 2px solid white;
            border-radius: 4px;
            max-width: 80vw;
            opacity: 1;
            transition: opacity ${secDlgUpdateTransition}s;
        }

        dialog#pwa-dialog-update>h2 {
            font-size: 1.3rem;
            font-style: italic;
        }

        dialog#pwa-dialog-update>p>button {
            font-size: 1rem;
        }

        dialog#pwa-dialog-update>p:last-child {
            display: flex;
            gap: 10px;
        }

        dialog#pwa-dialog-update::backdrop {
            background-color: black;
            opacity: 0.5;
            /* not inherited by default */
            transition: inherit;
        }

        dialog#pwa-dialog-update.transparent {
            opacity: 0;
        }

        dialog#pwa-dialog-update.transparent::backdrop {
            opacity: 0;
        }

        dialog#pwa-dialog-update.updating {
            box-shadow: 3px 5px 5px 12px rgba(255,255,127,0.75);
        }


        #pwa-debug-output {
            position: fixed;
            top: 0;
            left: 0;
            font-size: 14px;
            background-color: wheat;
            color: black;
            padding: 8px;
            box-shadow: aquamarine 8px 8px 8px;
        }

        #pwa-debug-output>p {
            margin-block-start: 0.5em;
            margin-block-end: 0.5em;
        }


    `;
    const style1 = document.querySelector("style");
    document.head.insertBefore(eltCSS, style1);
}




function mkElt(type, attrib, inner) {
    var elt = document.createElement(type);

    function addInner(inr) {
        if (inr instanceof Element) {
            elt.appendChild(inr);
        } else {
            const txt = document.createTextNode(inr.toString());
            elt.appendChild(txt);
        }
    }
    if (inner) {
        if (inner.length && typeof inner != "string") {
            for (var i = 0; i < inner.length; i++)
                if (inner[i])
                    addInner(inner[i]);
        } else
            addInner(inner);
    }
    for (var x in attrib) {
        elt.setAttribute(x, attrib[x]);
    }
    return elt;
}

let dlgPromptUpdate;
async function promptForUpdate(waitingVersion) {
    logConsole("prompt4update 1");

    // const wb = await getWorkbox();
    // logConsole("prompt4update 3");
    // const waitingVersion = await wb.messageSW({ type: 'GET_VERSION' });
    // logConsole("prompt4update 4");

    // const divErrLine = mkElt("p");
    const btnSkip = mkElt("button", undefined, "Skip");
    const btnUpdate = mkElt("button", undefined, "Update");
    const divPromptButtons = mkElt("p", undefined, [btnUpdate, btnSkip]);
    dlgPromptUpdate = mkElt("dialog", { id: "pwa-dialog-update", class: "pwa2-dialog" }, [
        mkElt("h2", undefined, updateTitle),
        mkElt("p", undefined, [
            "Update available:",
            mkElt("div", undefined, `version ${waitingVersion}`)
        ]),
        // divErrLine,
        divPromptButtons
    ]);
    document.body.appendChild(dlgPromptUpdate);
    dlgPromptUpdate.showModal();
    logConsole("prompt4update 5");

    return new Promise((resolve, reject) => {
        const evtUA = new CustomEvent("pwa-update-available");
        window.dispatchEvent(evtUA);

        btnSkip.addEventListener("click", evt => {
            logConsole("prompt4update 8");
            resolve(false);
            dlgPromptUpdate.classList.add("transparent");
            setTimeout(() => { dlgPromptUpdate.remove(); }, msDlgUpdateTransition);
        });
        btnUpdate.addEventListener("click", evt => {
            logConsole("prompt4update 9");
            dlgPromptUpdate.textContent = "Updating, please wait ...";
            // dlgPromptUpdate.style.boxShadow = "3px 5px 5px 12px rgba(255,255,255,0.75)";
            dlgPromptUpdate.classList.add("updating");
            window.onbeforeunload = null;
            resolve(true);
            theFunVersion("Updating");
            setTimeout(() => {
                console.log("adding class transparent");
                dlgPromptUpdate.classList.add("transparent");
            }, msPleaseWaitUpdating);
        });
    });
}

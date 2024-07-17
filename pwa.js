const version = "0.9.0";
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

const urlPWA = new URL(import.meta.url);
const params = [...urlPWA.searchParams.keys()];
if (params.length > 0) console.error("pwa.js should have no parameters");
if (urlPWA.hash.length > 0) console.error("pwa.js should have no hash");


let modNotCached;
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
        }
    } else {
        logStrongConsole("offline, can't load pwa-not-cached.js");
    }
    waitUntilNotCachedLoaded.tellReady();
    versions["pwa-not-cached.js"] = modNotCached.getVersion();
    addCSS();
    logStrongConsole("loadNotCached", { modNotCached });
}
if (navigator.onLine) {
    loadNotCached();
} else {
    window.addEventListener("online", evt => { loadNotCached(); }, { once: true });
}

const waitUntilSetVerFun = new WaitUntil("pwa-set-version-fun");
export async function setVersionFun(funVersion) {
    const keyVersion = `PWA-version ${import.meta.url}`;
    // logConsole({ keyVersion });
    if (navigator.onLine) {
        // if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
        const funVerSet = (version) => {
            localStorage.setItem(keyVersion, version);
            if (funVersion) { funVersion(version); }
        }
        await waitUntilNotCachedLoaded.promReady();
        modNotCached?.setVersionFun(funVerSet);
    } else {
        const storedVersion = localStorage.getItem(keyVersion);
        if (funVersion) { funVersion(storedVersion + " (offline)"); }
    }
    // logConsole("setVersionFun done");
    waitUntilSetVerFun.tellReady();
}
export async function setUpdateTitle(strTitle) {
    if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
    modNotCached?.setUpdateTitle(strTitle);
}
export async function startSW(urlSW) {
    if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
    // await waitUntilSetVerFun.promReady();
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
    /* transition: opacity ${secDlgTransition}s; */
    eltCSS.textContent =
        `
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
            transition: opacity 1s;
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

    `;
    const style1 = document.querySelector("style");
    document.head.insertBefore(eltCSS, style1);
}
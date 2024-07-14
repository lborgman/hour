const logStyle = "background:yellowgreen; color:black; padding:2px; border-radius:2px;";
const logStrongStyle = logStyle + " font-size:18px;";
logStrongConsole("Here is pwa.js, ver 3", import.meta.url);

function logConsole(...msg) { console.log(`%cpwa.js`, logStyle, ...msg); }
function logStrongConsole(...msg) { console.trace(`%cpwa.js`, logStrongStyle, ...msg); }

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
    console.log({ isOnLine });
    if (isOnLine) {
        urlPWA.pathname = urlPWA.pathname.replace("pwa.js", "pwa-not-cached.js");
        const ncVal = new Date().toISOString().slice(0, -5);
        urlPWA.searchParams.set("nocache", ncVal);
        try {
            modNotCached = await import(urlPWA.href);
        } catch (err) {
            logStrongConsole(err.toString());
        }
    } else {
        logStrongConsole("offline, can't load pwa-not-cached.js");
    }
    waitUntilNotCachedLoaded.tellReady();
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
    logStrongConsole({ keyVersion });
    if (navigator.onLine) {
        // if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
        const funVerSet = (version) => {
            localStorage.setItem(keyVersion, version);
            funVersion(version);
        }
        await waitUntilNotCachedLoaded.promReady();
        modNotCached.setVersionFun(funVerSet);
    } else {
        const storedVersion = localStorage.getItem(keyVersion);
        funVersion(storedVersion + " (offline)");
    }
    logStrongConsole("funVersion done");
    waitUntilSetVerFun.tellReady();
}

export async function startSW(urlSW) {
    if (navigator.onLine) { await waitUntilNotCachedLoaded.promReady(); }
    await waitUntilSetVerFun.promReady();
    modNotCached?.startSW(urlSW);
}



// https://dev.to/somedood/promises-and-events-some-pitfalls-and-workarounds-elp
function simpleBlockUntilEvent(targ, evtName) {
    return new Promise(resolve => targ.addEventListener(evtName, resolve, { passive: true, once: true }));
}
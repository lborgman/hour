console.log("Here is pwa.js, ver 3", import.meta.url);

const url = new URL(import.meta.url);
const params = [...url.searchParams.keys()];
if (params.length > 0) console.error("pwa.js should have no parameters");
if (url.hash.length > 0) console.error("pwa.js should have no hash");

url.pathname = url.pathname.replace("pwa.js", "pwa-not-cached.js");
const ncVal = new Date().toISOString().slice(0, -5);
url.searchParams.set("nocache", ncVal);

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

const waitUntilLoaded = new WaitUntil("pwa-loaded-not-cached");
async function loadNotCached() {
    try {
        modNotCached = await import(url.href);
        waitUntilLoaded.tellReady();
    } catch (err) {
        console.error(err);
    }
    console.log(loadNotCached, { modNotCached });
}
if (navigator.onLine) {
    loadNotCached();
} else {
    window.addEventListener("online", evt => { loadNotCached(); }, { once: true });
}

const waitUntilSetVerFun = new WaitUntil("pwa-set-version-fun");
export async function setVersionFun(funVersion) {
    await waitUntilLoaded.promReady();
    modNotCached.setVersionFun(funVersion);
    waitUntilSetVerFun.tellReady();
}

export async function startSW(urlSW) {
    await waitUntilLoaded.promReady();
    await waitUntilSetVerFun.promReady();
    return modNotCached.startSW(urlSW);
}



// https://dev.to/somedood/promises-and-events-some-pitfalls-and-workarounds-elp
function simpleBlockUntilEvent(targ, evtName) {
    return new Promise(resolve => targ.addEventListener(evtName, resolve, { passive: true, once: true }));
}
console.log("Here is pwa.js, ver 3", import.meta.url);

const url = new URL(import.meta.url);
const params = [...url.searchParams.keys()];
if (params.length > 0) console.error("pwa.js should have no parameters");
if (url.hash.length > 0) console.error("pwa.js should have no hash");

url.pathname = url.pathname.replace("pwa.js", "pwa-not-cached.js");
const ncVal = new Date().toISOString().slice(0, -5);
url.searchParams.set("nocache", ncVal);
const modNotCached = await import(url.href);
console.log({modNotCached});

export function setVersionFun(funVersion) {
    return modNotCached.setVersionFun(funVersion);
}

export function startSW(urlSW) {
    return modNotCached.startSW(urlSW);
}
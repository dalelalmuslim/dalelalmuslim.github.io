function getWindowApi() {
    return typeof window !== 'undefined' ? window : null;
}

function normalizeHash(hash) {
    if (!hash) return '#';
    return String(hash).startsWith('#') ? String(hash) : `#${hash}`;
}

function updateHistory(method, state, url) {
    const win = getWindowApi();
    const historyApi = win?.history;
    const handler = historyApi?.[method];
    if (typeof handler !== 'function') return false;

    try {
        handler.call(historyApi, state ?? null, '', url);
        return true;
    } catch (error) {
        return false;
    }
}

export function getCurrentHash() {
    return getWindowApi()?.location?.hash || '';
}

export function pushHashState(state, hash) {
    return updateHistory('pushState', state, normalizeHash(hash));
}

export function replaceHashState(state, hash) {
    return updateHistory('replaceState', state, normalizeHash(hash));
}

export function replacePathState(pathname) {
    const win = getWindowApi();
    return updateHistory('replaceState', null, pathname || win?.location?.pathname || '/');
}

export function goBack() {
    const win = getWindowApi();
    if (!win?.history?.back) return false;

    try {
        win.history.back();
        return true;
    } catch (error) {
        return false;
    }
}

export function scrollToTop(behavior = 'smooth') {
    const win = getWindowApi();
    if (!win?.scrollTo) return false;

    try {
        win.scrollTo({ top: 0, behavior });
        return true;
    } catch (error) {
        return false;
    }
}

export function scrollToPosition(top, behavior = 'auto') {
    const win = getWindowApi();
    if (!win?.scrollTo) return false;

    try {
        win.scrollTo({ top: Math.max(0, Number(top) || 0), behavior });
        return true;
    } catch (error) {
        return false;
    }
}

export function getScrollY() {
    const win = getWindowApi();
    return Math.max(0, Number(win?.scrollY) || 0);
}

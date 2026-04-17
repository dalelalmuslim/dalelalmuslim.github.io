function getNavigatorApi() {
    return typeof navigator !== 'undefined' ? navigator : null;
}

export function vibrateDevice(pattern) {
    const nav = getNavigatorApi();
    if (typeof nav?.vibrate !== 'function') {
        return false;
    }

    try {
        return Boolean(nav.vibrate(pattern));
    } catch (error) {
        return false;
    }
}

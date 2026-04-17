let lastStorageError = null;

function resetLastStorageError() {
    lastStorageError = null;
}

function captureStorageError(error) {
    lastStorageError = error || null;
}

export function getLastStorageError() {
    return lastStorageError;
}

function resolveStorage() {
    try {
        if (typeof globalThis === 'undefined' || !globalThis.localStorage) return null;
        return globalThis.localStorage;
    } catch (error) {
        captureStorageError(error);
        return null;
    }
}

export function getStorageAvailability() {
    const storage = resolveStorage();
    if (!storage) {
        return {
            available: false,
            persistent: false,
            reason: 'local_storage_unavailable',
            error: getLastStorageError()
        };
    }

    try {
        const probeKey = '__azkar_storage_probe__';
        storage.setItem(probeKey, '1');
        storage.removeItem(probeKey);
        resetLastStorageError();
        return {
            available: true,
            persistent: true,
            reason: 'ready',
            error: null
        };
    } catch (error) {
        captureStorageError(error);
        return {
            available: false,
            persistent: false,
            reason: 'local_storage_blocked',
            error
        };
    }
}

export function getStorageItem(key) {
    if (!key) return null;
    const storage = resolveStorage();
    if (!storage) return null;

    try {
        const value = storage.getItem(String(key));
        resetLastStorageError();
        return value;
    } catch (error) {
        captureStorageError(error);
        return null;
    }
}

export function setStorageItem(key, value) {
    if (!key) return false;
    const storage = resolveStorage();
    if (!storage) return false;

    try {
        storage.setItem(String(key), String(value ?? ''));
        resetLastStorageError();
        return true;
    } catch (error) {
        captureStorageError(error);
        return false;
    }
}

export function removeStorageItem(key) {
    if (!key) return false;
    const storage = resolveStorage();
    if (!storage) return false;

    try {
        storage.removeItem(String(key));
        resetLastStorageError();
        return true;
    } catch (error) {
        captureStorageError(error);
        return false;
    }
}

export function getJSONStorageItem(key, fallback = null) {
    const rawValue = getStorageItem(key);
    if (!rawValue) return fallback;

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        return fallback;
    }
}

export function setJSONStorageItem(key, value) {
    return setStorageItem(key, JSON.stringify(value ?? null));
}

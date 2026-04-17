import { storage } from './index.js';

export function getStorageState() {
    return storage?.state || null;
}

export function persistStorageState(options) {
    storage?.quickSave?.(options);
}

export function updateStorageState(mutator, { save = true } = {}) {
    const state = getStorageState();
    if (!state || typeof mutator !== 'function') {
        return null;
    }

    const result = mutator(state);

    if (save) {
        persistStorageState();
    }

    return result;
}

export function createStorageTaskId(prefix = 'task') {
    return storage?.createTaskId?.(prefix) || `${prefix}_${Date.now()}`;
}

export function getStorageDateKey() {
    return storage?.getLocalDateKey?.() || '';
}

import { appLogger } from '../../shared/logging/app-logger.js';
import { getLastStorageError, setStorageItem } from '../platform/browser-storage.js';
import { showToast } from '../../app/shell/app-shell.js';

const QUICK_SAVE_DELAY_MS = 120;

function isQuotaExceededError(error) {
    return Boolean(
        error && (
            error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            error.code === 22 ||
            error.code === 1014
        )
    );
}

function notifyStorageSaveFailure(error) {
    if (isQuotaExceededError(error)) {
        showToast('التخزين ممتلئ، قد لا يتم حفظ تغييراتك.', 'error');
        return;
    }

    showToast('تعذر حفظ التغييرات الآن.', 'error');
}

function canUseWindowLifecycle() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function canUseIdleCallback() {
    return canUseWindowLifecycle() && typeof window.requestIdleCallback === 'function';
}


export function reportStoragePersistenceFailure(error, { quick = false } = {}) {
    appLogger.error(quick ? '[Storage Error] فشل الحفظ السريع، قد تكون الذاكرة ممتلئة.' : '[Storage Error] فشل الحفظ، قد تكون الذاكرة ممتلئة.', error);
    notifyStorageSaveFailure(error);
}

export function bindStoragePersistenceLifecycle(storageApi) {
    if (storageApi.persistenceLifecycleBound || !canUseWindowLifecycle()) {
        return;
    }

    const flushPendingStorage = () => {
        storageApi.flushPendingQuickSave();
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            flushPendingStorage();
        }
    });

    window.addEventListener('pagehide', flushPendingStorage);
    window.addEventListener('beforeunload', flushPendingStorage);
    storageApi.persistenceLifecycleBound = true;
}

export function cancelPendingStorageQuickSave(storageApi) {
    if (storageApi.pendingQuickSaveTimerId !== null) {
        clearTimeout(storageApi.pendingQuickSaveTimerId);
        storageApi.pendingQuickSaveTimerId = null;
    }

    if (storageApi.pendingQuickSaveIdleId !== null && canUseIdleCallback()) {
        window.cancelIdleCallback(storageApi.pendingQuickSaveIdleId);
        storageApi.pendingQuickSaveIdleId = null;
    }
}

export function writeSerializedStorageState(storageApi, serialized, { quick = false } = {}) {
    const saved = setStorageItem(storageApi.STORAGE_KEY, serialized);

    if (!saved) {
        const storageError = getLastStorageError();
        appLogger.error(quick ? '[Storage Error] فشل الحفظ السريع، قد تكون الذاكرة ممتلئة.' : '[Storage Error] فشل الحفظ، قد تكون الذاكرة ممتلئة.', storageError);
        notifyStorageSaveFailure(storageError);
        return false;
    }

    return true;
}

export function flushPendingStorageQuickSave(storageApi) {
    if (!storageApi.pendingQuickSaveDirty) {
        cancelPendingStorageQuickSave(storageApi);
        return true;
    }

    cancelPendingStorageQuickSave(storageApi);
    storageApi.pendingQuickSaveDirty = false;

    try {
        delete storageApi.state.quranBookmark;
        const serialized = JSON.stringify(storageApi.state);
        return writeSerializedStorageState(storageApi, serialized, { quick: true });
    } catch (error) {
        appLogger.error('[Storage Error] فشل الحفظ السريع، قد تكون الذاكرة ممتلئة.', error);
        notifyStorageSaveFailure(error);
        return false;
    }
}

export function scheduleStorageQuickSave(storageApi) {
    storageApi.pendingQuickSaveDirty = true;

    if (!canUseWindowLifecycle()) {
        return flushPendingStorageQuickSave(storageApi);
    }

    if (storageApi.pendingQuickSaveTimerId !== null || storageApi.pendingQuickSaveIdleId !== null) {
        return true;
    }

    const flush = () => {
        storageApi.pendingQuickSaveTimerId = null;
        storageApi.pendingQuickSaveIdleId = null;
        flushPendingStorageQuickSave(storageApi);
    };

    if (canUseIdleCallback()) {
        storageApi.pendingQuickSaveIdleId = window.requestIdleCallback(flush, { timeout: QUICK_SAVE_DELAY_MS });
        return true;
    }

    storageApi.pendingQuickSaveTimerId = window.setTimeout(flush, QUICK_SAVE_DELAY_MS);
    return true;
}

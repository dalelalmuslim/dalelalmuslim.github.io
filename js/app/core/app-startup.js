import { storage } from '../../services/storage/index.js';
import { appLogger } from '../../shared/logging/app-logger.js';
import { appEventBus } from '../events/app-event-bus.js';
import { initBottomNav } from '../ui/bottom-nav.js';

function updateStorageAvailabilityUi(appApi, status) {
    const banner = appApi.getElement('storageDegradedBanner');
    const body = typeof document !== 'undefined' ? document.body : null;

    if (body?.dataset) {
        body.dataset.storageMode = status?.persistent ? 'persistent' : 'ephemeral';
    }

    if (!banner) {
        return;
    }

    const shouldShow = Boolean(status && (!status.persistent || status.recovered));
    banner.hidden = !shouldShow;

    const message = appApi.getElement('storageDegradedBannerText');
    if (!message) {
        return;
    }

    if (!status?.persistent) {
        message.textContent = 'الحفظ الدائم غير متاح حاليًا. ستعمل بعض الميزات بدون حفظ دائم.';
        return;
    }

    if (status?.recovered) {
        message.textContent = 'تمت استعادة بيانات التطبيق بعد مشكلة سابقة في التخزين المحلي.';
        return;
    }

    message.textContent = '';
}

function setupConnectivityWatchers(appApi) {
    appApi.updateOnlineStatus();
    window.addEventListener('online', () => appApi.updateOnlineStatus());
    window.addEventListener('offline', () => appApi.updateOnlineStatus());
}

function createDefaultStorageStatus() {
    return {
        ok: true,
        fatal: false,
        persistent: true,
        recovered: false,
        stateChanged: false,
        reason: 'ready',
        error: null
    };
}

function initializeStorage(appApi) {
    const status = storage?.init?.() || createDefaultStorageStatus();
    appApi.storageStatus = status;
    appApi.recordStorageHealth?.(status);
    appEventBus.emit('app:storage-status', status);
    appApi.bootstrapStatus = {
        ...(appApi.bootstrapStatus || {}),
        storage: status
    };

    updateStorageAvailabilityUi(appApi, status);

    if (status.fatal) {
        appLogger.error('[App] Storage initialization failed with fatal status.', status.error || status);
        appApi.showToast('تعذر تهيئة بيانات التطبيق. أعد المحاولة لاحقًا.', 'error');
        return false;
    }

    if (!status.persistent) {
        appLogger.warn(`[App] Storage initialized without persistent local storage (${status.reason}).`);
        appApi.showToast('التخزين المحلي غير متاح حاليًا. ستعمل بعض الميزات بدون حفظ دائم.', 'warning');
    }

    if (status.recovered) {
        appLogger.warn('[App] Storage state was recovered during initialization.');
    }

    return true;
}

export function initializeApp(appApi) {
    if (appApi.initialized) return;
    appApi.initialized = true;

    appApi.setupRuntimeHealth?.();
    appApi.setupRuntimeDiagnostics?.();

    const canContinue = initializeStorage(appApi);
    if (!canContinue) {
        return;
    }

    setupConnectivityWatchers(appApi);
    appApi.setupServiceWorkerUpdates();
    appApi.initTheme();
    appApi.loadUserProfile();
    appApi.bindGlobalEvents();
    appApi.bindUIEvents();
    initBottomNav();
    appApi.setupSmartUpdates();
    appApi.restoreRouteFromHash();
    appApi.setupDayWatcher();
}

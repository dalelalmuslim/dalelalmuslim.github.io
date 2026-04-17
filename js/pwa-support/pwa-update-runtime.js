import { appLogger } from '../shared/logging/app-logger.js';
import { recordCacheUpdate, setPendingUpdateWorker, showUpdateBanner, updateUpdateStatus } from '../app/shell/app-shell.js';

export function listenForRegistrationUpdates(registration, notifyUpdate) {
    if (!registration) return;

    if (registration.waiting) {
        notifyUpdate(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    appLogger.info('[PWA] New update is available.');
                    notifyUpdate(newWorker);
                } else {
                    appLogger.info('[PWA] App cached for offline use.');
                }
            }
        });
    });
}

export function bindRegistrationUpdateTriggers(pwaApi) {
    if (pwaApi.updateListenersBound) return;
    pwaApi.updateListenersBound = true;

    window.addEventListener('online', () => {
        pwaApi.requestServiceWorkerUpdate('online');
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            pwaApi.requestServiceWorkerUpdate('visible');
        }
    });
}

export function bindServiceWorkerMessages(pwaApi) {
    if (pwaApi.workerMessagesBound || !navigator.serviceWorker) return;
    pwaApi.workerMessagesBound = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
        const message = event.data;
        if (!message || typeof message !== 'object') return;

        if (message.type === 'SW_ACTIVATED') {
            appLogger.info(`[PWA] Active Service Worker cache version: ${message.cacheVersion}`);
            updateUpdateStatus({
                state: navigator.onLine ? 'idle' : 'offline',
                message: 'التطبيق يعمل الآن على أحدث نسخة مفعلة.',
                detail: `الإصدار النشط: ${message.cacheVersion}`
            });
            return;
        }

        if (message.type === 'CACHE_UPDATED') {
            appLogger.info(`[PWA] Cache updated (${message.category}): ${message.url}`);
            recordCacheUpdate({ category: message.category, url: message.url });
        }
    });
}

export function notifyPendingUpdate(worker) {
    if (!worker) return;

    showUpdateBanner('يوجد تحديث جديد جاهز للتطبيق.');
    setPendingUpdateWorker(worker);
    updateUpdateStatus({
        state: 'ready',
        message: 'تم تنزيل تحديث جديد في الخلفية.',
        detail: 'اضغط "تحديث الآن" لتفعيل النسخة الجديدة.'
    });
}

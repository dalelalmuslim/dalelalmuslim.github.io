import { appLogger } from '../../shared/logging/app-logger.js';

export function formatLocalTimestamp(value) {
    if (!value) return 'لم يتم بعد';

    try {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return 'لم يتم بعد';
        return new Intl.DateTimeFormat('ar-EG', {
            hour: 'numeric',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
        }).format(date);
    } catch {
        return 'لم يتم بعد';
    }
}

export function inspectWaitingServiceWorker(context) {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration()
        .then((registration) => {
            if (!registration?.waiting) return;
            context.newWorker = registration.waiting;
            context.showUpdateBanner('يوجد تحديث جديد جاهز للتطبيق.');
            context.setUpdateStatus({
                state: 'ready',
                message: 'يوجد إصدار جديد جاهز للتطبيق الآن.',
                detail: context.updateStatus?.lastCheckedAt
                    ? `آخر فحص: ${formatLocalTimestamp(context.updateStatus.lastCheckedAt)}`
                    : 'اضغط "تحديث الآن" لتطبيقه.'
            });
        })
        .catch((error) => {
            appLogger.warn('[App] Failed to inspect waiting service worker:', error);
        });
}

export function bindControllerRefresh() {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

export function requestManualUpdateCheck(context, startedAt) {
    return navigator.serviceWorker.getRegistration()
        .then((registration) => {
            if (!registration) {
                context.setUpdateStatus({
                    state: 'error',
                    checking: false,
                    message: 'لم يتم العثور على Service Worker نشط.',
                    detail: 'أعد تحميل التطبيق أولاً ثم حاول مرة أخرى.',
                    lastCheckedAt: startedAt
                });
                context.showToast('لم يتم العثور على Service Worker نشط.', 'error');
                return null;
            }

            return registration.update().then(() => {
                const waitingWorker = registration.waiting || context.newWorker || null;
                if (waitingWorker) {
                    context.newWorker = waitingWorker;
                    context.showUpdateBanner('يوجد تحديث جديد جاهز للتطبيق.');
                    context.setUpdateStatus({
                        state: 'ready',
                        checking: false,
                        lastCheckedAt: startedAt,
                        message: 'تم العثور على تحديث جديد، ويمكنك تطبيقه الآن.',
                        detail: `آخر فحص: ${formatLocalTimestamp(startedAt)}`
                    });
                    context.showUpdateModal(waitingWorker);
                    return;
                }

                context.setUpdateStatus({
                    state: navigator.onLine ? 'idle' : 'offline',
                    checking: false,
                    lastCheckedAt: startedAt,
                    message: 'أنت على أحدث إصدار بالفعل.',
                    detail: `آخر فحص: ${formatLocalTimestamp(startedAt)}`,
                    clearChanges: !context.updatedCacheCategories?.length
                });
                setTimeout(() => context.showToast('أنت على أحدث إصدار بالفعل!', 'success'), 500);
            });
        });
}

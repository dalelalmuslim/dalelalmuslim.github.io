import { appLogger } from './shared/logging/app-logger.js';
import { bindInstallPromptUI } from './pwa-support/pwa-install-prompt.js';
import {
    bindRegistrationUpdateTriggers,
    bindServiceWorkerMessages,
    listenForRegistrationUpdates,
    notifyPendingUpdate
} from './pwa-support/pwa-update-runtime.js';
import { updateUpdateStatus } from './app/shell/app-shell.js';

export const pwa = {
    registration: null,
    initialized: false,
    updateListenersBound: false,
    workerMessagesBound: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        if (!('serviceWorker' in navigator)) {
            appLogger.warn('[PWA] Service Worker غير مدعوم في هذا المتصفح.');
            return;
        }

        bindInstallPromptUI();

        if (document.readyState === 'complete') {
            this.registerServiceWorker();
            return;
        }

        window.addEventListener('load', () => {
            this.registerServiceWorker();
        }, { once: true });
    },

    getServiceWorkerPath() {
        return './sw.js';
    },

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register(this.getServiceWorkerPath(), {
                updateViaCache: 'none'
            });
            this.registration = registration;

            appLogger.info('[PWA] Service Worker registered successfully.');
            updateUpdateStatus({
                state: navigator.onLine ? 'idle' : 'offline',
                message: navigator.onLine
                    ? 'تم تفعيل نظام التحديثات الذكية بنجاح.'
                    : 'التطبيق يعمل الآن بدون إنترنت، وسيتم الفحص عند عودة الاتصال.',
                detail: navigator.onLine
                    ? 'يمكنك البحث عن تحديثات يدويًا من صفحة الإعدادات.'
                    : 'يمكنك الاستمرار باستخدام النسخة المخزنة محليًا.'
            });

            listenForRegistrationUpdates(registration, (worker) => this.notifyUpdate(worker));
            bindRegistrationUpdateTriggers(this);
            bindServiceWorkerMessages(this);
            this.requestServiceWorkerUpdate('register');
        } catch (error) {
            appLogger.error('[PWA] Failed to register Service Worker:', error);
        }
    },

    async requestServiceWorkerUpdate(reason = 'manual') {
        if (!this.registration) return;

        try {
            await this.registration.update();
            appLogger.info(`[PWA] Service Worker update check completed (${reason}).`);
        } catch (error) {
            appLogger.warn(`[PWA] Service Worker update check failed (${reason}).`, error);
        }
    },

    notifyUpdate(worker) {
        notifyPendingUpdate(worker);
    }
};

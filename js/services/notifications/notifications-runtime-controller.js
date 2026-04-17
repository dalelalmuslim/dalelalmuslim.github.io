import {
    loadNotificationHistory,
    saveNotificationHistory
} from './notification-store.js';
import {
    isNotificationSupported,
    showBrowserNotification
} from './notification-browser.js';
import {
    getNotificationCheckKey,
    resolveDueNotifications
} from './notification-scheduler.js';

export function createNotificationsRuntimeController(host) {
    return {
        checkerIntervalId: null,
        visibilityBound: false,
        lastNotificationCheckKey: null,

        startChecker() {
            if (this.checkerIntervalId) return;

            this.checkerIntervalId = setInterval(() => this.checkTimeAndNotify(), 30000);
            setTimeout(() => this.checkTimeAndNotify(), 2000);
        },

        stopChecker() {
            if (!this.checkerIntervalId) return;

            clearInterval(this.checkerIntervalId);
            this.checkerIntervalId = null;
        },

        bindVisibility() {
            if (this.visibilityBound || typeof document === 'undefined') {
                return;
            }

            this.visibilityBound = true;
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.stopChecker();
                    return;
                }

                this.startChecker();
                this.checkTimeAndNotify();
            });
        },

        checkTimeAndNotify() {
            if (!isNotificationSupported() || Notification.permission !== 'granted') return;

            const now = new Date();
            const currentKey = getNotificationCheckKey(now);
            if (this.lastNotificationCheckKey === currentKey) return;
            this.lastNotificationCheckKey = currentKey;

            const { dueNotifications, nextHistory, historyChanged } = resolveDueNotifications({
                settings: host.settings,
                notifyHistory: loadNotificationHistory(),
                now
            });

            dueNotifications.forEach((item) => {
                this.showNotification(item.title, item.body);
            });

            if (historyChanged) {
                saveNotificationHistory(nextHistory);
            }
        },

        async showNotification(title, body) {
            if (!isNotificationSupported()) return;
            await showBrowserNotification(title, body);
        }
    };
}

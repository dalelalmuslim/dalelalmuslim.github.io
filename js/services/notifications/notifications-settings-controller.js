import { showToast } from '../../app/shell/app-shell.js';
import { azkarPreferencesStore } from '../../domains/azkar/azkar-preferences-store.js';
import { loadNotificationSettings, saveNotificationSettings } from './notification-store.js';
import { isNotificationSupported, ensureNotificationPermission } from './notification-browser.js';
import { createDefaultNotificationSettings } from './notifications-defaults.js';
import {
    bindNotificationSaveAction,
    readNotificationSettingsFromDom,
    writeNotificationSettingsToDom
} from './notification-dom.js';
import {
    buildNotificationSettingsFromAzkarPreferences,
    inferAzkarReminderPreferencesFromNotificationSettings
} from './notification-azkar-sync.js';

function describeWindow(windowKey) {
    const labels = {
        off: 'إيقاف التذكير',
        smart: 'التذكير الذكي',
        morning: 'تذكير الصباح',
        evening: 'تذكير المساء',
        prayer: 'تذكير ما بعد الصلاة'
    };
    return labels[windowKey] || 'تذكير الأذكار';
}

export function createNotificationsSettingsController(runtimeBridge = {}) {
    return {
        settings: createDefaultNotificationSettings(),

        loadSettings() {
            this.settings = loadNotificationSettings(createDefaultNotificationSettings());
            this.updateUI();
            return this.settings;
        },

        saveSettings({ showFeedback = true } = {}) {
            saveNotificationSettings(this.settings);
            if (showFeedback) {
                showToast('تم حفظ أوقات التنبيه 🔔', 'success');
            }
            return this.settings;
        },

        bindUI() {
            bindNotificationSaveAction(() => runtimeBridge.handleSaveClick?.());
        },

        updateUI() {
            writeNotificationSettingsToDom(this.settings);
        },

        syncSettingsFromDom() {
            this.settings = readNotificationSettingsFromDom(this.settings);
            return this.settings;
        },

        syncAzkarPreferenceMirror({ showFeedback = false } = {}) {
            const currentPreferences = azkarPreferencesStore.getState();
            const nextPreferences = inferAzkarReminderPreferencesFromNotificationSettings(this.settings, currentPreferences);
            azkarPreferencesStore.update({
                reminderEnabled: nextPreferences.reminderEnabled,
                reminderWindow: nextPreferences.reminderWindow
            });

            if (showFeedback) {
                showToast(`تمت مزامنة تفضيلات الأذكار مع ${describeWindow(nextPreferences.reminderWindow)}.`, 'success');
            }

            return nextPreferences;
        },

        async syncAzkarReminderPreferences(preferences, { requestPermission = false, showFeedback = false } = {}) {
            this.settings = buildNotificationSettingsFromAzkarPreferences(this.settings, preferences || azkarPreferencesStore.getState());
            this.saveSettings({ showFeedback: false });
            this.updateUI();

            let permission = isNotificationSupported() ? Notification.permission : 'unsupported';

            if ((preferences?.reminderEnabled ?? false) && requestPermission) {
                permission = await ensureNotificationPermission();
            }

            if (showFeedback) {
                if (permission === 'unsupported') {
                    showToast('تم حفظ وضع التذكير داخل الأذكار، لكن المتصفح لا يدعم الإشعارات.', 'info');
                } else if (permission === 'denied') {
                    showToast('تم حفظ وضع التذكير داخل الأذكار، لكن الإشعارات محظورة من المتصفح.', 'error');
                } else if ((preferences?.reminderEnabled ?? false) && permission !== 'granted') {
                    showToast('تم حفظ وضع التذكير داخل الأذكار. اسمح بالإشعارات لتصلك التنبيهات.', 'info');
                } else {
                    showToast(`تم ربط الأذكار مع ${describeWindow((preferences?.reminderEnabled ?? false) ? preferences?.reminderWindow : 'off')} 🔔`, 'success');
                }
            }

            return {
                settings: this.settings,
                permission
            };
        },

        async handleSaveClick() {
            if (!isNotificationSupported()) {
                showToast('المتصفح لا يدعم الإشعارات', 'error');
                return;
            }

            const permission = await ensureNotificationPermission();
            if (permission === 'unsupported') {
                showToast('المتصفح لا يدعم الإشعارات', 'error');
                return;
            }
            if (permission !== 'granted') {
                showToast(
                    permission === 'denied' ? 'الإشعارات محظورة من المتصفح' : 'يرجى السماح للإشعارات من المتصفح',
                    'error'
                );
                return;
            }

            this.syncSettingsFromDom();
            this.saveSettings({ showFeedback: false });
            const syncedPreferences = this.syncAzkarPreferenceMirror({ showFeedback: false });

            showToast(`تم حفظ أوقات التنبيه وربطها مع ${describeWindow(syncedPreferences.reminderWindow)} 🔔`, 'success');

            await runtimeBridge.showNotification?.(
                'تم تفعيل التنبيهات ✨',
                'تأكد من ترك التطبيق بالخلفية أو فتحه لاحقاً ليصلك الإشعار.'
            );
        }
    };
}

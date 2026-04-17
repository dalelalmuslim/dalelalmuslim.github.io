import { getJSONStorageItem, setJSONStorageItem } from '../platform/browser-storage.js';

const NOTIFICATION_SETTINGS_KEY = 'azkar_notifications';
const NOTIFICATION_HISTORY_KEY = 'azkar_notify_history';

export function loadNotificationSettings(defaultSettings) {
    try {
        const saved = getJSONStorageItem(NOTIFICATION_SETTINGS_KEY, null);
        if (!saved || typeof saved !== 'object') {
            return JSON.parse(JSON.stringify(defaultSettings));
        }

        return Object.keys(defaultSettings).reduce((acc, key) => {
            acc[key] = {
                ...defaultSettings[key],
                ...(saved[key] && typeof saved[key] === 'object' ? saved[key] : {})
            };
            return acc;
        }, {});
    } catch (error) {
        return JSON.parse(JSON.stringify(defaultSettings));
    }
}

export function saveNotificationSettings(settings) {
    setJSONStorageItem(NOTIFICATION_SETTINGS_KEY, settings);
}

export function loadNotificationHistory() {
    try {
        const saved = getJSONStorageItem(NOTIFICATION_HISTORY_KEY, null);
        return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
        return {};
    }
}

export function saveNotificationHistory(history) {
    setJSONStorageItem(NOTIFICATION_HISTORY_KEY, history || {});
}

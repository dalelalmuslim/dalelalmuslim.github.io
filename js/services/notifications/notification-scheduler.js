import { NOTIFICATION_SETTING_KEYS } from './notifications-defaults.js';

function toMinutes(timeValue) {
    const [hours, minutes] = String(timeValue || '00:00').split(':').map(Number);
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    return (safeHours * 60) + safeMinutes;
}

export function getNotificationCheckKey(now = new Date()) {
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
}

export function getTodayHistoryKey(now = new Date()) {
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

export function resolveDueNotifications({ settings, notifyHistory, now = new Date() }) {
    const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
    const todayDate = getTodayHistoryKey(now);
    const nextHistory = { ...(notifyHistory || {}) };
    const dueNotifications = [];

    NOTIFICATION_SETTING_KEYS.forEach(key => {
        const setting = settings?.[key];
        if (!setting?.enabled) return;

        const targetTotalMinutes = toMinutes(setting.time);
        const timeDiff = currentTotalMinutes - targetTotalMinutes;

        if (timeDiff >= 0 && timeDiff <= 240 && nextHistory[key] !== todayDate) {
            dueNotifications.push({
                key,
                title: setting.label,
                body: setting.message
            });
            nextHistory[key] = todayDate;
        }
    });

    return {
        dueNotifications,
        nextHistory,
        historyChanged: dueNotifications.length > 0
    };
}

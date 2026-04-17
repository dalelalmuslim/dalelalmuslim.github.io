export const NOTIFICATION_SETTING_KEYS = Object.freeze(['morning', 'evening', 'prayer']);

export const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
    morning: Object.freeze({ enabled: false, time: '06:00', label: 'أذكار الصباح', message: 'حان الآن موعد قراءة أذكار الصباح ☀️' }),
    evening: Object.freeze({ enabled: false, time: '16:00', label: 'أذكار المساء', message: 'حان الآن موعد قراءة أذكار المساء 🌙' }),
    prayer: Object.freeze({ enabled: false, time: '13:30', label: 'أذكار ما بعد الصلاة', message: 'خذ دقيقة هادئة لأذكار ما بعد الصلاة 🤍' })
});

export function createDefaultNotificationSettings() {
    return {
        morning: { ...DEFAULT_NOTIFICATION_SETTINGS.morning },
        evening: { ...DEFAULT_NOTIFICATION_SETTINGS.evening },
        prayer: { ...DEFAULT_NOTIFICATION_SETTINGS.prayer }
    };
}

export function getNotificationDomKey(key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
}

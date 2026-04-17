import {
    NOTIFICATION_SETTING_KEYS,
    getNotificationDomKey
} from './notifications-defaults.js';

export function writeNotificationSettingsToDom(settings) {
    NOTIFICATION_SETTING_KEYS.forEach(key => {
        const domKey = getNotificationDomKey(key);
        const toggle = document.getElementById(`notify${domKey}`);
        const timeInput = document.getElementById(`time${domKey}`);

        if (toggle) {
            toggle.checked = Boolean(settings?.[key]?.enabled);
        }

        if (timeInput) {
            timeInput.value = settings?.[key]?.time || '';
        }
    });
}

export function readNotificationSettingsFromDom(settings) {
    const nextSettings = { ...(settings || {}) };

    NOTIFICATION_SETTING_KEYS.forEach(key => {
        const domKey = getNotificationDomKey(key);
        const toggle = document.getElementById(`notify${domKey}`);
        const timeInput = document.getElementById(`time${domKey}`);

        nextSettings[key] = {
            ...(nextSettings[key] || {}),
            enabled: toggle ? Boolean(toggle.checked) : Boolean(nextSettings[key]?.enabled),
            time: timeInput?.value || nextSettings[key]?.time || '00:00'
        };
    });

    return nextSettings;
}

export function bindNotificationSaveAction(onSave) {
    const saveBtn = document.getElementById('saveNotificationsBtn');
    if (!saveBtn) return false;

    saveBtn.addEventListener('click', onSave);
    return true;
}

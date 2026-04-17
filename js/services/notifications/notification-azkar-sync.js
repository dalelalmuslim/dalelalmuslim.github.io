import { createDefaultNotificationSettings } from './notifications-defaults.js';

const WINDOW_TO_KEYS = Object.freeze({
  off: [],
  smart: ['morning', 'evening'],
  morning: ['morning'],
  evening: ['evening'],
  prayer: ['prayer']
});

export function buildNotificationSettingsFromAzkarPreferences(currentSettings = {}, preferences = {}) {
  const base = createDefaultNotificationSettings();
  const enabledKeys = new Set(
    WINDOW_TO_KEYS[preferences?.reminderEnabled === false ? 'off' : (preferences?.reminderWindow || 'smart')] || []
  );

  return Object.keys(base).reduce((acc, key) => {
    acc[key] = {
      ...base[key],
      ...(currentSettings?.[key] && typeof currentSettings[key] === 'object' ? currentSettings[key] : {}),
      enabled: enabledKeys.has(key)
    };
    return acc;
  }, {});
}

export function inferAzkarReminderPreferencesFromNotificationSettings(settings = {}, currentPreferences = {}) {
  const enabledKeys = Object.entries(settings)
    .filter(([, value]) => Boolean(value?.enabled))
    .map(([key]) => key);

  let reminderWindow = 'off';
  let reminderEnabled = false;

  if (enabledKeys.length === 0) {
    reminderWindow = 'off';
    reminderEnabled = false;
  } else if (enabledKeys.length === 1) {
    reminderWindow = enabledKeys[0];
    reminderEnabled = true;
  } else if (
    enabledKeys.length === 2
    && enabledKeys.includes('morning')
    && enabledKeys.includes('evening')
    && !enabledKeys.includes('prayer')
  ) {
    reminderWindow = 'smart';
    reminderEnabled = true;
  } else {
    reminderWindow = 'smart';
    reminderEnabled = true;
  }

  return {
    ...currentPreferences,
    reminderEnabled,
    reminderWindow
  };
}

// js/app/app-config.js

import { getStorageItem } from '../services/platform/browser-storage.js';

/**
 * @param {string} primaryKey
 * @param {readonly string[]} [legacyKeys=[]]
 */
function readStorageWithAliases(primaryKey, legacyKeys = []) {
    const keys = [primaryKey, ...Array.from(legacyKeys || [])].filter(Boolean);
    for (const key of keys) {
        const value = getStorageItem(key);
        if (value !== null && value !== undefined && value !== '') {
            return value;
        }
    }
    return null;
}

export const APP_CONFIG = Object.freeze({
    APP_ID: 'dalil-almuslim',
    APP_NAME_AR: 'دليل المسلم',
    APP_NAME_EN: 'Dalil Almuslim',
    APP_VERSION: '2.1.0',
    APP_STORAGE_NAMESPACE: 'dalil_almuslim',
    STORAGE_KEY: 'dalil_almuslim_app_state',
    STORAGE_KEY_ALIASES: Object.freeze(['azkar_data']),
    SCHEMA_VERSION: 13,
    APP_URL: 'https://azkarapp.github.io/',
    CONTENT_CACHE_NAMESPACE: 'dalil_almuslim_content_cache',
    CONTENT_VERSION_NAMESPACE: 'dalil_almuslim_content_versions',

    DEFAULTS: Object.freeze({
        DAILY_TASBEEH_TARGET: 100,
        MASBAHA_BATCH_TARGET: 33,
        THEME: 'default',
        SILENT_MODE: false
    }),

    LOCAL_STORAGE_KEYS: Object.freeze({
        DAILY_TASBEEH_TARGET: 'dalil_almuslim_daily_target',
        MASBAHA_TARGET: 'dalil_almuslim_masbaha_target',
        SILENT_MODE: 'dalil_almuslim_silent',
        CUSTOM_AZKAR_LIST: 'dalil_almuslim_custom_azkar_list',
        THEME: 'dalil_almuslim_theme'
    }),

    LEGACY_LOCAL_STORAGE_KEYS: Object.freeze({
        DAILY_TASBEEH_TARGET: Object.freeze(['azkar_daily_target']),
        MASBAHA_TARGET: Object.freeze(['masbaha_target']),
        SILENT_MODE: Object.freeze(['azkar_silent']),
        CUSTOM_AZKAR_LIST: Object.freeze(['azkar_custom_list']),
        THEME: Object.freeze(['azkar_theme'])
    }),

    CONTENT_DEFAULT_VERSIONS: Object.freeze({
        app_config: 'local-static-app-config-v1',
        azkar: 'local-static-azkar-v1',
        duas: 'local-static-duas-v1',
        stories: 'local-static-stories-v1',
        daily_content: 'local-static-daily-content-v1'
    }),

    DAILY_AYAH: Object.freeze({
        NO_REPEAT_DAYS: 100
    })
});

export function toPositiveInt(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
}

export function getDefaultSettings() {
    return {
        dailyTasbeehTarget: APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET,
        masbahaTarget: APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
        silentMode: APP_CONFIG.DEFAULTS.SILENT_MODE,
        theme: APP_CONFIG.DEFAULTS.THEME
    };
}

export function readLegacySettings() {
    return {
        dailyTasbeehTarget: toPositiveInt(
            readStorageWithAliases(
                APP_CONFIG.LOCAL_STORAGE_KEYS.DAILY_TASBEEH_TARGET,
                APP_CONFIG.LEGACY_LOCAL_STORAGE_KEYS.DAILY_TASBEEH_TARGET
            ),
            APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET
        ),
        masbahaTarget: toPositiveInt(
            readStorageWithAliases(
                APP_CONFIG.LOCAL_STORAGE_KEYS.MASBAHA_TARGET,
                APP_CONFIG.LEGACY_LOCAL_STORAGE_KEYS.MASBAHA_TARGET
            ),
            APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET
        ),
        silentMode: readStorageWithAliases(
            APP_CONFIG.LOCAL_STORAGE_KEYS.SILENT_MODE,
            APP_CONFIG.LEGACY_LOCAL_STORAGE_KEYS.SILENT_MODE
        ) === 'true',
        theme: readStorageWithAliases(
            APP_CONFIG.LOCAL_STORAGE_KEYS.THEME,
            APP_CONFIG.LEGACY_LOCAL_STORAGE_KEYS.THEME
        ) || APP_CONFIG.DEFAULTS.THEME
    };
}

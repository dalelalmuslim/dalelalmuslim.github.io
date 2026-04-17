import { APP_CONFIG, readLegacySettings } from '../../app/app-config.js';
import { isPlainObject, toSafeNumber } from './storage-normalizers-core.js';

export function normalizeSettings(settings) {
    const legacy = readLegacySettings();
    const source = isPlainObject(settings) ? settings : {};

    const rawSilentMode = source.silentMode ?? legacy.silentMode;
    const rawTheme = source.theme ?? legacy.theme;

    return {
        dailyTasbeehTarget: toSafeNumber(
            source.dailyTasbeehTarget ?? legacy.dailyTasbeehTarget,
            APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET,
            { min: 1 }
        ),
        masbahaTarget: toSafeNumber(
            source.masbahaTarget ?? legacy.masbahaTarget,
            APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
            { min: 1 }
        ),
        silentMode: typeof rawSilentMode === 'boolean'
            ? rawSilentMode
            : APP_CONFIG.DEFAULTS.SILENT_MODE,
        theme: typeof rawTheme === 'string' && rawTheme.trim()
            ? rawTheme.trim()
            : APP_CONFIG.DEFAULTS.THEME
    };
}

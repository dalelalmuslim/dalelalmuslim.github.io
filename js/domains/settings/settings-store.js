import { APP_CONFIG } from '../../app/app-config.js';
import { getStorageState, persistStorageState, updateStorageState } from '../../services/storage/storage-access.js';

function ensureSettingsState() {
    const state = getStorageState();
    if (!state) return null;

    if (!state.settings || typeof state.settings !== 'object') {
        state.settings = {
            dailyTasbeehTarget: APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET,
            masbahaTarget: APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
            silentMode: APP_CONFIG.DEFAULTS.SILENT_MODE,
            theme: APP_CONFIG.DEFAULTS.THEME
        };
    }

    return state.settings;
}

function normalizeTheme(themeName) {
    return typeof themeName === 'string' && themeName.trim()
        ? themeName.trim()
        : APP_CONFIG.DEFAULTS.THEME;
}

function normalizePositiveTarget(value, fallback) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0
        ? Math.floor(numericValue)
        : fallback;
}

export const settingsStore = {
    getState() {
        return ensureSettingsState();
    },

    persist() {
        persistStorageState();
    },

    getTheme() {
        return normalizeTheme(this.getState()?.theme);
    },

    setTheme(themeName, { save = true } = {}) {
        const safeTheme = normalizeTheme(themeName);
        const nextTheme = updateStorageState((state) => {
            const settings = ensureSettingsState();
            if (!settings) {
                return APP_CONFIG.DEFAULTS.THEME;
            }

            state.settings.theme = safeTheme;
            return state.settings.theme;
        }, { save });

        return nextTheme || APP_CONFIG.DEFAULTS.THEME;
    },

    getDailyTasbeehTarget() {
        return normalizePositiveTarget(
            this.getState()?.dailyTasbeehTarget,
            APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET
        );
    },

    setDailyTasbeehTarget(value, { save = true } = {}) {
        const safeTarget = normalizePositiveTarget(value, APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET);
        const nextTarget = updateStorageState((state) => {
            const settings = ensureSettingsState();
            if (!settings) {
                return APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET;
            }

            state.settings.dailyTasbeehTarget = safeTarget;
            return state.settings.dailyTasbeehTarget;
        }, { save });

        return Number(nextTarget) || APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET;
    },

    getMasbahaTarget() {
        return normalizePositiveTarget(
            this.getState()?.masbahaTarget,
            APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET
        );
    },

    setMasbahaTarget(value, { save = true } = {}) {
        const safeTarget = normalizePositiveTarget(value, APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET);
        const nextTarget = updateStorageState((state) => {
            const settings = ensureSettingsState();
            if (!settings) {
                return APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET;
            }

            state.settings.masbahaTarget = safeTarget;
            return state.settings.masbahaTarget;
        }, { save });

        return Number(nextTarget) || APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET;
    },

    isSilentMode() {
        return Boolean(this.getState()?.silentMode);
    },

    setSilentMode(value, { save = true } = {}) {
        const nextValue = updateStorageState((state) => {
            const settings = ensureSettingsState();
            if (!settings) {
                return false;
            }

            state.settings.silentMode = Boolean(value);
            return state.settings.silentMode;
        }, { save });

        return Boolean(nextValue);
    }
};

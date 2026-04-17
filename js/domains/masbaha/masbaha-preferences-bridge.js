import { APP_CONFIG } from '../../app/app-config.js';
import { settingsStore } from '../settings/settings-store.js';

export const masbahaPreferencesBridge = {
    getDailyTasbeehTarget() {
        return settingsStore.getDailyTasbeehTarget();
    },

    getMasbahaTarget(defaultTarget = APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET) {
        const target = settingsStore.getMasbahaTarget();
        return Number.isFinite(Number(target)) && Number(target) > 0
            ? Number(target)
            : defaultTarget;
    },

    setMasbahaTarget(currentTarget) {
        settingsStore.setMasbahaTarget(currentTarget);
        return true;
    },

    isSilentMode() {
        return settingsStore.isSilentMode();
    },

    setSilentMode(isSilent) {
        settingsStore.setSilentMode(isSilent);
        return true;
    }
};

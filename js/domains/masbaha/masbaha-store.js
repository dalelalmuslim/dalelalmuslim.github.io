import { APP_CONFIG } from '../../app/app-config.js';
import { masbahaProgressStore } from './masbaha-progress-store.js';

export function loadMasbahaPreferences({ defaultTarget, defaultSilent }) {
    return {
        currentTarget: masbahaProgressStore.getMasbahaTarget(defaultTarget ?? APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET),
        isSilent: typeof masbahaProgressStore.isSilentMode === 'function'
            ? masbahaProgressStore.isSilentMode()
            : Boolean(defaultSilent)
    };
}

export function persistMasbahaTarget(currentTarget) {
    return masbahaProgressStore.setMasbahaTarget(currentTarget);
}

export function persistSilentMode(isSilent) {
    return masbahaProgressStore.setSilentMode(isSilent);
}

export function getCurrentSessionTasbeeh() {
    return masbahaProgressStore.getCurrentSessionTasbeeh();
}

export function incrementMasbaha(step = 1) {
    return masbahaProgressStore.incrementTasbeeh(step);
}

export function resetCurrentSession() {
    return masbahaProgressStore.resetCurrentSession();
}

export function loadCustomAzkarList() {
    return masbahaProgressStore.getCustomAzkarList();
}

export function persistCustomAzkarList(customAzkar) {
    return masbahaProgressStore.setCustomAzkarList(customAzkar);
}

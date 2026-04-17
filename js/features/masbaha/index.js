// js/features/masbaha/index.js
//
// Responsibility: public feature contract for the Masbaha section.
// Exposes capabilities consumed by click-action-map.

import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';
import { masbahaControllerApi } from './masbaha-controller.js';

function refreshMasbahaSurface() {
    masbahaControllerApi?.updateUI?.();
}

export const masbahaFeature = defineFeatureApi({
    id: 'masbaha',
    title: 'المسبحة الذكية',

    init({ app }) {
        app.safeInit('feature:masbaha:init', () => masbahaControllerApi?.init?.());
    },

    enter({ app }) {
        app.safeInit('feature:masbaha:refresh', refreshMasbahaSurface);
    },

    refresh({ app }) {
        app.safeInit('feature:masbaha:refresh', refreshMasbahaSurface);
    },

    leave() {
        masbahaControllerApi?.closeAllMasbahaOverlays?.();
    },

    capabilities: {
        refreshSurface:         refreshMasbahaSurface,
        updateUI:               () => masbahaControllerApi?.updateUI?.(),
        updateTarget:           () => masbahaControllerApi?.updateTarget?.(),
        toggleSilent:           () => masbahaControllerApi?.toggleSilent?.(),
        increment:              () => masbahaControllerApi?.increment?.(),
        reset:                  () => masbahaControllerApi?.reset?.(),
        // Zikr sheet (new)
        openZikrSheet:          () => masbahaControllerApi?.openZikrSheet?.(),
        closeZikrSheet:         () => masbahaControllerApi?.closeZikrSheet?.(),
        saveCustomEntry:        () => masbahaControllerApi?.saveCustomEntry?.(),
        confirmDeleteEntry:     () => masbahaControllerApi?.confirmDeleteEntry?.(),
        closeDeleteEntryModal:  () => masbahaControllerApi?.closeDeleteEntryModal?.(),
        confirmReset:           () => masbahaControllerApi?.confirmReset?.(),
        closeResetModal:        () => masbahaControllerApi?.closeResetModal?.(),
        // Legacy shims — kept for safety
        openCustomEntriesModal:  () => masbahaControllerApi?.openZikrSheet?.(),
        closeCustomEntriesModal: () => masbahaControllerApi?.closeZikrSheet?.(),
    },
});

export const masbahaSection = masbahaFeature;

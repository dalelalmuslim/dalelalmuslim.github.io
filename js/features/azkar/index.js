import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';
import { azkarController } from './azkar-controller.js';

function refreshAzkarSurface() {
    azkarController?.renderAzkarCategories?.();
}

export const azkarFeature = defineFeatureApi({
    id: 'azkar',
    title: 'الأذكار اليومية',
    init({ app }) {
        app.safeInit('feature:azkar:init', () => azkarController?.init?.());
    },
    enter({ app }) {
        app.safeInit('feature:azkar:refresh', refreshAzkarSurface);
    },
    refresh({ app }) {
        app.safeInit('feature:azkar:refresh', refreshAzkarSurface);
    },
    leave() {
        azkarController?.resetAzkarView?.();
    },
    capabilities: {
        refreshSurface: refreshAzkarSurface,
        openCategory: (key, title) => azkarController?.openAzkarCategory?.(key, title),
        closeCategory: () => azkarController?.closeAzkarCategory?.(),
        renderCategories: () => azkarController?.renderAzkarCategories?.(),
        resumeCategory: () => azkarController?.resumeCategory?.(),
        setFilter: filterKey => azkarController?.setFilter?.(filterKey),
        toggleFocusMode: () => azkarController?.toggleFocusMode?.(),
        toggleLargeText: () => azkarController?.toggleLargeText?.(),
        toggleVibration: () => azkarController?.toggleVibration?.(),
        toggleFavorite: () => azkarController?.toggleFavorite?.(),
        cycleReminderWindow: () => azkarController?.cycleReminderWindow?.(),
        toggleSmartOrdering: () => azkarController?.toggleSmartOrdering?.()
    }
});

export const azkarSection = azkarFeature;

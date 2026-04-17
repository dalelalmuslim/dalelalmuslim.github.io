// js/features/home/index.js
//
// Responsibility: public feature API for the Home section.
// Wires stats subscription → surface refresh.
// Delegates all rendering to home-feed-controller.

import { APP_CONFIG } from '../../app/app-config.js';
import { appLogger } from '../../shared/logging/app-logger.js';
import { scheduleRender } from '../../shared/render/render-scheduler.js';
import { onStatsChanged } from '../../domains/stats/stats-events.js';
import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';
import {
    initHomeContent,
    refreshDailyContent,
    renderHomeSmartResume,
    renderHomeProgressStrip,
} from './home-feed-controller.js';

let removeStatsSubscription = null;

function refreshHomeSurface() {
    scheduleRender('home-surface-render', () => {
        renderHomeProgressStrip();

        renderHomeSmartResume().catch(err => {
            appLogger.error('[Home] renderHomeSmartResume failed on surface refresh:', err);
        });
    });
}

function ensureHomeSubscriptions() {
    if (removeStatsSubscription) return;
    removeStatsSubscription = onStatsChanged(() => refreshHomeSurface());
}

export const homeFeature = defineFeatureApi({
    id: 'home',
    title: APP_CONFIG.APP_NAME_AR,

    init({ app }) {
        ensureHomeSubscriptions();
        app.safeInit('feature:home:init', () => initHomeContent());
    },

    enter() {
        refreshHomeSurface();
    },

    refresh() {
        refreshHomeSurface();
    },

    dispose() {
        removeStatsSubscription?.();
        removeStatsSubscription = null;
    },

    capabilities: {
        refreshSurface:      refreshHomeSurface,
        refreshDailyContent: () => refreshDailyContent(),
        renderProgressStrip: () => renderHomeProgressStrip(),
    },
});

export const homeSection = homeFeature;

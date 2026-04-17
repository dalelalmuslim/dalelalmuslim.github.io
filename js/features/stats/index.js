import { scheduleRender } from '../../shared/render/render-scheduler.js';
import { onStatsChanged } from '../../domains/stats/stats-events.js';
import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';
import { statsController } from './stats-controller.js';

let removeStatsChangedSubscription = null;

function refreshStatsSurface() {
    statsController?.refreshSurface?.();
}

function ensureStatsSubscriptions() {
    if (removeStatsChangedSubscription) return;

    removeStatsChangedSubscription = onStatsChanged(() => {
        scheduleRender('stats-render', refreshStatsSurface);
    });
}

export const statsFeature = defineFeatureApi({
    id: 'stats',
    title: 'الإحصائيات والمتابعة',
    init({ app }) {
        ensureStatsSubscriptions();
        app.safeInit('feature:stats:init', () => statsController?.init?.());
    },
    enter({ app }) {
        app.safeInit('feature:stats:refresh', refreshStatsSurface);
    },
    refresh({ app }) {
        app.safeInit('feature:stats:refresh', refreshStatsSurface);
    },
    dispose() {
        removeStatsChangedSubscription?.();
        removeStatsChangedSubscription = null;
    },
    capabilities: {
        refreshSurface: refreshStatsSurface
    }
});

export const statsSection = statsFeature;

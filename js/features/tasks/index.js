import { scheduleRender } from '../../shared/render/render-scheduler.js';
import { onStatsChanged } from '../../domains/stats/stats-events.js';
import { tasks } from './tasks-controller.js';
import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';

let removeStatsChangedSubscription = null;

function refreshTasksSurface() {
    tasks?.refreshSurface?.();
}

function ensureTasksSubscriptions() {
    if (removeStatsChangedSubscription) return;

    removeStatsChangedSubscription = onStatsChanged(() => {
        scheduleRender('tasks-header-render', () => tasks?.refreshHeader?.());
    });
}

export const tasksFeature = defineFeatureApi({
    id: 'tasks',
    title: 'المهام اليومية',
    init({ app }) {
        ensureTasksSubscriptions();
        app.safeInit('feature:tasks:init', () => tasks?.init?.());
    },
    enter({ app }) {
        app.safeInit('feature:tasks:refresh', refreshTasksSurface);
    },
    refresh({ app }) {
        app.safeInit('feature:tasks:refresh', refreshTasksSurface);
    },
    dispose() {
        removeStatsChangedSubscription?.();
        removeStatsChangedSubscription = null;
    },
    capabilities: {
        refreshSurface: refreshTasksSurface,
        refreshHeader: () => tasks?.refreshHeader?.(),
        addTask: () => tasks?.addTask?.(),
        openRestoreDefaultsModal: () => tasks?.restoreDefaultTasks?.(),
        closeRestoreDefaultsModal: () => tasks?.closeRestoreModal?.(),
        confirmRestoreDefaults: () => tasks?.confirmRestoreTasks?.(),
        confirmDelete: () => tasks?.confirmDeleteTask?.(),
        closeDeleteTaskModal: () => tasks?.closeDeleteTaskModal?.()
    }
});

export const tasksSection = tasksFeature;

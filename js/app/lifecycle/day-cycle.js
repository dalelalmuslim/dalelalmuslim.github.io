import { storage } from '../../services/storage/index.js';
import { getFeatureCapabilities } from '../../features/index.js';
import { emitStatsChanged } from '../../domains/stats/stats-events.js';
import { appEventBus } from '../events/app-event-bus.js';
import { appLogger } from '../../shared/logging/app-logger.js';

export function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createDayCycleTaskEntries() {
    const homeCapabilities = getFeatureCapabilities('home');
    const masbahaCapabilities = getFeatureCapabilities('masbaha');
    const azkarCapabilities = getFeatureCapabilities('azkar');
    const tasksCapabilities = getFeatureCapabilities('tasks');
    const statsCapabilities = getFeatureCapabilities('stats');
    const quranCapabilities = getFeatureCapabilities('quran');

    return [
        ['storage.checkNewDay', () => storage?.checkNewDay?.()],
        ['masbaha.refreshSurface', () => masbahaCapabilities?.refreshSurface?.()],
        ['azkar.refreshSurface', () => azkarCapabilities?.refreshSurface?.()],
        ['tasks.refreshSurface', () => tasksCapabilities?.refreshSurface?.()],
        ['stats.refreshSurface', () => statsCapabilities?.refreshSurface?.()],
        ['quran.checkBookmark', () => quranCapabilities?.checkBookmark?.()],
        ['home.refreshDailyContent', () => homeCapabilities?.refreshDailyContent?.()]
    ];
}

function normalizeDayCycleFailure(task, error) {
    return {
        task,
        message: error?.message || String(error || 'Unknown day-cycle failure')
    };
}

function runDayCycleTasks(taskEntries = []) {
    const successes = [];
    const failures = [];

    taskEntries.forEach(([taskName, task]) => {
        if (typeof task !== 'function') {
            return;
        }

        try {
            task();
            successes.push(taskName);
        } catch (error) {
            failures.push(normalizeDayCycleFailure(taskName, error));
            appLogger.error(`[DayCycle] Task failed: ${taskName}`, error);
        }
    });

    return {
        successes,
        failures,
        ok: failures.length === 0
    };
}

export function setupDayWatcher() {
    this.lastKnownDateKey = this.getLocalDateKey();
    if (this.dayWatcherInterval) clearInterval(this.dayWatcherInterval);
    this.dayWatcherInterval = setInterval(() => this.checkForNewDay(), 60 * 1000);
}

export function checkForNewDay() {
    const currentDateKey = this.getLocalDateKey();
    if (this.lastKnownDateKey === currentDateKey) return null;
    this.lastKnownDateKey = currentDateKey;

    const result = runDayCycleTasks(createDayCycleTaskEntries());
    const summary = {
        dateKey: currentDateKey,
        ok: result.ok,
        successes: result.successes,
        failures: result.failures,
        completedAt: new Date().toISOString()
    };

    this.bootstrapStatus = {
        ...(this.bootstrapStatus || {}),
        dayCycle: summary
    };

    emitStatsChanged({ source: 'day-cycle' });
    appEventBus.emit('app:day-cycle', summary);

    if (result.failures.length > 0) {
        this.showToast('بدأ يوم جديد، لكن تعذر تحديث بعض الأقسام تلقائيًا.', 'warning');
        return summary;
    }

    this.showToast('بدأ يوم جديد، تم تحديث المهام والإحصائيات تلقائيًا 🌅', 'info');
    return summary;
}

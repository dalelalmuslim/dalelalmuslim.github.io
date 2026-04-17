import { notifications } from '../../services/notifications/index.js';
import { warmQuranDataSource } from '../../features/quran/quran-data-source.js';
import { warmCatalogContentLoader } from '../../shared/content/catalog-data-loader.js';
import { warmAzkarCatalog } from '../../domains/azkar/azkar-repository.js';

function scheduleIdleTask(task, { timeout = 1500, delay = 0 } = {}) {
    if (typeof task !== 'function') {
        return false;
    }

    const invoke = () => {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => task(), { timeout });
            return;
        }

        setTimeout(task, 0);
    };

    if (delay > 0) {
        setTimeout(invoke, delay);
        return true;
    }

    invoke();
    return true;
}

export function startBackgroundServices(appApi) {
    requestAnimationFrame(() => {
        appApi.safeInit('notifications.init', () => notifications?.init?.());

        scheduleIdleTask(() => {
            appApi.safeInit('catalog.warm', () => warmCatalogContentLoader());
        }, { timeout: 1500, delay: 200 });

        scheduleIdleTask(() => {
            appApi.safeInit('azkar.catalog.warm', () => warmAzkarCatalog());
        }, { timeout: 1800, delay: 450 });

        scheduleIdleTask(() => {
            appApi.safeInit('quran.datasource.warm', () => warmQuranDataSource({ surahNumbers: [1, 2] }));
        }, { timeout: 2200, delay: 700 });
    });
}

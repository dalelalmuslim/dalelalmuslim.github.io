import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';
import { appLogger } from '../../shared/logging/app-logger.js';

let quranControllerModulePromise = null;

function loadQuranController() {
    if (!quranControllerModulePromise) {
        quranControllerModulePromise = import('./quran-controller.js').catch(error => {
            quranControllerModulePromise = null;
            appLogger.error('[Quran] Failed to lazy-load Quran controller:', error);
            throw error;
        });
    }

    return quranControllerModulePromise;
}

async function withQuranController(actionName, action) {
    try {
        const { quran } = await loadQuranController();
        return action(quran);
    } catch (error) {
        appLogger.error(`[Quran] Lazy action failed: ${actionName}`, error);
        return null;
    }
}

function refreshQuranSurface() {
    return withQuranController('refreshSurface', async quran => {
        if (!quran) {
            return null;
        }

        await quran.ensureDataLoaded?.();
        quran.renderSurahList?.(quran.getDom?.('searchInput')?.value || '');
        quran.checkBookmark?.();

        if (!quran.isReaderVisible?.()) {
            quran.setQuranHeaderTitle?.('القرآن الكريم');
        }

        return true;
    });
}

export const quranFeature = defineFeatureApi({
    id: 'quran',
    title: 'القرآن الكريم',

    init({ app }) {
        app.safeInit('feature:quran:init', () => (
            withQuranController('init', quran => quran?.init?.())
        ));
    },

    enter({ app }) {
        app.safeInit('feature:quran:refresh', refreshQuranSurface);
    },

    refresh({ app }) {
        app.safeInit('feature:quran:refresh', refreshQuranSurface);
    },

    leave() {
        withQuranController('leave', quran => quran?.resetReaderView?.());
    },

    capabilities: {
        refreshSurface: refreshQuranSurface,
        checkBookmark: () => withQuranController('checkBookmark', quran => quran?.checkBookmark?.()),
        openSurah: (surahNum, options) => withQuranController('openSurah', quran => quran?.openSurah?.(surahNum, options)),
        closeSurah: () => withQuranController('closeSurah', quran => quran?.closeSurah?.()),
        resumeReading: () => withQuranController('resumeReading', quran => quran?.resumeReading?.()),
        saveBookmark: () => withQuranController('saveBookmark', quran => quran?.saveCurrentBookmark?.()),
        closeStudyPanel: () => withQuranController('closeStudyPanel', quran => quran?.closeStudyPanel?.()),
        copyActiveAyah: () => withQuranController('copyActiveAyah', quran => quran?.copyActiveAyah?.())
    }
});

export const quranSection = quranFeature;

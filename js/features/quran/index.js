import { quran } from './quran-controller.js';
import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';

function refreshQuranSurface() {
    quran?.checkBookmark?.();
    quran?.syncReviewSummary?.();
}

export const quranFeature = defineFeatureApi({
    id: 'quran',
    title: 'القرآن الكريم',
    init({ app }) {
        app.safeInit('feature:quran:init', () => quran?.init?.());
    },
    enter({ app }) {
        app.safeInit('feature:quran:refresh', refreshQuranSurface);
    },
    refresh({ app }) {
        app.safeInit('feature:quran:refresh', refreshQuranSurface);
    },
    leave() {
        quran?.resetReaderView?.();
    },
    capabilities: {
        refreshSurface: refreshQuranSurface,
        checkBookmark: () => quran?.checkBookmark?.(),
        openSurah: (surahNum, options) => quran?.openSurah?.(surahNum, options),
        closeSurah: () => quran?.closeSurah?.(),
        resumeReading: () => quran?.resumeReading?.(),
        saveBookmark: () => quran?.saveCurrentBookmark?.(),
        closeStudyPanel: () => quran?.closeStudyPanel?.(),
        copyActiveAyah: () => quran?.copyActiveAyah?.(),
        shareActiveAyah: () => quran?.shareActiveAyah?.(),
        repeatActiveAyah: () => quran?.repeatActiveAyah?.(),
        addActiveAyahToReview: () => quran?.addActiveAyahToReview?.(),
        markActiveAyahMemorized: () => quran?.markActiveAyahMemorized?.(),
        openNextReview: () => quran?.openNextReview?.()
    }
});

export const quranSection = quranFeature;

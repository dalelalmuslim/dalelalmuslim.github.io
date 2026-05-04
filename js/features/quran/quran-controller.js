import { appLogger } from '../../shared/logging/app-logger.js';
import { getResumePoint } from '../../domains/quran/quran-reading-selectors.js';
import { showToast } from '../../app/shell/app-shell.js';
import { registerSubviewCloseHandler } from '../../app/ui/subview-manager.js';
import { scheduleRender } from '../../shared/render/render-scheduler.js';
import { warmQuranDataSource } from './quran-data-source.js';
import { createQuranDomCache } from './quran-dom.js';
import { buildAyahLine } from './quran-renderers.js';
import { SURAH_NAMES } from './quran-metadata.js';
import { createQuranStudyController } from './quran-study-controller.js';
import { createQuranBookmarkController } from './quran-bookmark-controller.js';
import { createQuranReaderController } from './quran-reader-controller.js';

const domCache = createQuranDomCache();

function scheduleIdleTask(task, timeout = 1500) {
    if (typeof task !== 'function') {
        return false;
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => task(), { timeout });
        return true;
    }

    setTimeout(task, 0);
    return true;
}

const studyController = createQuranStudyController();
const bookmarkController = createQuranBookmarkController();
const readerController = createQuranReaderController({ scheduleIdleTask });

export const quran = {
    initialized: false,
    dataLoaded: false,
    searchBound: false,
    ayahDelegationBound: false,
    studyPanelBound: false,
    readingScrollBound: false,
    currentSurahNum: null,
    activeAyahNode: null,
    activeAyahContext: null,
    activeStudyContent: null,
    studyPanelRequestId: 0,
    openRequestId: 0,
    openAbortController: null,
    searchInputTimer: null,
    readingProgressTimer: null,
    surahNames: SURAH_NAMES,

    cacheDom: domCache.cacheDom,
    getDom: domCache.getDom,

    getWarmupSurahNumbers() {
        const warmupSet = new Set([1]);
        const resumePoint = getResumePoint();
        if (resumePoint?.surahNum) {
            warmupSet.add(Number(resumePoint.surahNum));
        }

        if (this.currentSurahNum) {
            warmupSet.add(Number(this.currentSurahNum));
            warmupSet.add(Number(this.currentSurahNum) + 1);
            warmupSet.add(Number(this.currentSurahNum) - 1);
        }

        return [...warmupSet].filter(surahNum => Number.isInteger(surahNum) && surahNum >= 1 && surahNum <= 114);
    },

    async ensureDataLoaded() {
        if (this.dataLoaded) return;

        try {
            await warmQuranDataSource({ surahNumbers: this.getWarmupSurahNumbers() });
            this.dataLoaded = true;
        } catch (error) {
            appLogger.error('[Quran] Failed to prepare Quran data source:', error);
        }
    },

    reportUnexpectedError(message = 'حدث خطأ غير متوقع.', error = null) {
        if (error) {
            appLogger.error('[Quran] Unexpected action error:', error);
        }
        showToast(message, 'error');
    },

    bootstrap() {
        this.init();
    },

    async init() {
        if (!this.initialized) {
            this.cacheDom();
            this.bindSearch();
            this.bindAyahDelegation();
            this.bindStudyPanel();
            this.bindReadingProgress();
            this.initialized = true;
        }

        await this.ensureDataLoaded();
        this.renderSurahList();
        this.checkBookmark();
        this.prefetchBookmark();
    },

    bindSearch() {
        const input = this.getDom('searchInput');
        if (!input || this.searchBound) return;

        this.searchBound = true;
        input.addEventListener('input', () => {
            const nextValue = input.value || '';
            clearTimeout(this.searchInputTimer);
            this.searchInputTimer = setTimeout(() => {
                scheduleRender('quran:surah-list', () => {
                    this.renderSurahList(nextValue);
                });
            }, 90);
        });
    },

    bindAyahDelegation() {
        const ayahsContainer = this.getDom('ayahsContainer');
        if (!ayahsContainer || this.ayahDelegationBound) {
            return;
        }

        this.ayahDelegationBound = true;
        ayahsContainer.addEventListener('click', event => {
            const ayahNode = event.target.closest('[data-quran-ayah="true"]');
            if (!ayahNode || !ayahsContainer.contains(ayahNode)) {
                return;
            }

            this.setActiveAyah(ayahNode);
        });
    },

    bindStudyPanel() {
        if (this.studyPanelBound || typeof document === 'undefined') {
            return;
        }

        this.studyPanelBound = true;
        document.addEventListener('quran:ayah-selected', event => {
            const context = event?.detail;
            if (!context?.surahNum || !context?.verseNum || !context?.text) {
                return;
            }

            this.openStudyPanel(context);
        });
    },

    bindReadingProgress() {
        if (this.readingScrollBound || typeof window === 'undefined') {
            return;
        }

        this.readingScrollBound = true;
        window.addEventListener('scroll', () => {
            if (!this.currentSurahNum) {
                return;
            }

            this.scheduleLastReadSync();
        }, { passive: true });
    },

    buildAyahLine,
    ...studyController,
    ...bookmarkController,
    ...readerController
};

registerSubviewCloseHandler('surahReader', () => quran.checkBookmark());

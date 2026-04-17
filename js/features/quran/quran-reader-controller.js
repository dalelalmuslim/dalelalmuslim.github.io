import { appLogger } from '../../shared/logging/app-logger.js';
import { quranReadingStore } from '../../domains/quran/quran-reading-store.js';
import {
    getResumePoint,
    getResumeSource,
    getResumeSourceLabel,
    getResumeSurahName
} from '../../domains/quran/quran-reading-selectors.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { hideUIElement, showUIElement } from '../../app/ui/visibility.js';
import { showToast } from '../../app/shell/app-shell.js';
import { closeSubview, openSubview } from '../../app/ui/subview-manager.js';
import { pushHashState, scrollToTop, scrollToPosition, getScrollY } from '../../services/platform/browser-navigation.js';
import { scheduleRender } from '../../shared/render/render-scheduler.js';
import {
    getAvailableSurahNumbers,
    getSurahAyahs as loadSurahAyahs,
    prefetchSurahAyahs
} from './quran-data-source.js';
import {
    renderAyahNodes,
    renderSurahList as renderQuranSurahList
} from './quran-renderers.js';
import { getSurahName } from './quran-metadata.js';

export function createQuranReaderController({ scheduleIdleTask }) {
    return {
        isReaderVisible() {
            const reader = this.getDom('surahReader');
            return Boolean(reader && !reader.hidden && !reader.classList.contains('is-hidden'));
        },

        buildReadingPoint(surahNum = this.currentSurahNum, scroll = getScrollY()) {
            const normalizedSurahNum = Number(surahNum || 0);
            const surahName = getSurahName(normalizedSurahNum);
            if (!normalizedSurahNum || !surahName) {
                return null;
            }

            return {
                surahNum: normalizedSurahNum,
                surahName,
                scroll: Math.max(0, Number(scroll) || 0),
                updatedAt: new Date().toISOString()
            };
        },

        persistLastRead(point = this.buildReadingPoint()) {
            const normalized = point ? this.buildReadingPoint(point.surahNum, point.scroll) : null;
            if (!normalized) {
                return null;
            }

            return quranReadingStore.saveLastRead(normalized);
        },

        scheduleLastReadSync() {
            if (!this.currentSurahNum || !this.isReaderVisible()) {
                return;
            }

            clearTimeout(this.readingProgressTimer);
            this.readingProgressTimer = setTimeout(() => {
                this.persistLastRead();
            }, 120);
        },

        getSurahNumbers() {
            return getAvailableSurahNumbers(this.surahNames);
        },

        renderSurahList(searchTerm = '') {
            return renderQuranSurahList({
                getDom: this.getDom,
                getSurahNumbers: () => this.getSurahNumbers(),
                onOpenSurah: surahNum => this.openSurah(surahNum)
            }, searchTerm);
        },

        async getSurahAyahs(surahNum, options = {}) {
            return loadSurahAyahs(surahNum, options);
        },

        saveLastReadPoint(surahNum, scroll = getScrollY()) {
            const point = this.buildReadingPoint(surahNum, scroll);
            if (!point) {
                return null;
            }

            const saved = this.persistLastRead(point);
            this.checkBookmark();
            return saved;
        },

        renderLoadingState(surahName) {
            const titleEl = this.getDom('currentSurahTitle');
            const ayahsContainer = this.getDom('ayahsContainer');
            if (titleEl) titleEl.textContent = surahName || 'جاري التحميل...';
            if (ayahsContainer) {
                this.clearActiveAyah();
                ayahsContainer.classList.add('quran__ayahs--loading');
                ayahsContainer.setAttribute('aria-busy', 'true');
                ayahsContainer.textContent = 'جاري تحميل السورة...';
            }
            this.closeStudyPanel();
            this.syncBookmarkButtonState();
            this.syncReviewSummary();
        },

        renderSurahError(message = 'تعذر تحميل السورة.') {
            const ayahsContainer = this.getDom('ayahsContainer');
            if (!ayahsContainer) return;

            this.clearActiveAyah();
            ayahsContainer.classList.remove('quran__ayahs--loading');
            ayahsContainer.setAttribute('aria-busy', 'false');
            ayahsContainer.textContent = message;
            this.syncReviewSummary();
        },

        renderSurahAyahs(surahNum, ayahs) {
            const ayahsContainer = this.getDom('ayahsContainer');
            if (!ayahsContainer) return;

            const fragment = renderAyahNodes({ ayahs, surahNum });
            scheduleRender('quran:ayahs-content', () => {
                this.clearActiveAyah();
                ayahsContainer.classList.remove('quran__ayahs--loading');
                ayahsContainer.setAttribute('aria-busy', 'false');

                if (!fragment.childNodes.length) {
                    ayahsContainer.textContent = 'تعذر تحميل السورة.';
                    return;
                }

                ayahsContainer.replaceChildren(fragment);
                this.syncHifzActionState();
                this.syncReviewSummary();
            });
        },

        cancelPendingOpenRequest() {
            if (this.openAbortController) {
                this.openAbortController.abort();
                this.openAbortController = null;
            }
        },

        prefetchNearbySurahs(surahNum) {
            scheduleIdleTask(() => {
                prefetchSurahAyahs(surahNum + 1);
                prefetchSurahAyahs(surahNum - 1);
            }, 1200);
        },

        prefetchBookmark() {
            const resumePoint = getResumePoint();
            const resumeSurah = Number(resumePoint?.surahNum || 0);
            if (!resumeSurah) {
                return;
            }

            scheduleIdleTask(() => {
                prefetchSurahAyahs(resumeSurah);
            }, 1000);
        },

        async openSurah(surahNum, options = {}) {
            try {
                await this.ensureDataLoaded();

                const reader = this.getDom('surahReader');
                const listContainer = this.getDom('surahListContainer');
                const titleEl = this.getDom('currentSurahTitle');
                const ayahsContainer = this.getDom('ayahsContainer');
                if (!reader || !listContainer || !titleEl || !ayahsContainer) {
                    return;
                }

                if (this.currentSurahNum === surahNum && reader.getAttribute('aria-hidden') === 'false' && !options.restoreScroll && !options.focusVerseNum) {
                    return;
                }

                this.cancelPendingOpenRequest();

                const abortController = new AbortController();
                this.openAbortController = abortController;

                const surahName = getSurahName(surahNum);
                const requestId = ++this.openRequestId;
                this.currentSurahNum = surahNum;

                this.renderLoadingState(surahName);
                openSubview('surahReader');
                pushHashState({ section: 'quran', sub: true }, '#surah-reader');
                scrollToTop('auto');

                try {
                    const ayahs = await this.getSurahAyahs(surahNum, { signal: abortController.signal });
                    if (abortController.signal.aborted || requestId !== this.openRequestId) {
                        return;
                    }

                    this.renderSurahAyahs(surahNum, ayahs);
                    this.saveLastReadPoint(surahNum, 0);
                    this.prefetchNearbySurahs(surahNum);
                    this.syncBookmarkButtonState();
                    this.syncReviewSummary();

                    const resumePoint = getResumePoint();
                    const focusVerseNum = Number(options.focusVerseNum || 0);
                    if (focusVerseNum > 0) {
                        requestAnimationFrame(() => {
                            const focused = this.focusAyahVerse(focusVerseNum, {
                                behavior: 'smooth',
                                openPanel: true
                            });
                            if (!focused && options.restoreScroll && resumePoint?.surahNum === surahNum) {
                                const resumeScroll = Number(resumePoint.scroll || 0);
                                scrollToPosition(resumeScroll, 'auto');
                                this.saveLastReadPoint(surahNum, resumeScroll);
                            }
                        });
                    } else if (options.restoreScroll && resumePoint?.surahNum === surahNum) {
                        const resumeScroll = Number(resumePoint.scroll || 0);
                        requestAnimationFrame(() => {
                            scrollToPosition(resumeScroll, 'auto');
                            this.saveLastReadPoint(surahNum, resumeScroll);
                        });
                    }
                } catch (error) {
                    if (error?.name === 'AbortError') {
                        return;
                    }

                    appLogger.error('[Quran] Failed to open surah:', error);
                    this.renderSurahError();
                    showToast('تعذر فتح السورة الآن.', 'error');
                } finally {
                    if (this.openAbortController === abortController) {
                        this.openAbortController = null;
                    }
                }
            } catch (error) {
                this.reportUnexpectedError('تعذر فتح السورة الآن.', error);
            }
        },

        closeSurah() {
            this.resetReaderView();
            replaceSectionRoute('quran', 'القرآن الكريم');
        },

        resetReaderView() {
            this.cancelPendingOpenRequest();
            this.saveLastReadPoint(this.currentSurahNum, getScrollY());
            clearTimeout(this.readingProgressTimer);
            closeSubview('surahReader');
            this.currentSurahNum = null;
            this.openRequestId += 1;
            this.clearActiveAyah();
            this.closeStudyPanel();
            this.syncBookmarkButtonState();
            this.checkBookmark();
            this.syncReviewSummary();
        },

        checkBookmark() {
            const card = this.getDom('resumeReadingCard');
            const nameEl = this.getDom('lastReadSurahName');
            const metaEl = this.getDom('lastReadResumeMeta');
            const resumePoint = getResumePoint();
            const resumeSource = getResumeSource();
            const resumeLabel = getResumeSourceLabel();

            if (!card || !nameEl) return;

            if (!resumePoint || !resumePoint.surahNum || !resumePoint.surahName) {
                hideUIElement(card, { display: 'none' });
                nameEl.textContent = '';
                if (metaEl) {
                    metaEl.textContent = '';
                }
                card.dataset.resumeSource = '';
                this.syncBookmarkButtonState();
                return;
            }

            nameEl.textContent = getResumeSurahName();
            if (metaEl) {
                metaEl.textContent = resumeLabel;
            }
            card.dataset.resumeSource = resumeSource || '';
            showUIElement(card, { display: '' });
            this.syncBookmarkButtonState();
        },

        async resumeReading() {
            try {
                const resumePoint = getResumePoint();
                if (!resumePoint?.surahNum) {
                    return;
                }

                await this.openSurah(resumePoint.surahNum, { restoreScroll: true });
            } catch (error) {
                this.reportUnexpectedError('تعذر استئناف القراءة الآن.', error);
            }
        }
    };
}

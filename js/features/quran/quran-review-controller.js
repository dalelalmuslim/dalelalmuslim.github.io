import { quranReadingStore } from '../../domains/quran/quran-reading-store.js';
import { quranHifzStore } from '../../domains/quran/quran-hifz-store.js';
import {
    getNextReviewEntry,
    getQuranHifzEntryStatus,
    getQuranHifzSummary
} from '../../domains/quran/quran-hifz-selectors.js';
import { showToast } from '../../app/shell/app-shell.js';
import { getSurahName } from './quran-metadata.js';

function buildAyahKey(context) {
    if (!context?.surahNum || !context?.verseNum) {
        return '';
    }

    return `${Number(context.surahNum)}:${Number(context.verseNum)}`;
}

function buildBookmarkToastLabel(point) {
    const verseNum = Number(point?.verseNum || 0);
    if (point?.surahName && verseNum > 0) {
        return `${point.surahName}، الآية ${verseNum}`;
    }

    return point?.surahName || 'الموضع الحالي';
}

export function createQuranReviewController() {
    return {
        syncBookmarkButtonState() {
            const button = this.getDom('saveQuranBookmarkBtn');
            if (!button) {
                return;
            }

            const bookmark = quranReadingStore.getBookmark();
            const isActive = Boolean(bookmark?.surahNum && Number(bookmark.surahNum) === Number(this.currentSurahNum || 0));
            button.disabled = !this.currentSurahNum;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        },

        buildHifzEntry(context = this.activeAyahContext) {
            if (!context?.surahNum || !context?.verseNum || !context?.text) {
                return null;
            }

            const key = buildAyahKey(context);
            if (!key) {
                return null;
            }

            return {
                key,
                surahNum: Number(context.surahNum),
                surahName: context.surahName || getSurahName(Number(context.surahNum)),
                verseNum: Number(context.verseNum),
                text: String(context.text).trim()
            };
        },

        syncHifzActionState() {
            const addBtn = this.getDom('quranAddReviewBtn');
            const memorizedBtn = this.getDom('quranMarkMemorizedBtn');
            const entry = this.buildHifzEntry();
            const status = entry?.key ? getQuranHifzEntryStatus(entry.key) : '';

            if (addBtn) {
                addBtn.disabled = !entry;
                addBtn.classList.toggle('is-active', status === 'review');
                addBtn.setAttribute('aria-pressed', String(status === 'review'));
                addBtn.textContent = status === 'review' ? 'ضمن قائمة المراجعة' : 'أضف للمراجعة';
            }

            if (memorizedBtn) {
                memorizedBtn.disabled = !entry;
                memorizedBtn.classList.toggle('is-active', status === 'memorized');
                memorizedBtn.setAttribute('aria-pressed', String(status === 'memorized'));
                memorizedBtn.textContent = status === 'memorized' ? 'مُثبتة كمحفوظة' : 'تم حفظها';
            }
        },

        syncReviewSummary() {
            const card = this.getDom('quranReviewSummary');
            const countEl = this.getDom('quranReviewSummaryCount');
            const hintEl = this.getDom('quranReviewSummaryHint');
            const metaEl = this.getDom('quranReviewMemorizedCount');
            const nextBtn = this.getDom('quranReviewNextBtn');
            const summary = getQuranHifzSummary();

            if (!card || !countEl || !hintEl || !metaEl || !nextBtn) {
                return;
            }

            const hasAnyState = Boolean(summary.reviewCount || summary.memorizedCount);
            if (!hasAnyState) {
                card.classList.add('is-hidden');
                card.setAttribute('aria-hidden', 'true');
                countEl.textContent = '0 آية للمراجعة';
                hintEl.textContent = '';
                metaEl.textContent = '';
                nextBtn.disabled = true;
                nextBtn.classList.remove('is-active');
                nextBtn.setAttribute('aria-pressed', 'false');
                return;
            }

            countEl.textContent = summary.reviewCount ? `${summary.reviewCount} آية للمراجعة` : 'لا توجد آيات قيد المراجعة';
            hintEl.textContent = summary.nextReviewLabel || 'يمكنك إضافة آيات من لوحة الدراسة لتكوين خطة مراجعة خفيفة.';
            metaEl.textContent = summary.memorizedCount ? `الآيات المثبتة كمحفوظة: ${summary.memorizedCount}` : 'لم تُثبت أي آية كمحفوظة بعد.';
            nextBtn.disabled = !summary.nextReview;
            nextBtn.classList.toggle('is-active', Boolean(summary.nextReview));
            nextBtn.setAttribute('aria-pressed', String(Boolean(summary.nextReview)));
            card.classList.remove('is-hidden');
            card.setAttribute('aria-hidden', 'false');
        },

        saveCurrentBookmark() {
            const point = this.buildReadingPoint();
            if (!point) {
                showToast('افتح سورة أولًا.', 'info');
                return null;
            }

            const savedBookmark = quranReadingStore.saveBookmark(point);
            this.syncBookmarkButtonState();
            this.checkBookmark();
            showToast(`تم حفظ الموضع في ${buildBookmarkToastLabel(point)}.`, 'success');
            return savedBookmark;
        },

        addActiveAyahToReview() {
            const entry = this.buildHifzEntry();
            if (!entry) {
                showToast('اختر آية أولًا.', 'info');
                return null;
            }

            const saved = quranHifzStore.addToReview(entry);
            quranHifzStore.setLastReviewKey(entry.key);
            this.syncHifzActionState();
            this.syncReviewSummary();
            showToast(`أضيفت الآية ${entry.verseNum} من ${entry.surahName} إلى المراجعة.`, 'success');
            return saved;
        },

        markActiveAyahMemorized() {
            const entry = this.buildHifzEntry();
            if (!entry) {
                showToast('اختر آية أولًا.', 'info');
                return null;
            }

            const saved = quranHifzStore.markMemorized(entry);
            quranHifzStore.setLastReviewKey(entry.key);
            this.syncHifzActionState();
            this.syncReviewSummary();
            showToast(`تم تثبيت الآية ${entry.verseNum} من ${entry.surahName} كمحفوظة.`, 'success');
            return saved;
        },

        async openNextReview() {
            try {
                const nextReview = getNextReviewEntry();
                if (!nextReview?.surahNum || !nextReview?.verseNum) {
                    showToast('لا توجد آيات في قائمة المراجعة الآن.', 'info');
                    return;
                }

                quranHifzStore.setLastReviewKey(nextReview.key || '');
                await this.openSurah(nextReview.surahNum, {
                    focusVerseNum: nextReview.verseNum
                });
            } catch (error) {
                this.reportUnexpectedError('تعذر فتح آية المراجعة الآن.', error);
            }
        }
    };
}

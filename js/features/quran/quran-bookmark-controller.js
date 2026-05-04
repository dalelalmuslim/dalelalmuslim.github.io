import { quranReadingStore } from '../../domains/quran/quran-reading-store.js';
import { showToast } from '../../app/shell/app-shell.js';

function buildBookmarkToastLabel(point) {
    const verseNum = Number(point?.verseNum || 0);
    if (point?.surahName && verseNum > 0) {
        return `${point.surahName}، الآية ${verseNum}`;
    }

    return point?.surahName || 'الموضع الحالي';
}

export function createQuranBookmarkController() {
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
        }
    };
}

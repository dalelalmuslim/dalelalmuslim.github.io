import { quranReadingStore } from './quran-reading-store.js';

export function getResumePoint() {
    return quranReadingStore.getBookmark() || quranReadingStore.getLastRead();
}

export function hasResumePoint() {
    return Boolean(getResumePoint()?.surahNum);
}

export function getResumeSurahName() {
    return getResumePoint()?.surahName || '';
}

export function getResumeSource() {
    if (quranReadingStore.getBookmark()?.surahNum) {
        return 'bookmark';
    }

    if (quranReadingStore.getLastRead()?.surahNum) {
        return 'lastRead';
    }

    return null;
}

export function getResumeSourceLabel() {
    const source = getResumeSource();
    if (source === 'bookmark') {
        return 'علامة محفوظة';
    }

    if (source === 'lastRead') {
        return 'آخر قراءة';
    }

    return '';
}

import { quranHifzStore } from './quran-hifz-store.js';

export function getQuranHifzEntries() {
    return quranHifzStore.getEntries();
}

export function getQuranReviewEntries() {
    return getQuranHifzEntries().filter(entry => entry.status === 'review');
}

export function getQuranMemorizedEntries() {
    return getQuranHifzEntries().filter(entry => entry.status === 'memorized');
}

export function getQuranHifzEntryStatus(key) {
    return quranHifzStore.getEntry(key)?.status || '';
}

export function getNextReviewEntry() {
    return getQuranReviewEntries()[0] || null;
}

export function getQuranHifzSummary() {
    const reviewEntries = getQuranReviewEntries();
    const memorizedEntries = getQuranMemorizedEntries();
    const nextReview = reviewEntries[0] || null;

    return {
        reviewCount: reviewEntries.length,
        memorizedCount: memorizedEntries.length,
        nextReview,
        nextReviewLabel: nextReview ? `${nextReview.surahName} • الآية ${nextReview.verseNum}` : ''
    };
}

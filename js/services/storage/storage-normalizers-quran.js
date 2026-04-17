import { isPlainObject, toSafeNumber } from './storage-normalizers-core.js';

export function normalizeBookmark(bookmark) {
    if (!isPlainObject(bookmark)) return null;

    const surahNum = toSafeNumber(bookmark.surahNum, NaN);
    const surahName = typeof bookmark.surahName === 'string' ? bookmark.surahName.trim() : '';
    const scroll = toSafeNumber(bookmark.scroll, 0, { min: 0 });

    if (!Number.isFinite(surahNum) || surahNum <= 0) return null;
    if (!surahName) return null;

    return {
        surahNum,
        surahName,
        scroll
    };
}

export function normalizeQuranReadingPoint(value) {
    if (!isPlainObject(value)) return null;

    const surahNum = toSafeNumber(value.surahNum, NaN);
    const surahName = typeof value.surahName === 'string' ? value.surahName.trim() : '';
    const scroll = toSafeNumber(value.scroll, 0, { min: 0 });
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : '';

    if (!Number.isFinite(surahNum) || surahNum <= 0) return null;
    if (!surahName) return null;

    return {
        surahNum,
        surahName,
        scroll,
        updatedAt
    };
}

export function normalizeQuranReadingState(value) {
    const source = isPlainObject(value) ? value : {};

    return {
        lastRead: normalizeQuranReadingPoint(source.lastRead),
        bookmark: normalizeQuranReadingPoint(source.bookmark)
    };
}

export function normalizeQuranHifzEntry(value) {
    if (!isPlainObject(value)) return null;

    const surahNum = toSafeNumber(value.surahNum, NaN);
    const surahName = typeof value.surahName === 'string' ? value.surahName.trim() : '';
    const verseNum = toSafeNumber(value.verseNum, NaN);
    const text = typeof value.text === 'string' ? value.text.trim() : '';
    const status = value.status === 'memorized' ? 'memorized' : 'review';
    const key = typeof value.key === 'string' && value.key.trim()
        ? value.key.trim()
        : (Number.isFinite(surahNum) && Number.isFinite(verseNum) ? `${surahNum}:${verseNum}` : '');
    const addedAt = typeof value.addedAt === 'string' ? value.addedAt : '';
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : '';
    const memorizedAt = typeof value.memorizedAt === 'string' ? value.memorizedAt : '';
    const reviewCount = toSafeNumber(value.reviewCount, 0, { min: 0 });

    if (!Number.isFinite(surahNum) || surahNum <= 0) return null;
    if (!surahName) return null;
    if (!Number.isFinite(verseNum) || verseNum <= 0) return null;
    if (!text || !key) return null;

    return {
        key,
        surahNum,
        surahName,
        verseNum,
        text,
        status,
        addedAt,
        updatedAt,
        memorizedAt,
        reviewCount
    };
}

export function normalizeQuranHifzState(value) {
    const source = isPlainObject(value) ? value : {};
    const rawEntries = Array.isArray(source.entries) ? source.entries : [];
    const seenKeys = new Set();
    const entries = [];

    rawEntries.forEach((entry) => {
        const normalized = normalizeQuranHifzEntry(entry);
        if (!normalized || seenKeys.has(normalized.key)) return;
        seenKeys.add(normalized.key);
        entries.push(normalized);
    });

    return {
        entries,
        lastReviewKey: typeof source.lastReviewKey === 'string' ? source.lastReviewKey : ''
    };
}

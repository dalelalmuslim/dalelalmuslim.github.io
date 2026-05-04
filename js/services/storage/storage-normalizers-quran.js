import { isPlainObject, toSafeNumber } from './storage-normalizers-core.js';

function normalizeOptionalVerseNum(value) {
    const verseNum = Number(value);
    return Number.isInteger(verseNum) && verseNum > 0 ? verseNum : null;
}

export function normalizeBookmark(bookmark) {
    if (!isPlainObject(bookmark)) return null;

    const surahNum = toSafeNumber(bookmark.surahNum, NaN);
    const surahName = typeof bookmark.surahName === 'string' ? bookmark.surahName.trim() : '';
    const verseNum = normalizeOptionalVerseNum(bookmark.verseNum);
    const scroll = toSafeNumber(bookmark.scroll, 0, { min: 0 });

    if (!Number.isFinite(surahNum) || surahNum <= 0) return null;
    if (!surahName) return null;

    return {
        surahNum,
        surahName,
        verseNum,
        scroll
    };
}

export function normalizeQuranReadingPoint(value) {
    if (!isPlainObject(value)) return null;

    const surahNum = toSafeNumber(value.surahNum, NaN);
    const surahName = typeof value.surahName === 'string' ? value.surahName.trim() : '';
    const verseNum = normalizeOptionalVerseNum(value.verseNum);
    const scroll = toSafeNumber(value.scroll, 0, { min: 0 });
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : '';

    if (!Number.isFinite(surahNum) || surahNum <= 0) return null;
    if (!surahName) return null;

    return {
        surahNum,
        surahName,
        verseNum,
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

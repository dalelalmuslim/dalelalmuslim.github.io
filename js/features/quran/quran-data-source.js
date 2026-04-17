import { appLogger } from '../../shared/logging/app-logger.js';

const SPLIT_SURAH_BASE_URL = new URL('../../../data/quran/surahs/', import.meta.url);

const surahCache = new Map();
const surahPendingRequests = new Map();
const surahTextCache = new Map();
let fallbackDataPromise = null;

function normalizeSurahNumber(value) {
    const surahNum = Number(value);
    if (!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) {
        return null;
    }
    return surahNum;
}

function toSurahFilename(surahNum) {
    return `${String(surahNum).padStart(3, '0')}.json`;
}

function normalizeAyahEntry(entry, fallbackIndex, surahNum) {
    const verse = Number(entry?.verse ?? entry?.numberInSurah ?? entry?.verse_number ?? fallbackIndex);
    const text = String(entry?.text ?? '').trim();
    const chapter = Number(entry?.chapter ?? surahNum);

    return {
        chapter: Number.isFinite(chapter) ? chapter : surahNum,
        verse: Number.isFinite(verse) && verse > 0 ? verse : fallbackIndex,
        text
    };
}

function normalizeSurahPayload(payload, surahNum) {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map((entry, index) => normalizeAyahEntry(entry, index + 1, surahNum))
        .filter(entry => entry.text);
}

function buildRenderedSurahText(ayahs) {
    if (!Array.isArray(ayahs) || ayahs.length === 0) {
        return '';
    }

    return ayahs
        .map((ayah, index) => {
            const verseNum = Number(ayah?.verse ?? ayah?.numberInSurah ?? ayah?.verse_number ?? index + 1);
            const text = String(ayah?.text || '').trim();
            return `${text} ﴿${verseNum}﴾`;
        })
        .join(' ');
}

function cacheSurahEntry(surahNum, ayahs) {
    const normalizedAyahs = Array.isArray(ayahs) ? ayahs : [];
    surahCache.set(surahNum, normalizedAyahs);

    if (!surahTextCache.has(surahNum)) {
        surahTextCache.set(surahNum, buildRenderedSurahText(normalizedAyahs));
    }

    return normalizedAyahs;
}

function isAbortError(error) {
    return error?.name === 'AbortError';
}

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

async function loadFallbackQuranData() {
    if (!fallbackDataPromise) {
        fallbackDataPromise = import('../../../data/quran/quran-legacy-data.js')
            .then(module => module?.QURAN_JSON ?? {})
            .catch(error => {
                fallbackDataPromise = null;
                throw error;
            });
    }

    return fallbackDataPromise;
}

async function fetchSplitSurah(surahNum, { signal } = {}) {
    const url = new URL(toSurahFilename(surahNum), SPLIT_SURAH_BASE_URL);
    const response = await fetch(url.href, { cache: 'default', signal });

    if (!response.ok) {
        throw new Error(`Split surah request failed with status ${response.status}`);
    }

    const payload = await response.json();
    return normalizeSurahPayload(payload, surahNum);
}

async function loadFallbackSurah(surahNum) {
    const quranJson = await loadFallbackQuranData();
    const payload = quranJson?.[String(surahNum)] ?? quranJson?.[surahNum] ?? [];
    return normalizeSurahPayload(payload, surahNum);
}

async function loadSurahIntoCache(surahNum, { signal } = {}) {
    try {
        const splitSurah = await fetchSplitSurah(surahNum, { signal });
        if (splitSurah.length) {
            return cacheSurahEntry(surahNum, splitSurah);
        }
    } catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        appLogger.warn(`[Quran] Split surah load failed for ${surahNum}, falling back to bundled source.`, error);
    }

    try {
        const fallbackSurah = await loadFallbackSurah(surahNum);
        return cacheSurahEntry(surahNum, fallbackSurah);
    } catch (error) {
        appLogger.error(`[Quran] Fallback Quran source failed for ${surahNum}.`, error);
        return cacheSurahEntry(surahNum, []);
    }
}

async function getOrLoadSurah(surahNum, options = {}) {
    if (surahCache.has(surahNum)) {
        return surahCache.get(surahNum);
    }

    if (surahPendingRequests.has(surahNum)) {
        return surahPendingRequests.get(surahNum);
    }

    const request = loadSurahIntoCache(surahNum, options)
        .finally(() => {
            surahPendingRequests.delete(surahNum);
        });

    surahPendingRequests.set(surahNum, request);
    return request;
}

export function getAvailableSurahNumbers(surahNames = {}) {
    const keys = Object.keys(surahNames)
        .map(Number)
        .filter(Number.isInteger)
        .sort((a, b) => a - b);

    if (keys.length) {
        return keys;
    }

    return Array.from({ length: 114 }, (_, index) => index + 1);
}

export async function getSurahAyahs(surahNumber, options = {}) {
    const surahNum = normalizeSurahNumber(surahNumber);
    if (!surahNum) {
        return [];
    }

    return getOrLoadSurah(surahNum, options);
}

export function getSurahRenderText(surahNumber, ayahs = null) {
    const surahNum = normalizeSurahNumber(surahNumber);
    if (!surahNum) {
        return '';
    }

    if (surahTextCache.has(surahNum)) {
        return surahTextCache.get(surahNum) || '';
    }

    const sourceAyahs = Array.isArray(ayahs)
        ? ayahs
        : surahCache.get(surahNum) || [];

    const renderedText = buildRenderedSurahText(sourceAyahs);
    surahTextCache.set(surahNum, renderedText);
    return renderedText;
}

export function prefetchSurahAyahs(surahNumber) {
    const surahNum = normalizeSurahNumber(surahNumber);
    if (!surahNum || surahCache.has(surahNum) || surahPendingRequests.has(surahNum)) {
        return false;
    }

    void getOrLoadSurah(surahNum);
    return true;
}

export async function warmQuranDataSource({ surahNumbers = [1] } = {}) {
    const normalizedNumbers = [...new Set(
        surahNumbers
            .map(normalizeSurahNumber)
            .filter(Boolean)
    )];

    if (!normalizedNumbers.length) {
        normalizedNumbers.push(1);
    }

    normalizedNumbers.forEach((surahNum, index) => {
        scheduleIdleTask(() => {
            prefetchSurahAyahs(surahNum);
        }, 1000 + (index * 250));
    });

    return true;
}

export function clearQuranDataCache() {
    surahCache.clear();
    surahPendingRequests.clear();
    surahTextCache.clear();
}

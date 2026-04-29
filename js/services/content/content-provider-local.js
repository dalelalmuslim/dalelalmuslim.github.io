import { appLogger } from '../../shared/logging/app-logger.js';
import { APP_CONFIG } from '../../app/app-config.js';
import {
    AZKAR_CATEGORIES_MANIFEST,
    getAzkarManifestEntryByKey,
    getAzkarManifestEntryBySlug,
    resolveAzkarSlug
} from '../../../data/azkar/categories/manifest.js';
import { getDuasManifest, getDuaManifestEntryByKey, resolveDuaSlug } from '../../../data/duas/manifest.js';
import { STORIES_JSON } from '../../../data/stories/stories-data.js';
import { getStoriesManifest, getStoryManifestEntryByKey, resolveStoryCategorySlug } from '../../../data/stories/manifest.js';
import { DAILY_MESSAGES } from '../../../data/home/home-messages-data.js';
import { getPublicContentVersionSnapshot } from '../../shared/contracts/public-content-manifest.js';

const splitModuleCache = new Map();
let legacyPayloadCache = null;
let azkarCatalogCache = null;
let duasPayloadCache = null;
let duasCatalogCache = null;
let storiesCatalogCache = null;
let dailyAyahsCache = null;

function normalizeSplitItem(item, fallbackIndex = 0, categoryMeta = {}) {
    return {
        id: item?.id ?? item?.legacyId ?? `${categoryMeta.slug || 'azkar'}-${fallbackIndex + 1}`,
        legacyId: item?.legacyId ?? fallbackIndex + 1,
        categorySlug: categoryMeta.slug || item?.categorySlug || '',
        categoryTitle: categoryMeta.title || item?.categoryTitle || '',
        text: item?.text ?? item?.zekr ?? '',
        repeatTarget: Number(item?.repeatTarget ?? item?.repeat ?? item?.count ?? 1) || 1,
        reference: item?.reference ?? item?.fadl ?? ''
    };
}

function createFallbackCategoryMeta(title = '') {
    return {
        slug: resolveAzkarSlug(title),
        title,
        description: '',
        icon: 'fa-book-open',
        period: 'general',
        sortOrder: 999,
        estimatedMinutes: null,
        accentTone: 'emerald',
        reminderDefault: '',
        isDaily: false
    };
}

function normalizeAzkarCategoryPayload(payload, manifestEntry = null) {
    const fallbackTitle = payload?.title ?? payload?.categoryTitle ?? payload?.category ?? '';
    const meta = manifestEntry ?? createFallbackCategoryMeta(fallbackTitle);
    const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.azkar)
            ? payload.azkar
            : [];

    const normalizedItems = items.map((item, index) => normalizeSplitItem(item, index, meta));
    const preview = payload?.preview || normalizedItems[0]?.text || '';

    return {
        slug: meta.slug,
        title: meta.title,
        description: meta.description || '',
        icon: meta.icon || 'fa-book-open',
        period: meta.period || 'general',
        sortOrder: Number(meta.sortOrder ?? 999) || 999,
        estimatedMinutes: Number(meta.estimatedMinutes ?? 0) || null,
        accentTone: meta.accentTone || 'emerald',
        reminderDefault: meta.reminderDefault || '',
        isDaily: Boolean(meta.isDaily),
        preview,
        itemCount: payload?.itemCount ?? normalizedItems.length,
        itemIds: Array.isArray(payload?.itemIds)
            ? payload.itemIds
            : normalizedItems.map((item) => item.id),
        category: meta.title,
        azkar: normalizedItems
    };
}

function validateNormalizedAzkarCatalog(catalog) {
    if (!Array.isArray(catalog?.categories)) return false;

    return catalog.categories.every((category) => (
        typeof category?.slug === 'string'
        && category.slug.length > 0
        && typeof category?.title === 'string'
        && category.title.length > 0
        && Array.isArray(category?.azkar)
    ));
}

async function ensureSplitCategoryLoaded(entry) {
    if (!entry) return null;
    if (splitModuleCache.has(entry.slug)) {
        return splitModuleCache.get(entry.slug) || null;
    }

    try {
        const module = await import(entry.modulePath);
        const payload = module?.AZKAR_CATEGORY ?? module?.default ?? null;
        splitModuleCache.set(entry.slug, payload || null);
        return payload || null;
    } catch (error) {
        appLogger.warn(`[ContentLocalProvider] Failed to load split azkar category: ${entry.slug}`, error);
        splitModuleCache.set(entry.slug, null);
        return null;
    }
}

async function ensureLegacyAzkarPayloadLoaded() {
    if (legacyPayloadCache) return legacyPayloadCache;

    try {
        const module = await import('../../../data/azkar/azkar-legacy-catalog.js');
        legacyPayloadCache = module?.AZKAR_JSON ?? null;
    } catch (error) {
        appLogger.error('[ContentLocalProvider] Failed to load legacy azkar payload', error);
        legacyPayloadCache = null;
    }

    return legacyPayloadCache;
}

async function buildSplitAzkarCatalog() {
    const payloads = await Promise.all(
        AZKAR_CATEGORIES_MANIFEST.map(async (entry) => ({
            entry,
            payload: await ensureSplitCategoryLoaded(entry)
        }))
    );

    if (payloads.some((item) => !item.payload)) {
        return null;
    }

    const normalizedCategories = payloads
        .map(({ entry, payload }) => normalizeAzkarCategoryPayload(payload, entry))
        .sort((left, right) => left.sortOrder - right.sortOrder);

    const isValid = normalizedCategories.every((category) => (
        category?.slug && category?.title && Array.isArray(category?.azkar)
    ));

    if (!isValid) {
        return null;
    }

    return {
        categories: normalizedCategories,
        source: 'local-static-split'
    };
}

function normalizeLegacyAzkarCategory(category) {
    const manifestEntry = getAzkarManifestEntryByKey(category?.category);
    return normalizeAzkarCategoryPayload({
        title: category?.category,
        azkar: category?.azkar ?? []
    }, manifestEntry);
}

function normalizeReference(reference) {
    if (!reference) return '';
    if (typeof reference === 'string') return reference;
    if (Array.isArray(reference)) return reference.map(normalizeReference).filter(Boolean).join(' • ');
    if (typeof reference === 'object') {
        if (reference.surah?.name && reference.ayah) {
            return `${reference.surah.name} • آية ${reference.ayah}`;
        }
        return Object.values(reference).map(normalizeReference).filter(Boolean).join(' • ');
    }
    return '';
}

async function loadDuasPayload() {
    if (duasPayloadCache) {
        return duasPayloadCache;
    }

    try {
        const module = await import('../../../data/duas/duas-data.js');
        duasPayloadCache = module?.DUAS_JSON ?? null;
    } catch (error) {
        appLogger.error('[ContentLocalProvider] Failed to load duas payload', error);
        duasPayloadCache = { categories: {} };
    }

    return duasPayloadCache;
}

function normalizeDuaItem(item, category) {
    return {
        id: Number(item?.id) || Math.floor(Math.random() * 1e9),
        text: String(item?.dua || item?.text || '').trim(),
        referenceText: normalizeReference(item?.reference),
        reference: item?.reference || null,
        source: String(item?.source || '').trim(),
        repeat: Math.max(1, Number(item?.repeat) || 1),
        categorySlug: category.slug,
        categoryTitle: category.title
    };
}

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function estimateReadingMinutes(text) {
    const words = normalizeText(text).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 140));
}

function makeExcerpt(text, limit = 140) {
    const safe = normalizeText(text);
    if (safe.length <= limit) return safe;
    return `${safe.slice(0, limit).trim()}…`;
}

export function makeStoryKey(categorySlug, storyId) {
    const safeSlug = resolveStoryCategorySlug(categorySlug);
    const numericId = Number(storyId);
    if (!safeSlug || !Number.isFinite(numericId)) return '';
    return `${safeSlug}:${numericId}`;
}

export function parseStoryKey(storyKey) {
    if (typeof storyKey !== 'string' || !storyKey.includes(':')) {
        return { categorySlug: '', storyId: null };
    }
    const [categorySlug, rawId] = storyKey.split(':');
    const storyId = Number(rawId);
    return {
        categorySlug: resolveStoryCategorySlug(categorySlug),
        storyId: Number.isFinite(storyId) ? storyId : null
    };
}

function normalizeStory(item, category) {
    const storyId = Number(item?.id);
    const title = normalizeText(item?.title);
    const story = normalizeText(item?.story || item?.text);
    if (!title || !story || !Number.isFinite(storyId)) return null;

    const lesson = normalizeText(item?.lesson);
    const source = normalizeText(item?.source);
    const storyKey = makeStoryKey(category.slug, storyId);

    return {
        id: storyId,
        storyKey,
        categorySlug: category.slug,
        categoryTitle: category.title,
        title,
        story,
        excerpt: normalizeText(item?.excerpt) || makeExcerpt(story),
        lesson,
        source,
        readingMinutes: estimateReadingMinutes(story)
    };
}

export function listAzkarManifestEntries() {
    return [...AZKAR_CATEGORIES_MANIFEST].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getAzkarCategoryMetadataByKey(key) {
    return getAzkarManifestEntryByKey(key);
}

export async function getAzkarCatalog() {
    if (azkarCatalogCache) return azkarCatalogCache;

    const splitCatalog = await buildSplitAzkarCatalog();
    if (validateNormalizedAzkarCatalog(splitCatalog)) {
        azkarCatalogCache = splitCatalog;
        return azkarCatalogCache;
    }

    const legacyPayload = await ensureLegacyAzkarPayloadLoaded();
    if (Array.isArray(legacyPayload?.categories)) {
        azkarCatalogCache = {
            categories: legacyPayload.categories.map(normalizeLegacyAzkarCategory),
            source: 'local-static-legacy'
        };
        return azkarCatalogCache;
    }

    azkarCatalogCache = {
        categories: [],
        source: 'empty'
    };
    return azkarCatalogCache;
}

export async function warmAzkarCatalog() {
    try {
        await getAzkarCatalog();
        const firstEntry = listAzkarManifestEntries()[0];
        if (firstEntry) {
            await ensureSplitCategoryLoaded(firstEntry);
        }
        return true;
    } catch (error) {
        appLogger.error('[ContentLocalProvider] Failed to warm azkar catalog', error);
        return false;
    }
}

export async function getAzkarCategoryByKey(categoryKey) {
    const entry = getAzkarManifestEntryByKey(categoryKey);

    if (entry) {
        const payload = await ensureSplitCategoryLoaded(entry);
        if (payload) {
            return normalizeAzkarCategoryPayload(payload, entry);
        }
    }

    const catalog = await getAzkarCatalog();
    const safeSlug = resolveAzkarSlug(categoryKey);

    return catalog.categories.find((category) => (
        category.slug === safeSlug || category.title === categoryKey || category.category === categoryKey
    )) ?? null;
}

export async function getAzkarCategoryBySlug(slug) {
    if (!slug) return null;
    const entry = getAzkarManifestEntryBySlug(slug);
    if (entry) {
        const payload = await ensureSplitCategoryLoaded(entry);
        if (payload) {
            return normalizeAzkarCategoryPayload(payload, entry);
        }
    }

    const catalog = await getAzkarCatalog();
    return catalog.categories.find((category) => category.slug === slug) ?? null;
}

export async function getDuasCatalog() {
    if (duasCatalogCache) {
        return duasCatalogCache;
    }

    const payload = await loadDuasPayload();
    const categories = payload?.categories || {};

    duasCatalogCache = getDuasManifest().map((entry) => {
        const items = Array.isArray(categories[entry.title])
            ? categories[entry.title].map((item) => normalizeDuaItem(item, entry)).filter((item) => item.text)
            : [];

        return {
            ...entry,
            items,
            itemCount: items.length,
            previewText: items[0]?.text || '',
            sourceSummary: Array.from(new Set(items.map((item) => item.source).filter(Boolean))).slice(0, 2).join(' • ')
        };
    });

    return duasCatalogCache;
}

export async function getDuaCategoryByKey(key) {
    const manifestEntry = getDuaManifestEntryByKey(key);
    if (!manifestEntry) return null;
    return (await getDuasCatalog()).find((category) => category.slug === manifestEntry.slug) || null;
}

export async function getDuaCategoryBySlug(slug) {
    const safeSlug = resolveDuaSlug(slug);
    if (!safeSlug) return null;
    return (await getDuasCatalog()).find((category) => category.slug === safeSlug) || null;
}

export async function getAllDuaItems() {
    const catalog = await getDuasCatalog();
    return catalog.flatMap((category) => category.items.map((item) => ({ ...item, category: category.title })));
}

export function getStoriesCatalog() {
    if (storiesCatalogCache) {
        return storiesCatalogCache;
    }

    const sourceCategories = Array.isArray(STORIES_JSON?.categories) ? STORIES_JSON.categories : [];
    storiesCatalogCache = getStoriesManifest().map((entry) => {
        const sourceCategory = sourceCategories.find((category) => category?.name === entry.title);
        const stories = Array.isArray(sourceCategory?.stories)
            ? sourceCategory.stories.map((story) => normalizeStory(story, entry)).filter(Boolean)
            : [];

        return {
            ...entry,
            stories,
            storyCount: stories.length,
            previewTitle: stories[0]?.title || '',
            previewExcerpt: stories[0]?.excerpt || '',
            totalReadingMinutes: stories.reduce((sum, story) => sum + story.readingMinutes, 0)
        };
    });

    return storiesCatalogCache;
}

export function getStoryCategoryBySlug(slug) {
    const safeSlug = resolveStoryCategorySlug(slug);
    if (!safeSlug) return null;
    return getStoriesCatalog().find((category) => category.slug === safeSlug) || null;
}

export function getStoryCategoryByKey(key) {
    const entry = getStoryManifestEntryByKey(key);
    if (!entry) return null;
    return getStoryCategoryBySlug(entry.slug);
}

export function getStoryByKey(storyKey) {
    if (typeof storyKey !== 'string' || !storyKey) return null;
    return getAllStories().find((story) => story.storyKey === storyKey) || null;
}

export function getStoryByCategoryAndId(categoryKey, storyId) {
    const category = getStoryCategoryByKey(categoryKey);
    if (!category) return null;
    const key = makeStoryKey(category.slug, storyId);
    return getStoryByKey(key);
}

export function getAllStories() {
    return getStoriesCatalog().flatMap((category) => category.stories);
}

export function getDailyMessages() {
    return Array.isArray(DAILY_MESSAGES) ? DAILY_MESSAGES : [];
}

export async function getDailyAyahs() {
    if (dailyAyahsCache) {
        return dailyAyahsCache;
    }

    const response = await fetch('./data/home/home-ayahs.json');
    if (!response.ok) {
        throw new Error(`Failed to load ayahs.json: ${response.status}`);
    }

    const payload = await response.json();
    dailyAyahsCache = Array.isArray(payload) ? payload : [];
    return dailyAyahsCache;
}

export async function getDailyContent() {
    return {
        messages: getDailyMessages(),
        ayahs: await getDailyAyahs()
    };
}

export function getPublicVersions() {
    return getPublicContentVersionSnapshot();
}

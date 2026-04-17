import { getStoryManifestEntryByKey, resolveStoryCategorySlug } from '../../../data/stories/manifest.js';
import { isPlainObject } from './storage-normalizers-core.js';

export function normalizeStoriesCategoryKey(key) {
    const entry = getStoryManifestEntryByKey(key);
    if (entry) return entry.slug;

    if (typeof key !== 'string' || !key.trim()) return '';
    return resolveStoryCategorySlug(key);
}

export function createDefaultStoriesSession() {
    return {
        activeCategorySlug: '',
        activeCategoryTitle: '',
        activeStoryKey: '',
        startedAt: '',
        lastViewedAt: '',
        view: 'grid'
    };
}

export function normalizeStoriesSession(session) {
    const defaults = createDefaultStoriesSession();
    const source = isPlainObject(session) ? session : {};

    return {
        activeCategorySlug: normalizeStoriesCategoryKey(source.activeCategorySlug || source.activeCategoryTitle),
        activeCategoryTitle: typeof source.activeCategoryTitle === 'string' ? source.activeCategoryTitle.trim() : '',
        activeStoryKey: typeof source.activeStoryKey === 'string' ? source.activeStoryKey.trim() : '',
        startedAt: typeof source.startedAt === 'string' ? source.startedAt : '',
        lastViewedAt: typeof source.lastViewedAt === 'string' ? source.lastViewedAt : '',
        view: source.view === 'reader' ? 'reader' : defaults.view
    };
}

export function createDefaultStoriesPreferences() {
    return {
        focusMode: false,
        largeText: false,
        favoriteStoryKeys: [],
        pinnedCategorySlugs: []
    };
}

export function normalizeStoriesPreferences(preferences) {
    const defaults = createDefaultStoriesPreferences();
    const source = isPlainObject(preferences) ? preferences : {};

    return {
        focusMode: typeof source.focusMode === 'boolean'
            ? source.focusMode
            : defaults.focusMode,
        largeText: typeof source.largeText === 'boolean'
            ? source.largeText
            : defaults.largeText,
        favoriteStoryKeys: Array.isArray(source.favoriteStoryKeys)
            ? Array.from(new Set(source.favoriteStoryKeys.filter(value => typeof value === 'string' && value.trim())))
            : defaults.favoriteStoryKeys,
        pinnedCategorySlugs: Array.isArray(source.pinnedCategorySlugs)
            ? Array.from(new Set(
                source.pinnedCategorySlugs
                    .map(value => normalizeStoriesCategoryKey(value))
                    .filter(Boolean)
            ))
            : defaults.pinnedCategorySlugs
    };
}

export function createDefaultStoriesHistory() {
    return {
        lastVisitedCategorySlug: '',
        lastVisitedStoryKey: '',
        lastVisitedAt: '',
        recentStoryKeys: [],
        bookmarkedStoryKeys: [],
        dailyVisits: {}
    };
}

export function normalizeStoriesHistory(history) {
    const defaults = createDefaultStoriesHistory();
    const source = isPlainObject(history) ? history : {};
    const rawDailyVisits = isPlainObject(source.dailyVisits) ? source.dailyVisits : {};
    const normalizedDailyVisits = {};

    Object.entries(rawDailyVisits).forEach(([dateKey, values]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Array.isArray(values)) return;

        const safeValues = Array.from(new Set(
            values.filter(value => typeof value === 'string' && value.trim())
        ));

        if (safeValues.length > 0) {
            normalizedDailyVisits[dateKey] = safeValues;
        }
    });

    const recentDates = Object.keys(normalizedDailyVisits)
        .sort()
        .slice(-21);

    const prunedDailyVisits = recentDates.reduce((acc, dateKey) => {
        acc[dateKey] = normalizedDailyVisits[dateKey];
        return acc;
    }, {});

    return {
        lastVisitedCategorySlug: normalizeStoriesCategoryKey(source.lastVisitedCategorySlug),
        lastVisitedStoryKey: typeof source.lastVisitedStoryKey === 'string' ? source.lastVisitedStoryKey.trim() : defaults.lastVisitedStoryKey,
        lastVisitedAt: typeof source.lastVisitedAt === 'string' ? source.lastVisitedAt : defaults.lastVisitedAt,
        recentStoryKeys: Array.isArray(source.recentStoryKeys)
            ? Array.from(new Set(source.recentStoryKeys.filter(value => typeof value === 'string' && value.trim()))).slice(0, 8)
            : defaults.recentStoryKeys,
        bookmarkedStoryKeys: Array.isArray(source.bookmarkedStoryKeys)
            ? Array.from(new Set(source.bookmarkedStoryKeys.filter(value => typeof value === 'string' && value.trim())))
            : defaults.bookmarkedStoryKeys,
        dailyVisits: prunedDailyVisits
    };
}

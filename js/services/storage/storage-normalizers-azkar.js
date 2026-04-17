import { getAzkarManifestEntryByKey } from '../../../data/azkar/categories/manifest.js';
import { isPlainObject, toSafeNumber } from './storage-normalizers-core.js';

const ALLOWED_REMINDER_WINDOWS = new Set(['off', 'smart', 'morning', 'evening', 'prayer']);

export function normalizeAzkarProgressKey(key) {
    const entry = getAzkarManifestEntryByKey(key);
    return entry?.slug || '';
}

export function normalizeAzkarProgress(progress) {
    if (!isPlainObject(progress)) return {};

    return Object.entries(progress).reduce((acc, [key, value]) => {
        const safeKey = normalizeAzkarProgressKey(key);
        if (!safeKey) return acc;

        const safeValue = toSafeNumber(value, 0, { min: 0 });
        if (safeValue <= 0) return acc;

        acc[safeKey] = safeValue;
        return acc;
    }, {});
}

export function createDefaultAzkarSession() {
    return {
        activeCategorySlug: '',
        activeCategoryTitle: '',
        activeItemIndex: 0,
        startedAt: '',
        lastViewedAt: '',
        view: 'grid'
    };
}

export function normalizeAzkarSession(session) {
    const defaults = createDefaultAzkarSession();
    const source = isPlainObject(session) ? session : {};

    return {
        activeCategorySlug: normalizeAzkarProgressKey(source.activeCategorySlug || source.activeCategoryTitle),
        activeCategoryTitle: typeof source.activeCategoryTitle === 'string' ? source.activeCategoryTitle.trim() : '',
        activeItemIndex: Math.trunc(toSafeNumber(source.activeItemIndex, defaults.activeItemIndex, { min: 0 })),
        startedAt: typeof source.startedAt === 'string' ? source.startedAt : '',
        lastViewedAt: typeof source.lastViewedAt === 'string' ? source.lastViewedAt : '',
        view: source.view === 'list' ? 'list' : defaults.view
    };
}

export function createDefaultAzkarPreferences() {
    return {
        focusMode: false,
        largeText: false,
        vibrationEnabled: true,
        reminderEnabled: false,
        reminderWindow: 'smart',
        smartOrderingEnabled: true,
        favoriteSlugs: [],
        favoriteItemIds: []
    };
}

export function normalizeAzkarPreferences(preferences) {
    const defaults = createDefaultAzkarPreferences();
    const source = isPlainObject(preferences) ? preferences : {};
    const favoriteSlugs = Array.isArray(source.favoriteSlugs)
        ? Array.from(new Set(
            source.favoriteSlugs
                .map(value => normalizeAzkarProgressKey(value))
                .filter(Boolean)
        ))
        : defaults.favoriteSlugs;

    const favoriteItemIds = Array.isArray(source.favoriteItemIds)
        ? Array.from(new Set(source.favoriteItemIds.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim())))
        : defaults.favoriteItemIds;

    let reminderWindow = typeof source.reminderWindow === 'string' && source.reminderWindow.trim()
        ? source.reminderWindow.trim()
        : defaults.reminderWindow;
    if (reminderWindow === 'sleep') {
        reminderWindow = 'evening';
    }
    if (!ALLOWED_REMINDER_WINDOWS.has(reminderWindow)) {
        reminderWindow = defaults.reminderWindow;
    }

    return {
        focusMode: typeof source.focusMode === 'boolean'
            ? source.focusMode
            : defaults.focusMode,
        largeText: typeof source.largeText === 'boolean'
            ? source.largeText
            : defaults.largeText,
        vibrationEnabled: typeof source.vibrationEnabled === 'boolean'
            ? source.vibrationEnabled
            : defaults.vibrationEnabled,
        reminderEnabled: typeof source.reminderEnabled === 'boolean'
            ? source.reminderEnabled
            : defaults.reminderEnabled,
        reminderWindow,
        smartOrderingEnabled: typeof source.smartOrderingEnabled === 'boolean'
            ? source.smartOrderingEnabled
            : defaults.smartOrderingEnabled,
        favoriteSlugs,
        favoriteItemIds
    };
}

export function createDefaultAzkarHistory() {
    return {
        lastVisitedSlug: '',
        lastVisitedTitle: '',
        lastVisitedAt: '',
        lastCompletedSlug: '',
        lastCompletedTitle: '',
        lastCompletedAt: '',
        dailyCompletions: {}
    };
}

export function normalizeAzkarHistory(history) {
    const defaults = createDefaultAzkarHistory();
    const source = isPlainObject(history) ? history : {};
    const rawDailyCompletions = isPlainObject(source.dailyCompletions) ? source.dailyCompletions : {};
    const normalizedDailyCompletions = {};

    Object.entries(rawDailyCompletions).forEach(([dateKey, values]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Array.isArray(values)) return;

        const safeValues = Array.from(new Set(
            values
                .map(value => normalizeAzkarProgressKey(value))
                .filter(Boolean)
        ));

        if (safeValues.length > 0) {
            normalizedDailyCompletions[dateKey] = safeValues;
        }
    });

    const recentDates = Object.keys(normalizedDailyCompletions)
        .sort()
        .slice(-21);

    const prunedDailyCompletions = recentDates.reduce((acc, dateKey) => {
        acc[dateKey] = normalizedDailyCompletions[dateKey];
        return acc;
    }, {});

    return {
        lastVisitedSlug: normalizeAzkarProgressKey(source.lastVisitedSlug || source.lastVisitedTitle),
        lastVisitedTitle: typeof source.lastVisitedTitle === 'string' ? source.lastVisitedTitle.trim() : defaults.lastVisitedTitle,
        lastVisitedAt: typeof source.lastVisitedAt === 'string' ? source.lastVisitedAt : defaults.lastVisitedAt,
        lastCompletedSlug: normalizeAzkarProgressKey(source.lastCompletedSlug || source.lastCompletedTitle),
        lastCompletedTitle: typeof source.lastCompletedTitle === 'string' ? source.lastCompletedTitle.trim() : defaults.lastCompletedTitle,
        lastCompletedAt: typeof source.lastCompletedAt === 'string' ? source.lastCompletedAt : defaults.lastCompletedAt,
        dailyCompletions: prunedDailyCompletions
    };
}

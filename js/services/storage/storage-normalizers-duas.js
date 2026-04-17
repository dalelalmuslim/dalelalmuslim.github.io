import { getDuaManifestEntryByKey, resolveDuaSlug } from '../../../data/duas/manifest.js';
import { isPlainObject } from './storage-normalizers-core.js';

export function normalizeDuasProgressKey(key) {
    const entry = getDuaManifestEntryByKey(key);
    if (entry) return entry.slug;

    if (typeof key !== 'string' || !key.trim()) return '';
    return resolveDuaSlug(key);
}

export function createDefaultDuasSession() {
    return {
        activeCategorySlug: '',
        activeCategoryTitle: '',
        activeDuaId: null,
        startedAt: '',
        lastViewedAt: '',
        view: 'grid'
    };
}

export function normalizeDuasSession(session) {
    const defaults = createDefaultDuasSession();
    const source = isPlainObject(session) ? session : {};

    return {
        activeCategorySlug: normalizeDuasProgressKey(source.activeCategorySlug || source.activeCategoryTitle),
        activeCategoryTitle: typeof source.activeCategoryTitle === 'string' ? source.activeCategoryTitle.trim() : '',
        activeDuaId: Number.isFinite(Number(source.activeDuaId)) ? Number(source.activeDuaId) : null,
        startedAt: typeof source.startedAt === 'string' ? source.startedAt : '',
        lastViewedAt: typeof source.lastViewedAt === 'string' ? source.lastViewedAt : '',
        view: source.view === 'list' ? 'list' : defaults.view
    };
}

export function createDefaultDuasPreferences() {
    return {
        focusMode: false,
        largeText: false,
        favoriteSlugs: []
    };
}

export function normalizeDuasPreferences(preferences) {
    const defaults = createDefaultDuasPreferences();
    const source = isPlainObject(preferences) ? preferences : {};
    const favoriteSlugs = Array.isArray(source.favoriteSlugs)
        ? Array.from(new Set(
            source.favoriteSlugs
                .map(value => normalizeDuasProgressKey(value))
                .filter(Boolean)
        ))
        : defaults.favoriteSlugs;

    return {
        focusMode: typeof source.focusMode === 'boolean'
            ? source.focusMode
            : defaults.focusMode,
        largeText: typeof source.largeText === 'boolean'
            ? source.largeText
            : defaults.largeText,
        favoriteSlugs
    };
}

export function createDefaultDuasHistory() {
    return {
        lastVisitedSlug: '',
        lastVisitedTitle: '',
        lastVisitedAt: '',
        lastViewedDuaId: null,
        dailyVisits: {},
        recentSlugs: []
    };
}

export function normalizeDuasHistory(history) {
    const defaults = createDefaultDuasHistory();
    const source = isPlainObject(history) ? history : {};
    const rawDailyVisits = isPlainObject(source.dailyVisits) ? source.dailyVisits : {};
    const normalizedDailyVisits = {};

    Object.entries(rawDailyVisits).forEach(([dateKey, values]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Array.isArray(values)) return;

        const safeValues = Array.from(new Set(
            values
                .map(value => normalizeDuasProgressKey(value))
                .filter(Boolean)
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
        lastVisitedSlug: normalizeDuasProgressKey(source.lastVisitedSlug || source.lastVisitedTitle),
        lastVisitedTitle: typeof source.lastVisitedTitle === 'string' ? source.lastVisitedTitle.trim() : defaults.lastVisitedTitle,
        lastVisitedAt: typeof source.lastVisitedAt === 'string' ? source.lastVisitedAt : defaults.lastVisitedAt,
        lastViewedDuaId: Number.isFinite(Number(source.lastViewedDuaId)) ? Number(source.lastViewedDuaId) : defaults.lastViewedDuaId,
        dailyVisits: prunedDailyVisits,
        recentSlugs: Array.isArray(source.recentSlugs)
            ? Array.from(new Set(source.recentSlugs.map(value => normalizeDuasProgressKey(value)).filter(Boolean))).slice(-7)
            : defaults.recentSlugs
    };
}

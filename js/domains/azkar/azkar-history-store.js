import { getStorageDateKey } from '../../services/storage/storage-access.js';
import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getAzkarManifestEntryByKey, resolveAzkarSlug } from '../../../data/azkar/categories/manifest.js';

const DEFAULT_HISTORY = Object.freeze({
    lastVisitedSlug: '',
    lastVisitedTitle: '',
    lastVisitedAt: '',
    lastCompletedSlug: '',
    lastCompletedTitle: '',
    lastCompletedAt: '',
    dailyCompletions: {}
});

function ensureHistoryState() {
    const state = getStorageState();
    if (!state) return {
        ...DEFAULT_HISTORY,
        dailyCompletions: {}
    };

    if (!state.azkarHistory || typeof state.azkarHistory !== 'object') {
        state.azkarHistory = {
            ...DEFAULT_HISTORY,
            dailyCompletions: {}
        };
    }

    if (!state.azkarHistory.dailyCompletions || typeof state.azkarHistory.dailyCompletions !== 'object') {
        state.azkarHistory.dailyCompletions = {};
    }

    return state.azkarHistory;
}

function resolveCategoryState(category) {
    const entry = getAzkarManifestEntryByKey(category);
    return {
        slug: entry?.slug || resolveAzkarSlug(category?.slug || category),
        title: entry?.title || category?.title || category?.category || ''
    };
}

function pruneHistoryDates(dailyCompletions) {
    const recentDates = Object.keys(dailyCompletions).sort().slice(-21);
    return recentDates.reduce((acc, dateKey) => {
        acc[dateKey] = dailyCompletions[dateKey];
        return acc;
    }, {});
}

export const azkarHistoryStore = {
    getState() {
        return ensureHistoryState();
    },

    markCategoryVisited(category) {
        const { slug, title } = resolveCategoryState(category);
        if (!slug) return null;

        return updateStorageState((state) => {
            if (!state.azkarHistory || typeof state.azkarHistory !== 'object') {
                state.azkarHistory = ensureHistoryState();
            }

            state.azkarHistory.lastVisitedSlug = slug;
            state.azkarHistory.lastVisitedTitle = title;
            state.azkarHistory.lastVisitedAt = new Date().toISOString();
            return state.azkarHistory;
        });
    },

    markCategoryCompleted(category) {
        const { slug, title } = resolveCategoryState(category);
        if (!slug) return null;

        return updateStorageState((state) => {
            if (!state.azkarHistory || typeof state.azkarHistory !== 'object') {
                state.azkarHistory = ensureHistoryState();
            }

            const today = getStorageDateKey();
            const currentList = Array.isArray(state.azkarHistory.dailyCompletions?.[today])
                ? state.azkarHistory.dailyCompletions[today]
                : [];
            const nextList = Array.from(new Set([...currentList, slug]));

            state.azkarHistory.lastCompletedSlug = slug;
            state.azkarHistory.lastCompletedTitle = title;
            state.azkarHistory.lastCompletedAt = new Date().toISOString();
            state.azkarHistory.dailyCompletions = pruneHistoryDates({
                ...state.azkarHistory.dailyCompletions,
                [today]: nextList
            });

            return state.azkarHistory;
        });
    }
};

import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getAzkarManifestEntryByKey, resolveAzkarSlug } from '../../../data/azkar/categories/manifest.js';

function ensureSessionState() {
    const state = getStorageState();
    if (!state) return {
        activeCategorySlug: '',
        activeCategoryTitle: '',
        activeItemIndex: 0,
        startedAt: '',
        lastViewedAt: '',
        view: 'grid'
    };

    if (!state.azkarSession || typeof state.azkarSession !== 'object') {
        state.azkarSession = {
            activeCategorySlug: '',
            activeCategoryTitle: '',
            activeItemIndex: 0,
            startedAt: '',
            lastViewedAt: '',
            view: 'grid'
        };
    }

    return state.azkarSession;
}

function resolveCategoryState(category) {
    const entry = getAzkarManifestEntryByKey(category);
    return {
        slug: entry?.slug || resolveAzkarSlug(category?.slug || category),
        title: entry?.title || category?.title || category?.category || ''
    };
}

export const azkarSessionStore = {
    getState() {
        return ensureSessionState();
    },

    setActiveCategory(category, activeItemIndex = 0) {
        const { slug, title } = resolveCategoryState(category);
        if (!slug) return null;

        return updateStorageState((state) => {
            if (!state.azkarSession || typeof state.azkarSession !== 'object') {
                state.azkarSession = ensureSessionState();
            }

            const now = new Date().toISOString();
            const nextStartedAt = state.azkarSession.activeCategorySlug === slug && state.azkarSession.startedAt
                ? state.azkarSession.startedAt
                : now;

            state.azkarSession = {
                ...state.azkarSession,
                activeCategorySlug: slug,
                activeCategoryTitle: title,
                activeItemIndex: Math.max(0, Number(activeItemIndex) || 0),
                startedAt: nextStartedAt,
                lastViewedAt: now,
                view: 'list'
            };

            return state.azkarSession;
        });
    },

    setActiveItemIndex(index) {
        return updateStorageState((state) => {
            if (!state.azkarSession || typeof state.azkarSession !== 'object') {
                state.azkarSession = ensureSessionState();
            }

            state.azkarSession.activeItemIndex = Math.max(0, Number(index) || 0);
            state.azkarSession.lastViewedAt = new Date().toISOString();
            return state.azkarSession.activeItemIndex;
        });
    },

    clearActiveCategory() {
        return updateStorageState((state) => {
            if (!state.azkarSession || typeof state.azkarSession !== 'object') {
                state.azkarSession = ensureSessionState();
            }

            state.azkarSession = {
                ...state.azkarSession,
                activeCategorySlug: '',
                activeCategoryTitle: '',
                activeItemIndex: 0,
                view: 'grid'
            };
            return state.azkarSession;
        });
    }
};

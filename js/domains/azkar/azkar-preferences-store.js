import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { resolveAzkarSlug } from '../../../data/azkar/categories/manifest.js';

export const AZKAR_REMINDER_WINDOWS = Object.freeze(['off', 'smart', 'morning', 'evening', 'prayer']);

const DEFAULT_PREFERENCES = Object.freeze({
    vibrationEnabled: true,
    focusMode: false,
    largeText: false,
    reminderEnabled: false,
    reminderWindow: 'smart',
    smartOrderingEnabled: true,
    favoriteSlugs: [],
    favoriteItemIds: []
});

function normalizeFavoriteSlugs(value) {
    if (!Array.isArray(value)) return [];

    return Array.from(new Set(
        value
            .map(item => resolveAzkarSlug(item))
            .filter(Boolean)
    ));
}

function normalizeFavoriteItemIds(value) {
    if (!Array.isArray(value)) return [];

    return Array.from(new Set(
        value
            .map(item => typeof item === 'string' ? item.trim() : '')
            .filter(Boolean)
    ));
}

function normalizeReminderWindow(value) {
    if (typeof value !== 'string' || !value.trim()) return DEFAULT_PREFERENCES.reminderWindow;
    const normalized = value.trim();
    if (normalized === 'sleep') return 'evening';
    return AZKAR_REMINDER_WINDOWS.includes(normalized)
        ? normalized
        : DEFAULT_PREFERENCES.reminderWindow;
}

function normalizePreferences(rawValue) {
    const value = rawValue && typeof rawValue === 'object' ? rawValue : {};

    return {
        vibrationEnabled: typeof value.vibrationEnabled === 'boolean'
            ? value.vibrationEnabled
            : DEFAULT_PREFERENCES.vibrationEnabled,
        focusMode: typeof value.focusMode === 'boolean'
            ? value.focusMode
            : DEFAULT_PREFERENCES.focusMode,
        largeText: typeof value.largeText === 'boolean'
            ? value.largeText
            : DEFAULT_PREFERENCES.largeText,
        reminderEnabled: typeof value.reminderEnabled === 'boolean'
            ? value.reminderEnabled
            : DEFAULT_PREFERENCES.reminderEnabled,
        reminderWindow: normalizeReminderWindow(value.reminderWindow),
        smartOrderingEnabled: typeof value.smartOrderingEnabled === 'boolean'
            ? value.smartOrderingEnabled
            : DEFAULT_PREFERENCES.smartOrderingEnabled,
        favoriteSlugs: normalizeFavoriteSlugs(value.favoriteSlugs),
        favoriteItemIds: normalizeFavoriteItemIds(value.favoriteItemIds)
    };
}

function ensurePreferencesState() {
    const state = getStorageState();
    if (!state) return { ...DEFAULT_PREFERENCES };

    state.azkarPreferences = normalizePreferences(state.azkarPreferences);
    return state.azkarPreferences;
}

export const azkarPreferencesStore = {
    getState() {
        return ensurePreferencesState();
    },

    update(partialPreferences = {}) {
        return updateStorageState((state) => {
            state.azkarPreferences = normalizePreferences({
                ...normalizePreferences(state.azkarPreferences),
                ...(partialPreferences || {})
            });
            return state.azkarPreferences;
        });
    },

    toggleFavorite(categoryKey) {
        const slug = resolveAzkarSlug(categoryKey);
        if (!slug) return null;

        return updateStorageState((state) => {
            const current = normalizePreferences(state.azkarPreferences);
            const currentFavorites = current.favoriteSlugs;
            const nextFavorites = currentFavorites.includes(slug)
                ? currentFavorites.filter(item => item !== slug)
                : [...currentFavorites, slug];

            state.azkarPreferences = normalizePreferences({
                ...current,
                favoriteSlugs: nextFavorites
            });

            return state.azkarPreferences.favoriteSlugs;
        });
    },

    isFavorite(categoryKey) {
        const slug = resolveAzkarSlug(categoryKey);
        if (!slug) return false;
        return this.getState().favoriteSlugs.includes(slug);
    },

    toggleFavoriteItem(itemId) {
        const safeItemId = typeof itemId === 'string' ? itemId.trim() : '';
        if (!safeItemId) return null;

        return updateStorageState((state) => {
            const current = normalizePreferences(state.azkarPreferences);
            const currentFavorites = current.favoriteItemIds;
            const nextFavorites = currentFavorites.includes(safeItemId)
                ? currentFavorites.filter(item => item !== safeItemId)
                : [...currentFavorites, safeItemId];

            state.azkarPreferences = normalizePreferences({
                ...current,
                favoriteItemIds: nextFavorites
            });

            return state.azkarPreferences.favoriteItemIds;
        });
    },

    isFavoriteItem(itemId) {
        const safeItemId = typeof itemId === 'string' ? itemId.trim() : '';
        if (!safeItemId) return false;
        return this.getState().favoriteItemIds.includes(safeItemId);
    },

    cycleReminderWindow() {
        return updateStorageState((state) => {
            const current = normalizePreferences(state.azkarPreferences);
            const currentIndex = AZKAR_REMINDER_WINDOWS.indexOf(current.reminderWindow);
            const nextWindow = AZKAR_REMINDER_WINDOWS[(currentIndex + 1 + AZKAR_REMINDER_WINDOWS.length) % AZKAR_REMINDER_WINDOWS.length] || 'off';

            state.azkarPreferences = normalizePreferences({
                ...current,
                reminderWindow: nextWindow,
                reminderEnabled: nextWindow !== 'off'
            });

            return state.azkarPreferences;
        });
    },

    toggleSmartOrdering() {
        const current = this.getState();
        return this.update({ smartOrderingEnabled: !Boolean(current.smartOrderingEnabled) });
    }
};

import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { resolveDuaSlug } from '../../../data/duas/manifest.js';

const DEFAULT_PREFERENCES = Object.freeze({
  focusMode: false,
  largeText: false,
  favoriteSlugs: []
});

function normalizeFavoriteSlugs(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(resolveDuaSlug).filter(Boolean)));
}

function normalizePreferences(rawValue) {
  const value = rawValue && typeof rawValue === 'object' ? rawValue : {};
  return {
    focusMode: typeof value.focusMode === 'boolean' ? value.focusMode : DEFAULT_PREFERENCES.focusMode,
    largeText: typeof value.largeText === 'boolean' ? value.largeText : DEFAULT_PREFERENCES.largeText,
    favoriteSlugs: normalizeFavoriteSlugs(value.favoriteSlugs)
  };
}

function ensurePreferencesState() {
  const state = getStorageState();
  if (!state) return { ...DEFAULT_PREFERENCES };
  state.duasPreferences = normalizePreferences(state.duasPreferences);
  return state.duasPreferences;
}

export const duasPreferencesStore = {
  getState() {
    return ensurePreferencesState();
  },
  update(partial = {}) {
    return updateStorageState((state) => {
      state.duasPreferences = normalizePreferences({
        ...normalizePreferences(state.duasPreferences),
        ...(partial || {})
      });
      return state.duasPreferences;
    });
  },
  toggleFavorite(categoryKey) {
    const slug = resolveDuaSlug(categoryKey);
    if (!slug) return null;
    return updateStorageState((state) => {
      const current = normalizePreferences(state.duasPreferences);
      const nextFavorites = current.favoriteSlugs.includes(slug)
        ? current.favoriteSlugs.filter(item => item !== slug)
        : [...current.favoriteSlugs, slug];
      state.duasPreferences = normalizePreferences({ ...current, favoriteSlugs: nextFavorites });
      return state.duasPreferences.favoriteSlugs;
    });
  },
  isFavorite(categoryKey) {
    const slug = resolveDuaSlug(categoryKey);
    return slug ? this.getState().favoriteSlugs.includes(slug) : false;
  }
};

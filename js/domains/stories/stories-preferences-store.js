import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { resolveStoryCategorySlug } from '../../../data/stories/manifest.js';

const DEFAULT_PREFERENCES = Object.freeze({
  focusMode: false,
  largeText: false,
  favoriteStoryKeys: [],
  pinnedCategorySlugs: []
});

function ensureStoriesPreferences() {
  const state = getStorageState();
  if (!state) return { ...DEFAULT_PREFERENCES, favoriteStoryKeys: [], pinnedCategorySlugs: [] };
  if (!state.storiesPreferences || typeof state.storiesPreferences !== 'object') {
    state.storiesPreferences = { ...DEFAULT_PREFERENCES, favoriteStoryKeys: [], pinnedCategorySlugs: [] };
  }
  return state.storiesPreferences;
}

export const storiesPreferencesStore = {
  getState() {
    return ensureStoriesPreferences();
  },
  update(partial) {
    return updateStorageState((state) => {
      const current = ensureStoriesPreferences();
      state.storiesPreferences = {
        ...current,
        ...partial,
        favoriteStoryKeys: Array.isArray(partial?.favoriteStoryKeys)
          ? Array.from(new Set(partial.favoriteStoryKeys.filter(Boolean)))
          : current.favoriteStoryKeys,
        pinnedCategorySlugs: Array.isArray(partial?.pinnedCategorySlugs)
          ? Array.from(new Set(
            partial.pinnedCategorySlugs
              .map((value) => resolveStoryCategorySlug(value))
              .filter(Boolean)
          ))
          : current.pinnedCategorySlugs
      };
      return state.storiesPreferences;
    });
  },
  toggleFavoriteStory(storyKey) {
    if (!storyKey) return null;
    return updateStorageState((state) => {
      const current = ensureStoriesPreferences();
      const nextFavorites = current.favoriteStoryKeys.includes(storyKey)
        ? current.favoriteStoryKeys.filter((item) => item !== storyKey)
        : [...current.favoriteStoryKeys, storyKey];
      state.storiesPreferences = {
        ...current,
        favoriteStoryKeys: nextFavorites
      };
      return state.storiesPreferences;
    });
  },
  togglePinnedCategory(categorySlug) {
    const safeSlug = resolveStoryCategorySlug(categorySlug);
    if (!safeSlug) return null;
    return updateStorageState((state) => {
      const current = ensureStoriesPreferences();
      const nextPinned = current.pinnedCategorySlugs.includes(safeSlug)
        ? current.pinnedCategorySlugs.filter((item) => item !== safeSlug)
        : [...current.pinnedCategorySlugs, safeSlug];
      state.storiesPreferences = {
        ...current,
        pinnedCategorySlugs: nextPinned
      };
      return state.storiesPreferences;
    });
  }
};

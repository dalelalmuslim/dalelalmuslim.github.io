import { getStorageDateKey, getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getStoryManifestEntryByKey, resolveStoryCategorySlug } from '../../../data/stories/manifest.js';

const DEFAULT_HISTORY = Object.freeze({
  lastVisitedCategorySlug: '',
  lastVisitedStoryKey: '',
  lastVisitedAt: '',
  recentStoryKeys: [],
  bookmarkedStoryKeys: [],
  dailyVisits: {}
});

function ensureStoriesHistory() {
  const state = getStorageState();
  if (!state) {
    return { ...DEFAULT_HISTORY, recentStoryKeys: [], bookmarkedStoryKeys: [], dailyVisits: {} };
  }
  if (!state.storiesHistory || typeof state.storiesHistory !== 'object') {
    state.storiesHistory = { ...DEFAULT_HISTORY, recentStoryKeys: [], bookmarkedStoryKeys: [], dailyVisits: {} };
  }
  return state.storiesHistory;
}

function pruneDailyVisits(dailyVisits) {
  const dates = Object.keys(dailyVisits).sort().slice(-21);
  return Object.fromEntries(
    dates.map((dateKey) => [dateKey, Array.from(new Set((dailyVisits[dateKey] || []).filter(Boolean)))] )
  );
}

export const storiesHistoryStore = {
  getState() {
    return ensureStoriesHistory();
  },
  markVisited(category, storyKey = '') {
    const entry = getStoryManifestEntryByKey(category);
    const categorySlug = entry?.slug || resolveStoryCategorySlug(category);
    if (!categorySlug) return null;

    return updateStorageState((state) => {
      const current = ensureStoriesHistory();
      const today = getStorageDateKey();
      const todayVisits = Array.isArray(current.dailyVisits[today]) ? current.dailyVisits[today] : [];
      state.storiesHistory = {
        ...current,
        lastVisitedCategorySlug: categorySlug,
        lastVisitedStoryKey: storyKey || current.lastVisitedStoryKey || '',
        lastVisitedAt: new Date().toISOString(),
        recentStoryKeys: storyKey
          ? Array.from(new Set([storyKey, ...current.recentStoryKeys.filter((item) => item !== storyKey)])).slice(0, 8)
          : current.recentStoryKeys,
        dailyVisits: pruneDailyVisits({
          ...current.dailyVisits,
          [today]: storyKey ? [storyKey, ...todayVisits] : todayVisits
        })
      };
      return state.storiesHistory;
    });
  },
  toggleBookmark(storyKey) {
    if (!storyKey) return null;
    return updateStorageState((state) => {
      const current = ensureStoriesHistory();
      const nextBookmarks = current.bookmarkedStoryKeys.includes(storyKey)
        ? current.bookmarkedStoryKeys.filter((item) => item !== storyKey)
        : [...current.bookmarkedStoryKeys, storyKey];
      state.storiesHistory = {
        ...current,
        bookmarkedStoryKeys: nextBookmarks
      };
      return state.storiesHistory;
    });
  }
};

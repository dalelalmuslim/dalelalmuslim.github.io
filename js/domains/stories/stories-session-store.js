import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getStoryManifestEntryByKey, resolveStoryCategorySlug } from '../../../data/stories/manifest.js';
import { getStoryByCategoryAndId, getStoryByKey } from './stories-repository.js';

const DEFAULT_SESSION = Object.freeze({
  activeCategorySlug: '',
  activeCategoryTitle: '',
  activeStoryKey: '',
  startedAt: '',
  lastViewedAt: '',
  view: 'grid'
});

function ensureStoriesSession() {
  const state = getStorageState();
  if (!state) return { ...DEFAULT_SESSION };
  if (!state.storiesSession || typeof state.storiesSession !== 'object') {
    state.storiesSession = { ...DEFAULT_SESSION };
  }
  return state.storiesSession;
}

export const storiesSessionStore = {
  getState() {
    return ensureStoriesSession();
  },
  openCategory(category, storyKey = '') {
    const entry = getStoryManifestEntryByKey(category);
    const slug = entry?.slug || resolveStoryCategorySlug(category);
    if (!slug) return null;
    const story = storyKey ? getStoryByKey(storyKey) : null;
    return updateStorageState((state) => {
      const current = ensureStoriesSession();
      state.storiesSession = {
        ...current,
        activeCategorySlug: slug,
        activeCategoryTitle: entry?.title || category?.title || current.activeCategoryTitle || '',
        activeStoryKey: story?.storyKey || current.activeStoryKey || '',
        startedAt: current.startedAt || new Date().toISOString(),
        lastViewedAt: new Date().toISOString(),
        view: 'reader'
      };
      return state.storiesSession;
    });
  },
  setActiveStory(categoryKey, storyIdOrKey) {
    const category = getStoryManifestEntryByKey(categoryKey);
    const story = typeof storyIdOrKey === 'string' && storyIdOrKey.includes(':')
      ? getStoryByKey(storyIdOrKey)
      : getStoryByCategoryAndId(category?.slug || categoryKey, storyIdOrKey);
    if (!story) return null;
    return updateStorageState((state) => {
      const current = ensureStoriesSession();
      state.storiesSession = {
        ...current,
        activeCategorySlug: story.categorySlug,
        activeCategoryTitle: story.categoryTitle,
        activeStoryKey: story.storyKey,
        lastViewedAt: new Date().toISOString(),
        view: 'reader'
      };
      return state.storiesSession;
    });
  },
  reset() {
    return updateStorageState((state) => {
      state.storiesSession = { ...DEFAULT_SESSION };
      return state.storiesSession;
    });
  }
};

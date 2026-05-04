const DEFAULT_SESSION = Object.freeze({
  activeStoryKey: '',
  contextStoryKeys: [],
  sourceFilter: 'all',
  sourceQuery: '',
  sourceScrollY: 0,
  openedAt: ''
});

let sessionState = { ...DEFAULT_SESSION, contextStoryKeys: [] };

function normalizeStoryKeys(values) {
  return Array.isArray(values)
    ? Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim())))
    : [];
}

export const storiesSessionStore = {
  getState() {
    return {
      ...sessionState,
      contextStoryKeys: [...sessionState.contextStoryKeys]
    };
  },

  openReader({ storyKey, contextStoryKeys = [], sourceFilter = 'all', sourceQuery = '', sourceScrollY = 0 } = {}) {
    if (!storyKey) return null;

    sessionState = {
      activeStoryKey: storyKey,
      contextStoryKeys: normalizeStoryKeys(contextStoryKeys),
      sourceFilter: sourceFilter || 'all',
      sourceQuery: String(sourceQuery || ''),
      sourceScrollY: Math.max(0, Number(sourceScrollY) || 0),
      openedAt: new Date().toISOString()
    };

    return this.getState();
  },

  setActiveStory(storyKey) {
    if (!storyKey) return null;
    sessionState = {
      ...sessionState,
      activeStoryKey: storyKey,
      openedAt: new Date().toISOString()
    };
    return this.getState();
  },

  reset() {
    sessionState = { ...DEFAULT_SESSION, contextStoryKeys: [] };
    return this.getState();
  }
};

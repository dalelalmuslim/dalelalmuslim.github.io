const EMPTY_PREFERENCES = Object.freeze({
  focusMode: false,
  largeText: false,
  favoriteStoryKeys: [],
  pinnedCategorySlugs: []
});

export const storiesPreferencesStore = {
  getState() {
    return {
      ...EMPTY_PREFERENCES,
      favoriteStoryKeys: [],
      pinnedCategorySlugs: []
    };
  },
  update() {
    return this.getState();
  },
  toggleFavoriteStory() {
    return this.getState();
  },
  togglePinnedCategory() {
    return this.getState();
  }
};

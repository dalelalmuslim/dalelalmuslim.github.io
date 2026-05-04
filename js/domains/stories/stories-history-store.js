const EMPTY_HISTORY = Object.freeze({
  lastVisitedCategorySlug: '',
  lastVisitedStoryKey: '',
  lastVisitedAt: '',
  recentStoryKeys: [],
  bookmarkedStoryKeys: [],
  dailyVisits: {}
});

export const storiesHistoryStore = {
  getState() {
    return {
      ...EMPTY_HISTORY,
      recentStoryKeys: [],
      bookmarkedStoryKeys: [],
      dailyVisits: {}
    };
  },
  markVisited() {
    return this.getState();
  },
  toggleBookmark() {
    return this.getState();
  }
};

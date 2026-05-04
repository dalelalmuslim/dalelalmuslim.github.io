function byId(id) {
  return document.getElementById(id);
}

export function cacheStoriesDom() {
  return {
    root: byId('storiesGrid'),
    mainView: byId('storyCategoriesGrid'),
    reader: byId('storyCategoryContent'),
    searchInput: byId('storiesSearchInput'),
    filterChips: byId('storiesFilterChips'),
    summary: byId('storiesStreamSummary'),
    list: byId('storiesStreamList')
  };
}

function byId(id) {
  return document.getElementById(id);
}

export function cacheStoriesDom() {
  return {
    root: byId('storiesGrid'),
    mainView: byId('storyCategoriesGrid'),
    content: byId('storyCategoryContent'),
    summary: byId('storiesSummaryText')
  };
}

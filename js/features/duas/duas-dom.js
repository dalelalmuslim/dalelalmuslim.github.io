export function cacheDuasDom() {
  return {
    root: document.getElementById('duasList'),
    catalogHome: document.getElementById('duasCatalogHome'),
    searchInput: document.getElementById('duasSearchInput'),
    filters: document.getElementById('duasFilters'),
    grid: document.getElementById('duaCategoriesGrid'),
    content: document.getElementById('duaCategoryContent')
  };
}

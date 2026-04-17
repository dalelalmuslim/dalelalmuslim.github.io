global.window = globalThis;
const store = new Map();
global.localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); }
};
const { storage } = await import('./js/services/storage/index.js');
const { namesStore } = await import('./js/domains/names/names-store.js');
const { getFavoriteCount, getResumeNameEntry, resolveDailyNameEntry, getVisibleNamesEntries } = await import('./js/domains/names/names-selectors.js');
const { ALLAH_NAMES } = await import('./data/names/names-data.js');

storage.init();
const namesArray = ALLAH_NAMES.ar;

namesStore.toggleFavorite(1);
namesStore.toggleFavorite(5);
namesStore.markViewed(5);
namesStore.setFilter('favorites');
const daily = resolveDailyNameEntry(namesArray);
const resume = getResumeNameEntry(namesArray);
const visible = getVisibleNamesEntries(namesArray);

const payload = {
  schemaVersion: storage.state.schemaVersion,
  favoriteCount: getFavoriteCount(),
  resumeName: resume?.name || '',
  dailyName: daily?.name || '',
  visibleCount: visible.length,
  activeFilter: storage.state.namesState.view.activeFilter,
  lastViewedIndex: storage.state.namesState.learningProgress.lastViewedIndex
};
console.log(JSON.stringify(payload, null, 2));

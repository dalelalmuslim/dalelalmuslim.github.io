class MemoryStorage {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

globalThis.localStorage = new MemoryStorage();

const { APP_CONFIG } = await import('./js/app/app-config.js');
const storageKey = APP_CONFIG.STORAGE_KEY;

function parseSaved() {
  const raw = globalThis.localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : null;
}

const { storage } = await import('./js/services/storage/index.js');
const { quranReadingStore } = await import('./js/domains/quran/quran-reading-store.js');
const { getResumePoint, getResumeSource, getResumeSourceLabel } = await import('./js/domains/quran/quran-reading-selectors.js');
const { quranHifzStore } = await import('./js/domains/quran/quran-hifz-store.js');
const { getQuranHifzSummary } = await import('./js/domains/quran/quran-hifz-selectors.js');

const legacy = {
  schemaVersion: 7,
  quranBookmark: { surahNum: 2, surahName: 'البقرة', scroll: 345 }
};
globalThis.localStorage.setItem(storageKey, JSON.stringify(legacy));
storage.init();
const migrated = parseSaved();

const results = [];
results.push({
  name: 'migrates legacy quranBookmark to quranReading.lastRead',
  pass: migrated?.quranReading?.lastRead?.surahNum === 2 && migrated?.quranReading?.lastRead?.scroll === 345
});
results.push({
  name: 'migrates legacy quranBookmark to quranReading.bookmark',
  pass: migrated?.quranReading?.bookmark?.surahNum === 2 && migrated?.quranReading?.bookmark?.scroll === 345
});
results.push({
  name: 'bumps schemaVersion to current',
  pass: migrated?.schemaVersion === APP_CONFIG.SCHEMA_VERSION
});

quranReadingStore.saveLastRead({ surahNum: 36, surahName: 'يس', scroll: 120, updatedAt: '2026-04-06T10:00:00.000Z' });
results.push({
  name: 'resume prefers bookmark over lastRead',
  pass: getResumePoint()?.surahNum === 2 && getResumeSource() === 'bookmark' && /العلامة/.test(getResumeSourceLabel())
});
quranReadingStore.clearBookmark();
results.push({
  name: 'resume falls back to lastRead after clearing bookmark',
  pass: getResumePoint()?.surahNum === 36 && getResumeSource() === 'lastRead' && /آخر قراءة/.test(getResumeSourceLabel())
});

quranHifzStore.addToReview({ key: '36:1', surahNum: 36, surahName: 'يس', verseNum: 1, text: 'يس' });
quranHifzStore.addToReview({ key: '36:2', surahNum: 36, surahName: 'يس', verseNum: 2, text: 'وَالْقُرْآنِ الْحَكِيمِ' });
quranHifzStore.markMemorized({ key: '36:1', surahNum: 36, surahName: 'يس', verseNum: 1, text: 'يس' });
const summary = getQuranHifzSummary();
results.push({
  name: 'hifz summary tracks review and memorized counts',
  pass: summary.reviewCount === 1 && summary.memorizedCount === 1 && summary.nextReview?.key === '36:2'
});

const saved = parseSaved();
results.push({
  name: 'saved quranReading state remains normalized',
  pass: saved?.quranReading?.lastRead?.surahNum === 36 && saved?.quranReading?.bookmark === null
});
results.push({
  name: 'saved quranHifz state is persisted',
  pass: Array.isArray(saved?.quranHifz?.entries) && saved.quranHifz.entries.length === 2
});

const failed = results.filter(r => !r.pass);
console.log(JSON.stringify({
  schemaVersion: APP_CONFIG.SCHEMA_VERSION,
  storageKey,
  results,
  passed: results.length - failed.length,
  failed: failed.length
}, null, 2));
if (failed.length) process.exit(1);

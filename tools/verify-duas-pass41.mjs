import { createBaseStorageState } from '../js/services/storage/storage-schema.js';
import { storage } from '../js/services/storage/storage-manager.js';
import { getDuasManifest } from '../data/duas/manifest.js';
import { getDuaCategoryBySlug, getDuasCatalog } from '../js/domains/duas/duas-repository.js';
import { duasSessionStore } from '../js/domains/duas/duas-session-store.js';
import {
  getDailyDuaViewModel,
  getDuasCatalogViewModel
} from '../js/domains/duas/duas-selectors.js';
import { renderDuasShell } from '../js/features/duas/duas-renderers.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resetStorage() {
  storage.state = createBaseStorageState();
}

function getExpectedEditorialOrder() {
  return [...getDuasManifest()]
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title, 'ar'))
    .map((entry) => entry.slug);
}

function findDeepSearchProbe() {
  for (const category of getDuasCatalog()) {
    if (!Array.isArray(category.items) || category.items.length < 10) continue;
    const item = category.items[9];
    const words = String(item?.text || '')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .split(/\s+/)
      .filter((word) => word.length >= 3);
    if (words.length >= 2) {
      return {
        slug: category.slug,
        query: words.slice(0, 2).join(' ')
      };
    }
  }
  throw new Error('Unable to build deep search probe from duas data.');
}

function verifyEditorialOrder() {
  resetStorage();
  const actual = getDuasCatalogViewModel().cards.map((card) => card.slug);
  const expected = getExpectedEditorialOrder();
  assert(JSON.stringify(actual) === JSON.stringify(expected), 'Catalog order is not aligned with manifest sortOrder.');
}

function verifySourceFilters() {
  resetStorage();
  const quranCards = getDuasCatalogViewModel({ filter: 'quran' }).cards;
  const hadithCards = getDuasCatalogViewModel({ filter: 'hadith' }).cards;
  assert(quranCards.length > 0, 'Quran filter returned no cards.');
  assert(hadithCards.length > 0, 'Hadith filter returned no cards.');
  assert(quranCards.every((card) => card.sourceType === 'quran'), 'Quran filter leaked non-quran categories.');
  assert(hadithCards.every((card) => card.sourceType === 'hadith'), 'Hadith filter leaked mixed/quran categories.');
}

function verifyDeepSearchIndex() {
  resetStorage();
  const probe = findDeepSearchProbe();
  const cards = getDuasCatalogViewModel({ query: probe.query }).cards;
  assert(cards.some((card) => card.slug === probe.slug), `Deep search query did not match expected category: ${probe.slug}`);
}

function verifySessionActiveDuaReset() {
  resetStorage();
  const first = getDuaCategoryBySlug('quran-duas');
  const second = getDuaCategoryBySlug('health-and-healing');
  assert(first?.items?.length, 'First category missing items.');
  assert(second?.items?.length, 'Second category missing items.');
  duasSessionStore.openCategory(first, { activeDuaId: first.items[2].id });
  duasSessionStore.openCategory(second, { activeDuaId: second.items[0].id });
  const session = duasSessionStore.getState();
  assert(session.activeCategorySlug === second.slug, 'Session did not switch to the second category.');
  assert(session.activeDuaId === second.items[0].id, 'Session activeDuaId leaked from previous category.');
}

function verifyShellContracts() {
  const daily = getDailyDuaViewModel();
  const homeShell = renderDuasShell({ dailyDua: daily, activeFilter: 'all', searchQuery: '', showCatalogHome: true });
  const sessionShell = renderDuasShell({ dailyDua: daily, activeFilter: 'all', searchQuery: '', showCatalogHome: false });
  assert(homeShell.includes('id="duasCatalogHome"'), 'Home shell is missing the catalog wrapper required by subview manager.');
  assert(homeShell.includes('id="duaCategoryContent" class="duas-category-content is-hidden"'), 'Home shell should hide session content by default.');
  assert(sessionShell.includes('id="duasCatalogHome" class="duas-catalog-home is-hidden"'), 'Session shell should hide catalog wrapper while preserving its DOM node.');
  assert(sessionShell.includes('id="duaCategoryContent" class="duas-category-content"'), 'Session shell should render visible session content container.');
}

verifyEditorialOrder();
verifySourceFilters();
verifyDeepSearchIndex();
verifySessionActiveDuaReset();
verifyShellContracts();

console.log('PASS: verify-duas-pass41');

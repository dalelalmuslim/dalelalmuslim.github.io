import { getAllDuaItems, getDuaCategoryBySlug, getDuasCatalog } from './duas-repository.js';
import { duasHistoryStore } from './duas-history-store.js';
import { duasPreferencesStore } from './duas-preferences-store.js';
import { duasSessionStore } from './duas-session-store.js';

function getSourceMetaFromType(sourceType) {
  if (sourceType === 'quran') return 'من القرآن';
  if (sourceType === 'hadith') return 'من السنة';
  return 'قرآن • سنة';
}

function normalizeArabicText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashDateKey(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function getDailyDuaItem() {
  const allItems = getAllDuaItems();
  if (!allItems.length) return null;
  const today = getLocalDateKey();
  const index = hashDateKey(today) % allItems.length;
  return allItems[index] || allItems[0];
}

function getShortReference(referenceText) {
  const value = String(referenceText || '').trim();
  if (!value) return '';
  const firstSegment = value.split('•')[0].trim();
  const shortened = firstSegment.length > 70 ? `${firstSegment.slice(0, 67).trim()}…` : firstSegment;
  return shortened;
}

function buildCategoryQueryText(category) {
  const sourceMeta = getSourceMetaFromType(category.sourceType);
  const fullItemsText = category.items
    .map((item) => `${item.text} ${item.referenceText}`)
    .join(' ');

  return normalizeArabicText([
    category.title,
    category.description,
    sourceMeta,
    fullItemsText
  ].join(' '));
}

export function getDuasCatalogViewModel({ filter = 'all', query = '' } = {}) {
  const preferences = duasPreferencesStore.getState();
  const normalizedQuery = normalizeArabicText(query);
  const sourceFilter = ['all', 'quran', 'hadith', 'favorites', 'featured'].includes(filter)
    ? filter
    : 'all';

  const cards = getDuasCatalog()
    .map((category) => ({
      slug: category.slug,
      title: category.title,
      description: category.description,
      icon: category.icon,
      accentTone: category.accentTone,
      estimatedMinutes: category.estimatedMinutes,
      itemCount: category.itemCount,
      sourceType: category.sourceType,
      sourceMeta: getSourceMetaFromType(category.sourceType),
      isFeatured: category.isFeatured,
      isFavorite: preferences.favoriteSlugs.includes(category.slug),
      sortOrder: Number.isFinite(Number(category.sortOrder)) ? Number(category.sortOrder) : 9999,
      queryText: buildCategoryQueryText(category)
    }))
    .filter((card) => {
      if (sourceFilter === 'favorites' && !card.isFavorite) return false;
      if (sourceFilter === 'featured' && !card.isFeatured) return false;
      if (sourceFilter === 'quran' && card.sourceType !== 'quran') return false;
      if (sourceFilter === 'hadith' && card.sourceType !== 'hadith') return false;
      if (!normalizedQuery) return true;
      return card.queryText.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.title.localeCompare(b.title, 'ar');
    });

  return {
    filter: sourceFilter,
    query,
    cards,
    summaryText: normalizedQuery
      ? `${cards.length} نتيجة`
      : `${cards.length} تصنيف`
  };
}

export function getDuasResumeViewModel() {
  return null;
}

export function getDailyDuaViewModel() {
  const item = getDailyDuaItem();
  if (!item) return null;
  return {
    title: 'نفحة اليوم',
    text: item.text,
    referenceText: getShortReference(item.referenceText),
    categoryTitle: item.categoryTitle,
    categorySlug: item.categorySlug
  };
}

export function getDuasInsightsViewModel() {
  return {
    activeDays: 0,
    favoriteCount: duasPreferencesStore.getState().favoriteSlugs.length,
    recentCount: duasHistoryStore.getState().recentSlugs.length,
    hint: ''
  };
}

export function getDuasSessionViewModel(categoryKey) {
  const category = getDuaCategoryBySlug(categoryKey);
  if (!category) return null;
  const sessionState = duasSessionStore.getState();
  const preferences = duasPreferencesStore.getState();
  return {
    slug: category.slug,
    title: category.title,
    description: category.description,
    itemCount: category.itemCount,
    estimatedMinutes: category.estimatedMinutes,
    sourceMeta: getSourceMetaFromType(category.sourceType),
    isFavorite: preferences.favoriteSlugs.includes(category.slug),
    largeText: preferences.largeText,
    activeDuaId: sessionState.activeDuaId,
    items: category.items
  };
}

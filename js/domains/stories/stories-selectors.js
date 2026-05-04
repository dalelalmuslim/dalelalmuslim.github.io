import { getAllStories, getStoriesCatalog, getStoryByKey } from './stories-repository.js';
import { normalizeStoriesSearchText } from './stories-search-index.js';

export const STORIES_PAGE_SIZE = 30;

const CATEGORY_TABS = Object.freeze([
  Object.freeze({ value: 'all', label: 'الكل', title: 'كل القصص', description: 'قصص قصيرة بعبرة واضحة.' }),
  Object.freeze({ value: 'prophets-stories', label: 'الأنبياء', title: 'قصص الأنبياء', description: 'قصص عن الصبر والهداية والثبات.' }),
  Object.freeze({ value: 'companions-stories', label: 'الصحابة', title: 'قصص الصحابة', description: 'نماذج في القدوة والبذل والثبات.' }),
  Object.freeze({ value: 'moral-stories', label: 'تربوية', title: 'قصص تربوية', description: 'مواقف أخلاقية وعبر يومية.' })
]);

function clampVisibleCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return STORIES_PAGE_SIZE;
  return Math.max(STORIES_PAGE_SIZE, Math.round(numeric));
}

function normalizeFilter(filter) {
  const safeFilter = String(filter || 'all').trim();
  return CATEGORY_TABS.some((tab) => tab.value === safeFilter) ? safeFilter : 'all';
}

function getCategoryTab(filter) {
  const safeFilter = normalizeFilter(filter);
  return CATEGORY_TABS.find((tab) => tab.value === safeFilter) || CATEGORY_TABS[0];
}

function normalizeStoryText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function makeExcerpt(text, limit = 138) {
  const safeText = normalizeStoryText(text);
  if (safeText.length <= limit) return safeText;
  return `${safeText.slice(0, limit).trim()}…`;
}

function getStoryBenefit(story) {
  return normalizeStoryText(story?.lesson) || normalizeStoryText(story?.excerpt) || makeExcerpt(story?.story, 90);
}

function getReadingTimeLabel(minutes) {
  const numeric = Number(minutes);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  const rounded = Math.max(1, Math.round(numeric));
  return `${rounded} دقائق`;
}

function getStorySearchHaystack(story) {
  return normalizeStoriesSearchText([
    story.title,
    story.excerpt,
    story.story,
    story.lesson,
    story.source,
    story.categoryTitle
  ].join(' '));
}

async function getFlatStories() {
  const catalog = await getStoriesCatalog();
  const categories = Array.isArray(catalog) ? catalog : [];

  return categories
    .slice()
    .sort((left, right) => Number(left.sortOrder || 999) - Number(right.sortOrder || 999))
    .flatMap((category) => {
      const stories = Array.isArray(category.stories) ? category.stories : [];
      return stories.map((story, index) => ({
        ...story,
        categorySlug: story.categorySlug || category.slug,
        categoryTitle: story.categoryTitle || category.title,
        categoryGroup: category.group || '',
        categoryAccentTone: category.accentTone || 'emerald',
        categorySortOrder: Number(category.sortOrder || 999),
        storyIndex: index + 1,
        storyCount: stories.length,
        benefit: getStoryBenefit(story),
        excerpt: normalizeStoryText(story.excerpt) || makeExcerpt(story.story),
        readingTimeLabel: getReadingTimeLabel(story.readingMinutes),
        searchHaystack: getStorySearchHaystack(story)
      }));
    });
}

function filterStories(stories, { filter = 'all', query = '' } = {}) {
  const safeFilter = normalizeFilter(filter);
  const normalizedQuery = normalizeStoriesSearchText(query);

  return stories.filter((story) => {
    if (safeFilter !== 'all' && story.categorySlug !== safeFilter) return false;
    if (normalizedQuery && !story.searchHaystack.includes(normalizedQuery)) return false;
    return true;
  });
}

function buildTabs(stories, activeFilter) {
  return CATEGORY_TABS.map((tab) => ({
    ...tab,
    isActive: normalizeFilter(activeFilter) === tab.value,
    count: tab.value === 'all'
      ? stories.length
      : stories.filter((story) => story.categorySlug === tab.value).length
  }));
}

export async function getStoriesStreamViewModel({ filter = 'all', query = '', visibleCount = STORIES_PAGE_SIZE } = {}) {
  const stories = await getFlatStories();
  const safeFilter = normalizeFilter(filter);
  const safeVisibleCount = clampVisibleCount(visibleCount);
  const safeQuery = String(query || '').trim();
  const filteredStories = filterStories(stories, { filter: safeFilter, query: safeQuery });
  const visibleStories = filteredStories.slice(0, safeVisibleCount);
  const activeTab = getCategoryTab(safeFilter);
  const hasSearch = safeQuery.length > 0;

  return {
    filter: safeFilter,
    query: safeQuery,
    activeTab,
    tabs: buildTabs(stories, safeFilter),
    totalCount: filteredStories.length,
    visibleCount: visibleStories.length,
    hasMore: visibleStories.length < filteredStories.length,
    allResultKeys: filteredStories.map((story) => story.storyKey),
    visibleStories,
    isEmpty: filteredStories.length === 0,
    isSearchActive: hasSearch,
    summaryText: hasSearch
      ? `نتائج البحث عن "${safeQuery}"${safeFilter === 'all' ? '' : ` داخل ${activeTab.title}`}`
      : safeFilter === 'all'
        ? `${filteredStories.length} قصة جاهزة للقراءة.`
        : `${activeTab.title} • ${filteredStories.length} قصة`,
    emptyTitle: hasSearch ? `لم نجد نتائج لـ "${safeQuery}".` : 'لا توجد قصص متاحة الآن.',
    emptyHint: hasSearch
      ? 'جرّب كلمات مثل: الصبر، التوبة، الأمانة، الثبات.'
      : 'جرّب مزامنة المحتوى من الإعدادات ثم أعد فتح القسم.'
  };
}

export async function getStoriesReaderViewModel(storyKey, contextStoryKeys = []) {
  const activeStory = await getStoryByKey(storyKey);
  if (!activeStory) return null;

  const flatStories = await getFlatStories();
  const byKey = new Map(flatStories.map((story) => [story.storyKey, story]));
  const normalizedContextKeys = Array.isArray(contextStoryKeys)
    ? contextStoryKeys.filter((key) => byKey.has(key))
    : [];
  const fallbackContextKeys = flatStories.map((story) => story.storyKey);
  const contextKeys = normalizedContextKeys.length ? normalizedContextKeys : fallbackContextKeys;
  const activeIndex = Math.max(0, contextKeys.indexOf(activeStory.storyKey));
  const normalizedActiveStory = byKey.get(activeStory.storyKey) || activeStory;
  const nextStoryKey = activeIndex >= 0 ? contextKeys[activeIndex + 1] : '';
  const nextStory = nextStoryKey ? byKey.get(nextStoryKey) : null;

  return {
    activeStory: normalizedActiveStory,
    nextStory,
    currentIndex: activeIndex + 1,
    totalCount: contextKeys.length,
    counterText: contextKeys.length ? `${activeIndex + 1} / ${contextKeys.length}` : '',
    hasNext: Boolean(nextStory)
  };
}

export function getStoriesCategoryTabs() {
  return CATEGORY_TABS.slice();
}

import { getAllStories } from './stories-repository.js';

let cachedIndex = null;

export function normalizeStoriesSearchText(value) {
  return String(value || '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resetStoriesSearchIndex() {
  cachedIndex = null;
}

export async function getStoriesSearchIndex() {
  if (cachedIndex) return cachedIndex;

  const stories = await getAllStories();
  cachedIndex = stories.map((story) => ({
    storyKey: story.storyKey,
    categorySlug: story.categorySlug,
    haystack: normalizeStoriesSearchText([
      story.title,
      story.excerpt,
      story.story,
      story.lesson,
      story.source,
      story.categoryTitle
    ].join(' '))
  }));

  return cachedIndex;
}

export async function searchStories(query, { categorySlug = '' } = {}) {
  const normalizedQuery = normalizeStoriesSearchText(query);
  if (!normalizedQuery) return [];

  const index = await getStoriesSearchIndex();
  return index
    .filter((entry) => {
      if (categorySlug && entry.categorySlug !== categorySlug) return false;
      return entry.haystack.includes(normalizedQuery);
    })
    .map((entry) => entry.storyKey);
}

import { getAllStories } from './stories-repository.js';

let cachedIndex = null;

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function getStoriesSearchIndex() {
  if (cachedIndex) return cachedIndex;
  cachedIndex = getAllStories().map((story) => ({
    storyKey: story.storyKey,
    categorySlug: story.categorySlug,
    haystack: normalize([
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

export function searchStories(query) {
  const safeQuery = normalize(query);
  if (!safeQuery) return [];
  return getStoriesSearchIndex()
    .filter((entry) => entry.haystack.includes(safeQuery))
    .map((entry) => entry.storyKey);
}

import { getAllStories } from './stories-repository.js';

let cachedIndex = null;

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export async function getStoriesSearchIndex() {
  if (cachedIndex) return cachedIndex;
  const stories = await getAllStories();
  cachedIndex = stories.map((story) => ({
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

export async function searchStories(query) {
  const safeQuery = normalize(query);
  if (!safeQuery) return [];
  const index = await getStoriesSearchIndex();
  return index
    .filter((entry) => entry.haystack.includes(safeQuery))
    .map((entry) => entry.storyKey);
}

import {
  makeStoryKey as makeStoryKeyFromClient,
  parseStoryKey as parseStoryKeyFromClient,
  getStoriesCatalog as getStoriesCatalogFromClient,
  getStoryCategoryBySlug as getStoryCategoryBySlugFromClient,
  getStoryCategoryByKey as getStoryCategoryByKeyFromClient,
  getStoryByKey as getStoryByKeyFromClient,
  getStoryByCategoryAndId as getStoryByCategoryAndIdFromClient,
  getAllStories as getAllStoriesFromClient
} from '../../services/content/content-client.js';

export function makeStoryKey(categorySlug, storyId) {
  return makeStoryKeyFromClient(categorySlug, storyId);
}

export function parseStoryKey(storyKey) {
  return parseStoryKeyFromClient(storyKey);
}

export async function getStoriesCatalog() {
  return getStoriesCatalogFromClient();
}

export async function getStoryCategoryBySlug(slug) {
  return getStoryCategoryBySlugFromClient(slug);
}

export async function getStoryCategoryByKey(key) {
  return getStoryCategoryByKeyFromClient(key);
}

export async function getStoryByKey(storyKey) {
  return getStoryByKeyFromClient(storyKey);
}

export async function getStoryByCategoryAndId(categoryKey, storyId) {
  return getStoryByCategoryAndIdFromClient(categoryKey, storyId);
}

export async function getAllStories() {
  return getAllStoriesFromClient();
}

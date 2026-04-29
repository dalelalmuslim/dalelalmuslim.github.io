import {
  getDuasCatalog as getDuasCatalogFromClient,
  getDuaCategoryByKey as getDuaCategoryByKeyFromClient,
  getDuaCategoryBySlug as getDuaCategoryBySlugFromClient,
  getAllDuaItems as getAllDuaItemsFromClient
} from '../../services/content/content-client.js';

export async function getDuasCatalog() {
  return getDuasCatalogFromClient();
}

export async function getDuaCategoryByKey(key) {
  return getDuaCategoryByKeyFromClient(key);
}

export async function getDuaCategoryBySlug(slug) {
  return getDuaCategoryBySlugFromClient(slug);
}

export async function getAllDuaItems() {
  return getAllDuaItemsFromClient();
}

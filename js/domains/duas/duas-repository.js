import {
  getDuasCatalog as getDuasCatalogFromClient,
  getDuaCategoryByKey as getDuaCategoryByKeyFromClient,
  getDuaCategoryBySlug as getDuaCategoryBySlugFromClient,
  getAllDuaItems as getAllDuaItemsFromClient
} from '../../services/content/content-client.js';

export function getDuasCatalog() {
  return getDuasCatalogFromClient();
}

export function getDuaCategoryByKey(key) {
  return getDuaCategoryByKeyFromClient(key);
}

export function getDuaCategoryBySlug(slug) {
  return getDuaCategoryBySlugFromClient(slug);
}

export function getAllDuaItems() {
  return getAllDuaItemsFromClient();
}

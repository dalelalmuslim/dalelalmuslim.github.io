import {
    listAzkarManifestEntries as listAzkarManifestEntriesFromClient,
    getAzkarCategoryMetadataByKey as getAzkarCategoryMetadataByKeyFromClient,
    getAzkarCatalog as getAzkarCatalogFromClient,
    warmAzkarCatalog as warmAzkarCatalogFromClient,
    getAzkarCategoryByKey as getAzkarCategoryByKeyFromClient,
    getAzkarCategoryBySlug as getAzkarCategoryBySlugFromClient
} from '../../services/content/content-client.js';

export function listAzkarManifestEntries() {
    return listAzkarManifestEntriesFromClient();
}

export function getAzkarCategoryMetadataByKey(key) {
    return getAzkarCategoryMetadataByKeyFromClient(key);
}

export async function getAzkarCatalog() {
    return getAzkarCatalogFromClient();
}

export async function warmAzkarCatalog() {
    return warmAzkarCatalogFromClient();
}

export async function getAzkarCategoryByKey(categoryKey) {
    return getAzkarCategoryByKeyFromClient(categoryKey);
}

export async function getAzkarCategoryBySlug(slug) {
    return getAzkarCategoryBySlugFromClient(slug);
}

const catalogContentCache = {
    duas: null,
    names: null,
    stories: null
};

async function importModule(path) {
    const module = await import(path);
    return module || {};
}

export async function ensureDuasDataLoaded() {
    if (catalogContentCache.duas) return catalogContentCache.duas;
    const module = await importModule('../../../data/duas/duas-data.js');
    catalogContentCache.duas = module.DUAS_JSON ?? null;
    return catalogContentCache.duas;
}

export async function ensureNamesDataLoaded() {
    if (catalogContentCache.names) return catalogContentCache.names;
    const module = await importModule('../../../data/names/names-data.js');
    catalogContentCache.names = module.ALLAH_NAMES ?? null;
    return catalogContentCache.names;
}

export async function ensureStoriesDataLoaded() {
    if (catalogContentCache.stories) return catalogContentCache.stories;
    const module = await importModule('../../../data/stories/stories-data.js');
    catalogContentCache.stories = module.STORIES_JSON ?? null;
    return catalogContentCache.stories;
}

export async function warmCatalogContentLoader() {
    const results = await Promise.allSettled([
        ensureDuasDataLoaded(),
        ensureNamesDataLoaded(),
        ensureStoriesDataLoaded()
    ]);

    return {
        successCount: results.filter(result => result.status === 'fulfilled').length,
        results
    };
}

export function getDuasData() {
    return catalogContentCache.duas;
}

export function getNamesData() {
    return catalogContentCache.names;
}

export function getStoriesData() {
    return catalogContentCache.stories;
}

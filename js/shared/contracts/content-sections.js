export const CONTENT_SECTION_IDS = Object.freeze({
    APP_CONFIG: 'app_config',
    AZKAR: 'azkar',
    DUAS: 'duas',
    STORIES: 'stories',
    DAILY_CONTENT: 'daily_content'
});

export const CONTENT_CACHE_MODES = Object.freeze({
    PAYLOAD: 'payload',
    VERSION_ONLY: 'version-only'
});

export const CONTENT_SECTIONS = Object.freeze([
    Object.freeze({
        id: CONTENT_SECTION_IDS.APP_CONFIG,
        versionKey: 'app_config_version',
        cacheKey: 'app_config',
        endpoint: 'content/config',
        cacheMode: CONTENT_CACHE_MODES.PAYLOAD
    }),
    Object.freeze({
        id: CONTENT_SECTION_IDS.AZKAR,
        versionKey: 'azkar_version',
        cacheKey: 'azkar',
        endpoint: 'content/azkar',
        cacheMode: CONTENT_CACHE_MODES.PAYLOAD
    }),
    Object.freeze({
        id: CONTENT_SECTION_IDS.DUAS,
        versionKey: 'duas_version',
        cacheKey: 'duas',
        endpoint: 'content/duas',
        cacheMode: CONTENT_CACHE_MODES.VERSION_ONLY
    }),
    Object.freeze({
        id: CONTENT_SECTION_IDS.STORIES,
        versionKey: 'stories_version',
        cacheKey: 'stories',
        endpoint: 'content/stories',
        cacheMode: CONTENT_CACHE_MODES.VERSION_ONLY
    }),
    Object.freeze({
        id: CONTENT_SECTION_IDS.DAILY_CONTENT,
        versionKey: 'daily_content_version',
        cacheKey: 'daily_content',
        endpoint: 'content/daily',
        cacheMode: CONTENT_CACHE_MODES.PAYLOAD
    })
]);

const CONTENT_SECTION_MAP = Object.freeze(
    Object.fromEntries(CONTENT_SECTIONS.map((section) => [section.id, section]))
);

export function getContentSectionDefinition(sectionId) {
    return CONTENT_SECTION_MAP[String(sectionId || '')] || null;
}

export function listContentSections() {
    return CONTENT_SECTIONS.slice();
}

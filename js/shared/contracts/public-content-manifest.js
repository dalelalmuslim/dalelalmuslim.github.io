export const PUBLIC_CONTENT_DEFAULT_VERSIONS = Object.freeze({
    app_config: 'local-static-app-config-v1',
    azkar: 'local-static-azkar-v1',
    duas: 'local-static-duas-v1',
    stories: 'local-static-stories-v1',
    daily_content: 'local-static-daily-content-v1'
});

export const PUBLIC_CONTENT_SECTIONS = Object.freeze([
    Object.freeze({
        id: 'app_config',
        slug: 'app-config',
        endpoint: '/api/public/content/app-config',
        versionKey: 'app_config_version'
    }),
    Object.freeze({
        id: 'azkar',
        slug: 'azkar',
        endpoint: '/api/public/content/azkar',
        versionKey: 'azkar_version'
    }),
    Object.freeze({
        id: 'duas',
        slug: 'duas',
        endpoint: '/api/public/content/duas',
        versionKey: 'duas_version'
    }),
    Object.freeze({
        id: 'stories',
        slug: 'stories',
        endpoint: '/api/public/content/stories',
        versionKey: 'stories_version'
    }),
    Object.freeze({
        id: 'daily_content',
        slug: 'daily-content',
        endpoint: '/api/public/content/daily-content',
        versionKey: 'daily_content_version'
    })
]);

const PUBLIC_CONTENT_SECTION_BY_ID = Object.freeze(
    Object.fromEntries(PUBLIC_CONTENT_SECTIONS.map((section) => [section.id, section]))
);

const PUBLIC_CONTENT_SECTION_BY_SLUG = Object.freeze(
    Object.fromEntries(PUBLIC_CONTENT_SECTIONS.map((section) => [section.slug, section]))
);

export function listPublicContentSections() {
    return PUBLIC_CONTENT_SECTIONS.slice();
}

export function getPublicContentSectionById(sectionId) {
    return PUBLIC_CONTENT_SECTION_BY_ID[String(sectionId || '')] || null;
}

export function getPublicContentSectionBySlug(slug) {
    return PUBLIC_CONTENT_SECTION_BY_SLUG[String(slug || '')] || null;
}

export function getPublicContentVersionSnapshot() {
    return PUBLIC_CONTENT_SECTIONS.reduce((snapshot, section) => {
        snapshot[section.versionKey] = PUBLIC_CONTENT_DEFAULT_VERSIONS[section.id] || '';
        return snapshot;
    }, {});
}

import {
    getPublicContentSectionById,
    listPublicContentSections
} from '../../js/shared/contracts/public-content-manifest.js';
import {
    getPublishedSectionFromD1,
    getPublishedVersionsFromD1,
    getPublicContentD1Binding,
    listPublishedSectionsForVersions
} from './public-content-d1.js';
import {
    getLocalPublicSection,
    getLocalPublicVersionSnapshot
} from './public-content-local.js';
import {
    failure,
    isReadMethod,
    methodNotAllowed,
    notFound,
    options,
    success
} from './http.js';

const PUBLIC_CONTENT_CACHE_HEADER = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const PUBLIC_VERSIONS_CACHE_HEADER = 'public, max-age=30, s-maxage=120, stale-while-revalidate=300';

async function resolvePublicVersions(context) {
    const db = getPublicContentD1Binding(context?.env);
    if (!db) {
        return {
            source: 'local',
            versions: getLocalPublicVersionSnapshot(),
            rows: []
        };
    }

    try {
        return await getPublishedVersionsFromD1(db);
    } catch (error) {
        return {
            source: 'local-fallback',
            versions: getLocalPublicVersionSnapshot(),
            rows: [],
            error
        };
    }
}

async function resolvePublicSection(sectionId, context) {
    const db = getPublicContentD1Binding(context?.env);
    if (db) {
        try {
            const publishedSection = await getPublishedSectionFromD1(db, sectionId);
            if (publishedSection?.payload !== null && publishedSection?.payload !== undefined) {
                return publishedSection;
            }
        } catch (error) {
            return {
                ...(await getLocalPublicSection(sectionId, context.request)),
                source: 'local-fallback',
                resolutionError: error instanceof Error ? error.message : 'Unknown D1 resolution error'
            };
        }
    }

    return getLocalPublicSection(sectionId, context.request);
}

export async function getPublicSectionResponse(sectionId, context) {
    const { request } = context;
    const section = getPublicContentSectionById(sectionId);
    if (!section) {
        return notFound(request, 'The requested public content section was not found.');
    }

    try {
        const resolved = await resolvePublicSection(section.id, context);
        if (!resolved?.payload) {
            return notFound(request, 'The requested public content section is unavailable.');
        }

        return success(request, resolved.payload, {
            headers: {
                'cache-control': PUBLIC_CONTENT_CACHE_HEADER,
                'x-public-content-section': section.id,
                'x-public-content-version': resolved.version || '',
                'x-public-content-store': resolved.source || 'local'
            },
            includeBody: request.method !== 'HEAD',
            meta: {
                sectionId: section.id,
                version: resolved.version || '',
                endpoint: section.endpoint,
                source: resolved.source || 'local',
                publishedAt: resolved.publishedAt || null,
                schemaVersion: resolved.schemaVersion || null,
                payloadHash: resolved.payloadHash || ''
            }
        });
    } catch (error) {
        return failure(request, {
            code: 'PUBLIC_CONTENT_RESOLUTION_FAILED',
            message: 'Failed to resolve the requested public content section.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500,
            headers: {
                'cache-control': 'no-store',
                'x-public-content-section': section.id
            },
            includeBody: request.method !== 'HEAD',
            meta: {
                sectionId: section.id,
                endpoint: section.endpoint
            }
        });
    }
}

export async function handlePublicSectionRequest(sectionId, context) {
    const { request } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    if (!isReadMethod(request.method)) {
        return methodNotAllowed(request);
    }

    return getPublicSectionResponse(sectionId, context);
}

export async function handlePublicVersionsRequest(context) {
    const { request } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    if (!isReadMethod(request.method)) {
        return methodNotAllowed(request);
    }

    const resolved = await resolvePublicVersions(context);
    const sections = resolved.source === 'd1'
        ? listPublishedSectionsForVersions(resolved.rows)
        : listPublicContentSections();

    return success(request, {
        versions: resolved.versions,
        sections
    }, {
        headers: {
            'cache-control': PUBLIC_VERSIONS_CACHE_HEADER,
            'x-public-content-store': resolved.source
        },
        includeBody: request.method !== 'HEAD',
        meta: {
            endpoint: '/api/public/versions',
            sectionsCount: sections.length,
            source: resolved.source
        }
    });
}

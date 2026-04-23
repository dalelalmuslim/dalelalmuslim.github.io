import {
    getPublicContentSectionById,
    getPublicContentVersionSnapshot,
    listPublicContentSections
} from '../../js/shared/contracts/public-content-manifest.js';

const SELECT_PUBLISHED_ROWS_SQL = `
    SELECT section_id, version, published_at
    FROM public_content_publications
    ORDER BY section_id ASC
`;

const SELECT_PUBLISHED_SECTION_SQL = `
    SELECT
        publication.section_id,
        publication.version,
        publication.published_at,
        document.payload_json,
        document.payload_hash,
        document.schema_version,
        document.source_kind
    FROM public_content_publications AS publication
    INNER JOIN public_content_documents AS document
        ON document.section_id = publication.section_id
       AND document.version = publication.version
    WHERE publication.section_id = ?
    LIMIT 1
`;

function normalizeJsonPayload(rawPayload) {
    if (rawPayload === null || rawPayload === undefined) {
        return null;
    }

    if (typeof rawPayload === 'string') {
        return JSON.parse(rawPayload);
    }

    return rawPayload;
}

function resolveVersionKey(sectionId) {
    return getPublicContentSectionById(sectionId)?.versionKey || `${sectionId}_version`;
}

export function getPublicContentD1Binding(env = {}) {
    const candidates = [
        env.PUBLIC_CONTENT_DB,
        env.DALIL_CONTENT_DB,
        env.DB
    ];

    return candidates.find((binding) => binding && typeof binding.prepare === 'function') || null;
}

export function hasPublicContentD1Binding(env = {}) {
    return Boolean(getPublicContentD1Binding(env));
}

export async function getPublishedVersionsFromD1(db) {
    const result = await db.prepare(SELECT_PUBLISHED_ROWS_SQL).all();
    const rows = Array.isArray(result?.results) ? result.results : [];
    const defaults = getPublicContentVersionSnapshot();

    const versions = rows.reduce((snapshot, row) => {
        const versionKey = resolveVersionKey(row?.section_id);
        if (versionKey && typeof row?.version === 'string' && row.version) {
            snapshot[versionKey] = row.version;
        }
        return snapshot;
    }, { ...defaults });

    return {
        source: 'd1',
        versions,
        rows
    };
}

export async function getPublishedSectionFromD1(db, sectionId) {
    const section = getPublicContentSectionById(sectionId);
    if (!section) {
        return null;
    }

    const row = await db.prepare(SELECT_PUBLISHED_SECTION_SQL).bind(section.id).first();
    if (!row) {
        return null;
    }

    return {
        source: 'd1',
        sectionId: section.id,
        version: typeof row.version === 'string' ? row.version : '',
        publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
        payloadHash: typeof row.payload_hash === 'string' ? row.payload_hash : '',
        schemaVersion: typeof row.schema_version === 'string' ? row.schema_version : '',
        sourceKind: typeof row.source_kind === 'string' ? row.source_kind : 'd1',
        payload: normalizeJsonPayload(row.payload_json)
    };
}

export function listPublishedSectionsForVersions(rows = []) {
    const rowBySectionId = new Map(rows.map((row) => [row?.section_id, row]));

    return listPublicContentSections().map((section) => ({
        ...section,
        publishedVersion: rowBySectionId.get(section.id)?.version || '',
        publishedAt: rowBySectionId.get(section.id)?.published_at || null
    }));
}

export const PUBLIC_CONTENT_D1_QUERIES = Object.freeze({
    SELECT_PUBLISHED_ROWS_SQL,
    SELECT_PUBLISHED_SECTION_SQL
});

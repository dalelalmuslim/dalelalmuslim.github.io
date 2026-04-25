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

const INSERT_CONTENT_DOCUMENT_SQL = `
    INSERT INTO public_content_documents (
        section_id,
        version,
        payload_json,
        payload_hash,
        schema_version,
        source_kind,
        created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
`;

const UPSERT_CONTENT_PUBLICATION_SQL = `
    INSERT INTO public_content_publications (
        section_id,
        version,
        published_at,
        published_by,
        notes
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(section_id) DO UPDATE SET
        version = excluded.version,
        published_at = excluded.published_at,
        published_by = excluded.published_by,
        notes = excluded.notes
`;

const INSERT_ADMIN_AUDIT_LOG_SQL = `
    INSERT INTO admin_audit_log (
        id,
        action,
        section_id,
        version,
        actor_email,
        actor_provider,
        metadata_json,
        created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

function createStableJson(value) {
    return JSON.stringify(value);
}

async function hashPayloadJson(payloadJson) {
    const bytes = new TextEncoder().encode(payloadJson);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

function createAuditId(sectionId, version) {
    const randomPart = typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `audit_${sectionId}_${version}_${randomPart}`.replace(/[^a-zA-Z0-9_.:-]/g, '_');
}

export async function writeAndPublishPublicContentDocument(db, input) {
    const section = getPublicContentSectionById(input?.sectionId);
    if (!section) {
        throw new Error('Unknown public content section.');
    }

    const version = String(input?.version || '').trim();
    if (!version) {
        throw new Error('Content version is required.');
    }

    const actorEmail = String(input?.actor?.email || '').trim().toLowerCase();
    if (!actorEmail) {
        throw new Error('Admin actor email is required.');
    }

    const now = new Date().toISOString();
    const payloadJson = typeof input.payloadJson === 'string'
        ? input.payloadJson
        : createStableJson(input.payload);

    JSON.parse(payloadJson);

    const payloadHash = String(input.payloadHash || await hashPayloadJson(payloadJson));
    const schemaVersion = String(input.schemaVersion || 'public-content-v1');
    const sourceKind = String(input.sourceKind || 'admin-publish');
    const notes = String(input.notes || '');
    const metadataJson = createStableJson({
        notes,
        payloadHash,
        schemaVersion,
        sourceKind,
        ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {})
    });

    await db.batch([
        db.prepare(INSERT_CONTENT_DOCUMENT_SQL).bind(
            section.id,
            version,
            payloadJson,
            payloadHash,
            schemaVersion,
            sourceKind,
            now
        ),
        db.prepare(UPSERT_CONTENT_PUBLICATION_SQL).bind(
            section.id,
            version,
            now,
            actorEmail,
            notes
        ),
        db.prepare(INSERT_ADMIN_AUDIT_LOG_SQL).bind(
            createAuditId(section.id, version),
            'public_content.publish',
            section.id,
            version,
            actorEmail,
            String(input?.actor?.provider || 'cloudflare-access'),
            metadataJson,
            now
        )
    ]);

    return {
        sectionId: section.id,
        version,
        payloadHash,
        schemaVersion,
        sourceKind,
        publishedAt: now,
        publishedBy: actorEmail
    };
}

export const PUBLIC_CONTENT_D1_WRITE_QUERIES = Object.freeze({
    INSERT_CONTENT_DOCUMENT_SQL,
    UPSERT_CONTENT_PUBLICATION_SQL,
    INSERT_ADMIN_AUDIT_LOG_SQL
});

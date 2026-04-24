import {
    failure,
    methodNotAllowed,
    options,
    success
} from '../../_shared/http.js';
import { getPublicContentD1Binding } from '../../_shared/public-content-d1.js';
import * as seedDataModule from '../../_shared/public-content-seed-data.js';

const CONFIRM_VALUE = 'seed-public-content';

const UPSERT_DOCUMENT_SQL = `
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
    ON CONFLICT(section_id, version) DO UPDATE SET
        payload_json = excluded.payload_json,
        payload_hash = excluded.payload_hash,
        schema_version = excluded.schema_version,
        source_kind = excluded.source_kind,
        created_at = public_content_documents.created_at
`;

const UPSERT_PUBLICATION_SQL = `
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

function resolveSeedSnapshot() {
    const snapshot =
        seedDataModule.PUBLIC_CONTENT_SEED_DATA ||
        seedDataModule.PUBLIC_CONTENT_SEED ||
        seedDataModule.publicContentSeedData ||
        seedDataModule.default;

    if (!snapshot || !Array.isArray(snapshot.documents)) {
        throw new Error('Invalid public content seed data module.');
    }

    return snapshot;
}

function toPayloadJson(document) {
    const rawPayload = Object.prototype.hasOwnProperty.call(document, 'payload')
        ? document.payload
        : document.payloadJson;

    if (rawPayload === null || rawPayload === undefined) {
        throw new Error(`Missing payload for section: ${document.sectionId || 'unknown'}`);
    }

    const payloadJson = typeof rawPayload === 'string'
        ? rawPayload
        : JSON.stringify(rawPayload);

    JSON.parse(payloadJson);
    return payloadJson;
}

function normalizeSeedDocument(document, generatedAt) {
    const sectionId = String(document.sectionId || '').trim();
    const version = String(document.version || '').trim();
    const payloadHash = String(document.payloadHash || '').trim();

    if (!sectionId) {
        throw new Error('Seed document is missing sectionId.');
    }

    if (!version) {
        throw new Error(`Seed document is missing version for section: ${sectionId}`);
    }

    if (!payloadHash) {
        throw new Error(`Seed document is missing payloadHash for section: ${sectionId}`);
    }

    return {
        sectionId,
        version,
        payloadJson: toPayloadJson(document),
        payloadHash,
        schemaVersion: String(document.schemaVersion || 'public-content-v1'),
        sourceKind: String(document.sourceKind || 'seed-import'),
        publishedAt: String(document.publishedAt || generatedAt),
        createdAt: String(generatedAt)
    };
}

async function countRows(db, tableName) {
    const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).first();
    return Number(row?.count || 0);
}

async function listPublications(db) {
    const result = await db.prepare(`
        SELECT section_id, version, published_at
        FROM public_content_publications
        ORDER BY section_id ASC
    `).all();

    return Array.isArray(result?.results) ? result.results : [];
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
        return methodNotAllowed(request, ['GET', 'POST', 'OPTIONS']);
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.get('confirm') !== CONFIRM_VALUE) {
        return failure(request, {
            code: 'D1_SEED_CONFIRMATION_REQUIRED',
            message: 'Seed confirmation query parameter is required.'
        }, {
            status: 403,
            headers: { 'cache-control': 'no-store' }
        });
    }

    const db = getPublicContentD1Binding(env);
    if (!db) {
        return failure(request, {
            code: 'D1_BINDING_MISSING',
            message: 'PUBLIC_CONTENT_DB binding is not available.'
        }, {
            status: 500,
            headers: { 'cache-control': 'no-store' }
        });
    }

    try {
        const snapshot = resolveSeedSnapshot();
        const generatedAt = String(snapshot.generatedAt || new Date().toISOString());
        const documents = snapshot.documents.map((document) =>
            normalizeSeedDocument(document, generatedAt)
        );

        const documentStatements = documents.map((document) =>
            db.prepare(UPSERT_DOCUMENT_SQL).bind(
                document.sectionId,
                document.version,
                document.payloadJson,
                document.payloadHash,
                document.schemaVersion,
                document.sourceKind,
                document.createdAt
            )
        );

        const publicationStatements = documents.map((document) =>
            db.prepare(UPSERT_PUBLICATION_SQL).bind(
                document.sectionId,
                document.version,
                document.publishedAt,
                'seed-import',
                'Initial public content seed from local baseline.'
            )
        );

        await db.batch([
            ...documentStatements,
            ...publicationStatements
        ]);

        const [documentsCount, publicationsCount, sections] = await Promise.all([
            countRows(db, 'public_content_documents'),
            countRows(db, 'public_content_publications'),
            listPublications(db)
        ]);

        return success(request, {
            seeded: documents.length,
            total: {
                documents: documentsCount,
                publications: publicationsCount
            },
            sections
        }, {
            headers: { 'cache-control': 'no-store' },
            meta: {
                endpoint: '/api/internal/seed-public-content',
                source: 'd1'
            }
        });
    } catch (error) {
        return failure(request, {
            code: 'D1_SEED_FAILED',
            message: 'Failed to seed public content into D1.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500,
            headers: { 'cache-control': 'no-store' }
        });
    }
}

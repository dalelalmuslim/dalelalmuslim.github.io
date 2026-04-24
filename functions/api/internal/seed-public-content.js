import { getPublicContentD1Binding } from '../../_shared/public-content-d1.js';
import {
    failure,
    methodNotAllowed,
    options,
    success
} from '../../_shared/http.js';
import { PUBLIC_CONTENT_SEED } from '../../_shared/public-content-seed-data.js';

const CONFIRMATION_VALUE = 'seed-public-content';

const UPSERT_DOCUMENT_SQL = `
    INSERT OR REPLACE INTO public_content_documents
        (section_id, version, payload_json, payload_hash, schema_version, source_kind, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`;

const UPSERT_PUBLICATION_SQL = `
    INSERT OR REPLACE INTO public_content_publications
        (section_id, version, published_at, published_by, notes)
    VALUES (?, ?, ?, ?, ?)
`;

function getSeedDocuments() {
    return Array.isArray(PUBLIC_CONTENT_SEED?.documents)
        ? PUBLIC_CONTENT_SEED.documents
        : [];
}

async function upsertPublicContentSeed(db) {
    const documents = getSeedDocuments();
    const seededAt = PUBLIC_CONTENT_SEED?.generatedAt || new Date().toISOString();
    const results = [];

    for (const document of documents) {
        const sectionId = String(document?.sectionId || '').trim();
        const version = String(document?.version || '').trim();

        if (!sectionId || !version || document?.payload === undefined) {
            results.push({ sectionId, version, ok: false, reason: 'invalid_seed_document' });
            continue;
        }

        await db.prepare(UPSERT_DOCUMENT_SQL)
            .bind(
                sectionId,
                version,
                JSON.stringify(document.payload),
                String(document.payloadHash || ''),
                String(document.schemaVersion || PUBLIC_CONTENT_SEED?.schemaVersion || 'public-content-v1'),
                String(document.sourceKind || 'seed-import'),
                String(document.createdAt || document.publishedAt || seededAt)
            )
            .run();

        await db.prepare(UPSERT_PUBLICATION_SQL)
            .bind(
                sectionId,
                version,
                String(document.publishedAt || seededAt),
                'temporary-pages-seed',
                'Temporary D1 seed import from Pages Function. Remove endpoint after import.'
            )
            .run();

        results.push({ sectionId, version, ok: true });
    }

    return results;
}

export async function onRequest(context) {
    const { request } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
        return methodNotAllowed(request, ['GET', 'POST', 'OPTIONS']);
    }

    const url = new URL(request.url);
    if (url.searchParams.get('confirm') !== CONFIRMATION_VALUE) {
        return failure(request, {
            code: 'SEED_CONFIRMATION_REQUIRED',
            message: 'Pass ?confirm=seed-public-content to run the fixed temporary seed import.'
        }, {
            status: 403,
            headers: { 'cache-control': 'no-store' }
        });
    }

    const db = getPublicContentD1Binding(context.env);
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
        const results = await upsertPublicContentSeed(db);
        const okCount = results.filter((result) => result.ok).length;

        return success(request, {
            seeded: okCount,
            total: results.length,
            sections: results
        }, {
            headers: { 'cache-control': 'no-store' },
            meta: {
                endpoint: '/api/internal/seed-public-content',
                temporary: true
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

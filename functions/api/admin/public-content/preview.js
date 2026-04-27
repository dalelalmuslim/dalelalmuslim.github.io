import { authenticateAdminRequest } from '../../../_shared/admin-auth.js';
import {
    hashPublicContentPayloadJson,
    isJsonContentType,
    readJsonRequestBody,
    validateAdminPublicContentRequestBody
} from '../../../_shared/admin-public-content-request.js';
import { failure, success } from '../../../_shared/http.js';
import { getPublicContentD1Binding } from '../../../_shared/public-content-d1.js';

const ENDPOINT = '/api/admin/public-content/preview';

const SELECT_EXISTING_DOCUMENT_SQL = `
    SELECT
        section_id,
        version,
        payload_hash,
        schema_version,
        source_kind,
        created_at
    FROM public_content_documents
    WHERE section_id = ?
      AND version = ?
    LIMIT 1
`;

const SELECT_CURRENT_PUBLICATION_SQL = `
    SELECT
        section_id,
        version,
        published_at,
        published_by,
        notes
    FROM public_content_publications
    WHERE section_id = ?
    LIMIT 1
`;

const ADMIN_RESPONSE_HEADERS = Object.freeze({
    'cache-control': 'no-store',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, cf-access-jwt-assertion, authorization',
    'access-control-max-age': '600'
});

function createAdminOptionsResponse() {
    return new Response(null, {
        status: 204,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'content-type, cf-access-jwt-assertion, authorization',
            'access-control-max-age': '600',
            'x-content-type-options': 'nosniff',
            'cache-control': 'no-store'
        }
    });
}

function methodNotAllowed(request) {
    return failure(request, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only supported HTTP methods are allowed for this endpoint.',
        allowed: ['POST', 'OPTIONS']
    }, {
        status: 405,
        headers: {
            ...ADMIN_RESPONSE_HEADERS,
            allow: 'POST, OPTIONS'
        },
        meta: { endpoint: ENDPOINT }
    });
}

function fail(request, status, code, message, details = null) {
    return failure(request, {
        code,
        message,
        ...(details ? { details } : {})
    }, {
        status,
        headers: ADMIN_RESPONSE_HEADERS,
        meta: { endpoint: ENDPOINT }
    });
}

function normalizeExistingDocument(row) {
    if (!row) {
        return null;
    }

    return {
        sectionId: String(row.section_id || ''),
        version: String(row.version || ''),
        payloadHash: String(row.payload_hash || ''),
        schemaVersion: String(row.schema_version || ''),
        sourceKind: String(row.source_kind || ''),
        createdAt: typeof row.created_at === 'string' ? row.created_at : null
    };
}

function normalizeCurrentPublication(row) {
    if (!row) {
        return null;
    }

    return {
        sectionId: String(row.section_id || ''),
        version: String(row.version || ''),
        publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
        publishedBy: typeof row.published_by === 'string' ? row.published_by : '',
        notes: typeof row.notes === 'string' ? row.notes : ''
    };
}

async function getExistingDocument(db, sectionId, version) {
    const row = await db
        .prepare(SELECT_EXISTING_DOCUMENT_SQL)
        .bind(sectionId, version)
        .first();

    return normalizeExistingDocument(row);
}

async function getCurrentPublication(db, sectionId) {
    const row = await db
        .prepare(SELECT_CURRENT_PUBLICATION_SQL)
        .bind(sectionId)
        .first();

    return normalizeCurrentPublication(row);
}

function buildPreviewResult(validationResult, payloadHash, existingDocument, currentPublication) {
    const blockingReasons = [];

    if (existingDocument) {
        blockingReasons.push('PUBLIC_CONTENT_VERSION_ALREADY_EXISTS');
    }

    return {
        dryRun: true,
        valid: true,
        wouldPublish: blockingReasons.length === 0,
        blockingReasons,
        sectionId: validationResult.input.sectionId,
        version: validationResult.input.version,
        schemaVersion: validationResult.input.schemaVersion,
        payloadHash,
        payloadBytes: validationResult.payloadBytes,
        notes: validationResult.input.notes,
        currentPublication,
        existingDocument,
        checkedAt: new Date().toISOString()
    };
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return createAdminOptionsResponse();
    }

    if (request.method !== 'POST') {
        return methodNotAllowed(request);
    }

    const authResult = await authenticateAdminRequest(request, env);
    if (!authResult.ok) {
        return failure(request, authResult.error, {
            status: authResult.status,
            headers: ADMIN_RESPONSE_HEADERS,
            meta: { endpoint: ENDPOINT }
        });
    }

    const db = getPublicContentD1Binding(env);
    if (!db) {
        return fail(
            request,
            503,
            'PUBLIC_CONTENT_DB_UNAVAILABLE',
            'Public content database binding is unavailable.'
        );
    }

    if (!isJsonContentType(request.headers.get('content-type'))) {
        return fail(
            request,
            415,
            'UNSUPPORTED_MEDIA_TYPE',
            'Content-Type must be application/json.'
        );
    }

    const bodyResult = await readJsonRequestBody(request);
    if (!bodyResult.ok) {
        return fail(
            request,
            bodyResult.status,
            bodyResult.code,
            bodyResult.message
        );
    }

    const validationResult = validateAdminPublicContentRequestBody(bodyResult.body);
    if (!validationResult.ok) {
        return fail(
            request,
            400,
            'INVALID_PUBLIC_CONTENT_PREVIEW_REQUEST',
            validationResult.error
        );
    }

    try {
        const [payloadHash, existingDocument, currentPublication] = await Promise.all([
            hashPublicContentPayloadJson(validationResult.input.payloadJson),
            getExistingDocument(
                db,
                validationResult.input.sectionId,
                validationResult.input.version
            ),
            getCurrentPublication(db, validationResult.input.sectionId)
        ]);

        const preview = buildPreviewResult(
            validationResult,
            payloadHash,
            existingDocument,
            currentPublication
        );

        return success(request, preview, {
            status: 200,
            headers: ADMIN_RESPONSE_HEADERS,
            meta: {
                endpoint: ENDPOINT,
                sectionId: preview.sectionId,
                version: preview.version
            }
        });
    } catch {
        return fail(
            request,
            500,
            'PUBLIC_CONTENT_PREVIEW_FAILED',
            'Failed to preview public content publish request.'
        );
    }
}

export const ADMIN_PUBLIC_CONTENT_PREVIEW_QUERIES = Object.freeze({
    SELECT_EXISTING_DOCUMENT_SQL,
    SELECT_CURRENT_PUBLICATION_SQL
});

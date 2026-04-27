import { authenticateAdminRequest } from '../../../_shared/admin-auth.js';
import {
    isJsonContentType,
    readJsonRequestBody,
    validateAdminPublicContentRequestBody
} from '../../../_shared/admin-public-content-request.js';
import { failure, success } from '../../../_shared/http.js';
import {
    getPublicContentD1Binding,
    writeAndPublishPublicContentDocument
} from '../../../_shared/public-content-d1.js';

const ENDPOINT = '/api/admin/public-content/publish';

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

function isDuplicateVersionError(error) {
    const message = error instanceof Error ? error.message : String(error || '');
    return /unique constraint|constraint failed|primary key/i.test(message);
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
            'INVALID_PUBLIC_CONTENT_PUBLISH_REQUEST',
            validationResult.error
        );
    }

    try {
        const result = await writeAndPublishPublicContentDocument(db, {
            ...validationResult.input,
            actor: {
                uid: authResult.admin.uid,
                email: authResult.admin.email,
                provider: authResult.admin.provider
            },
            sourceKind: 'admin-publish',
            metadata: {
                endpoint: ENDPOINT,
                payloadBytes: validationResult.payloadBytes
            }
        });

        return success(request, result, {
            status: 201,
            headers: ADMIN_RESPONSE_HEADERS,
            meta: {
                endpoint: ENDPOINT,
                sectionId: result.sectionId,
                version: result.version
            }
        });
    } catch (error) {
        if (isDuplicateVersionError(error)) {
            return fail(
                request,
                409,
                'PUBLIC_CONTENT_VERSION_ALREADY_EXISTS',
                'A document with this section/version already exists. Publish a new version identifier.'
            );
        }

        return fail(
            request,
            500,
            'PUBLIC_CONTENT_PUBLISH_FAILED',
            'Failed to publish public content document.'
        );
    }
}

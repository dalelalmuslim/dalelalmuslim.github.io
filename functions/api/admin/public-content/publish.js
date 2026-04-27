import { authenticateAdminRequest } from '../../../_shared/admin-auth.js';
import { failure, success } from '../../../_shared/http.js';
import {
    getPublicContentD1Binding,
    writeAndPublishPublicContentDocument
} from '../../../_shared/public-content-d1.js';
import {
    getPublicContentSectionById,
    listPublicContentSections
} from '../../../../js/shared/contracts/public-content-manifest.js';

const ENDPOINT = '/api/admin/public-content/publish';
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_PAYLOAD_BYTES = 1800 * 1024;
const MAX_VERSION_LENGTH = 128;
const MAX_NOTES_LENGTH = 1000;
const MAX_SCHEMA_VERSION_LENGTH = 64;
const VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SCHEMA_VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const ALLOWED_BODY_KEYS = new Set(['section', 'version', 'payload', 'notes', 'schemaVersion']);

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

function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isJsonContentType(value) {
    return String(value || '').split(';')[0].trim().toLowerCase() === 'application/json';
}

function getAllowedSections() {
    return listPublicContentSections().map((section) => section.id);
}

function validateTopLevelKeys(body) {
    const unknownKeys = Object.keys(body).filter((key) => !ALLOWED_BODY_KEYS.has(key));
    if (unknownKeys.length) {
        return `Unsupported request field(s): ${unknownKeys.join(', ')}.`;
    }

    return '';
}

function validateSection(value) {
    const sectionId = String(value || '').trim();
    const section = getPublicContentSectionById(sectionId);

    if (!section) {
        return {
            ok: false,
            error: `section must be one of: ${getAllowedSections().join(', ')}.`
        };
    }

    return {
        ok: true,
        sectionId: section.id
    };
}

function validateVersion(value) {
    const version = String(value || '').trim();

    if (!version) {
        return {
            ok: false,
            error: 'version is required.'
        };
    }

    if (version.length > MAX_VERSION_LENGTH || !VERSION_PATTERN.test(version)) {
        return {
            ok: false,
            error: 'version must be a lowercase stable identifier using letters, numbers, dot, underscore, colon, or hyphen.'
        };
    }

    return {
        ok: true,
        version
    };
}

function validateNotes(value) {
    if (value === undefined || value === null) {
        return {
            ok: true,
            notes: ''
        };
    }

    if (typeof value !== 'string') {
        return {
            ok: false,
            error: 'notes must be a string when provided.'
        };
    }

    if (value.length > MAX_NOTES_LENGTH) {
        return {
            ok: false,
            error: `notes must not exceed ${MAX_NOTES_LENGTH} characters.`
        };
    }

    return {
        ok: true,
        notes: value.trim()
    };
}

function validateSchemaVersion(value) {
    if (value === undefined || value === null || value === '') {
        return {
            ok: true,
            schemaVersion: 'public-content-v1'
        };
    }

    const schemaVersion = String(value).trim();

    if (schemaVersion.length > MAX_SCHEMA_VERSION_LENGTH || !SCHEMA_VERSION_PATTERN.test(schemaVersion)) {
        return {
            ok: false,
            error: 'schemaVersion must be a stable lowercase identifier.'
        };
    }

    return {
        ok: true,
        schemaVersion
    };
}

function validatePayload(value) {
    if (value === null || value === undefined) {
        return {
            ok: false,
            error: 'payload is required.'
        };
    }

    if (typeof value !== 'object') {
        return {
            ok: false,
            error: 'payload must be a JSON object or array.'
        };
    }

    const payloadJson = JSON.stringify(value);
    if (!payloadJson) {
        return {
            ok: false,
            error: 'payload must be JSON-serializable.'
        };
    }

    const payloadBytes = new TextEncoder().encode(payloadJson).length;
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
        return {
            ok: false,
            error: `payload must not exceed ${MAX_PAYLOAD_BYTES} bytes.`
        };
    }

    return {
        ok: true,
        payload: value,
        payloadBytes
    };
}

async function readJsonRequestBody(request) {
    const bodyText = await request.text();
    const bodyBytes = new TextEncoder().encode(bodyText).length;

    if (bodyBytes > MAX_REQUEST_BYTES) {
        return {
            ok: false,
            status: 413,
            code: 'REQUEST_TOO_LARGE',
            message: `Request body must not exceed ${MAX_REQUEST_BYTES} bytes.`
        };
    }

    if (!bodyText.trim()) {
        return {
            ok: false,
            status: 400,
            code: 'INVALID_JSON',
            message: 'Request body must be a non-empty JSON object.'
        };
    }

    try {
        const body = JSON.parse(bodyText);
        return {
            ok: true,
            body
        };
    } catch {
        return {
            ok: false,
            status: 400,
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON.'
        };
    }
}

function validatePublishRequestBody(body) {
    if (!isPlainRecord(body)) {
        return {
            ok: false,
            error: 'Request body must be a JSON object.'
        };
    }

    const keyError = validateTopLevelKeys(body);
    if (keyError) {
        return {
            ok: false,
            error: keyError
        };
    }

    const sectionResult = validateSection(body.section);
    if (!sectionResult.ok) {
        return {
            ok: false,
            error: sectionResult.error
        };
    }

    const versionResult = validateVersion(body.version);
    if (!versionResult.ok) {
        return {
            ok: false,
            error: versionResult.error
        };
    }

    const payloadResult = validatePayload(body.payload);
    if (!payloadResult.ok) {
        return {
            ok: false,
            error: payloadResult.error
        };
    }

    const notesResult = validateNotes(body.notes);
    if (!notesResult.ok) {
        return {
            ok: false,
            error: notesResult.error
        };
    }

    const schemaVersionResult = validateSchemaVersion(body.schemaVersion);
    if (!schemaVersionResult.ok) {
        return {
            ok: false,
            error: schemaVersionResult.error
        };
    }

    return {
        ok: true,
        input: {
            sectionId: sectionResult.sectionId,
            version: versionResult.version,
            payload: payloadResult.payload,
            notes: notesResult.notes,
            schemaVersion: schemaVersionResult.schemaVersion
        },
        payloadBytes: payloadResult.payloadBytes
    };
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

    const validationResult = validatePublishRequestBody(bodyResult.body);
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

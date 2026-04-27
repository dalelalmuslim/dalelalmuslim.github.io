import {
    getPublicContentSectionById,
    listPublicContentSections
} from '../../js/shared/contracts/public-content-manifest.js';

export const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
export const MAX_PAYLOAD_BYTES = 1800 * 1024;
export const MAX_VERSION_LENGTH = 128;
export const MAX_NOTES_LENGTH = 1000;
export const MAX_SCHEMA_VERSION_LENGTH = 64;

const VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SCHEMA_VERSION_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const ALLOWED_BODY_KEYS = new Set(['section', 'version', 'payload', 'notes', 'schemaVersion']);

export function isJsonContentType(value) {
    return String(value || '').split(';')[0].trim().toLowerCase() === 'application/json';
}

function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
        payloadJson,
        payloadBytes
    };
}

export async function readJsonRequestBody(request) {
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

export function validateAdminPublicContentRequestBody(body) {
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
            payloadJson: payloadResult.payloadJson,
            notes: notesResult.notes,
            schemaVersion: schemaVersionResult.schemaVersion
        },
        payloadBytes: payloadResult.payloadBytes
    };
}

export async function hashPublicContentPayloadJson(payloadJson) {
    const bytes = new TextEncoder().encode(payloadJson);
    const digest = await crypto.subtle.digest('SHA-256', bytes);

    return [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

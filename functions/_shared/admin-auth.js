const DEFAULT_FIREBASE_PROJECT_ID = 'azkar-app-2bd85';
const FIREBASE_SECURE_TOKEN_JWKS_URL =
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const AUTH_ERROR_MESSAGES = Object.freeze({
    AUTH_REQUIRED: 'Admin authentication is required.',
    AUTH_INVALID: 'Admin authentication token is invalid.',
    AUTH_CONFIG_MISSING: 'Admin authentication is not configured.',
    ADMIN_FORBIDDEN: 'Authenticated user is not allowed to access admin APIs.'
});

let cachedJwks = null;

function createAuthFailure(code, status = 401, details = '') {
    return {
        ok: false,
        status,
        error: {
            code,
            message: AUTH_ERROR_MESSAGES[code] || 'Admin authentication failed.',
            ...(details ? { details } : {})
        }
    };
}

function base64UrlDecodeToBytes(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

    if (typeof atob === 'function') {
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    return Uint8Array.from(Buffer.from(padded, 'base64'));
}

function base64UrlDecodeJson(value) {
    const bytes = base64UrlDecodeToBytes(value);
    return JSON.parse(new TextDecoder().decode(bytes));
}

function parseBearerToken(request) {
    const authorization = request?.headers?.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

function parseAllowlist(env) {
    const raw = String(env?.ADMIN_EMAIL_ALLOWLIST || '').trim();

    if (!raw) {
        return [];
    }

    return raw
        .split(/[\s,;]+/g)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

function resolveFirebaseProjectId(env) {
    return String(env?.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID).trim();
}

function resolveJwksUrl(env, options = {}) {
    return String(
        options.jwksUrl ||
        env?.FIREBASE_SECURE_TOKEN_JWKS_URL ||
        FIREBASE_SECURE_TOKEN_JWKS_URL
    ).trim();
}

function parseCacheMaxAge(headers) {
    const cacheControl = headers?.get?.('cache-control') || '';
    const match = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSeconds = match ? Number(match[1]) : 300;

    if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) {
        return 300;
    }

    return Math.min(maxAgeSeconds, 3600);
}

async function fetchFirebaseJwks(env, options = {}) {
    const nowMs = Number(options.nowMs || Date.now());

    if (cachedJwks && cachedJwks.expiresAt > nowMs && Array.isArray(cachedJwks.keys)) {
        return cachedJwks.keys;
    }

    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(resolveJwksUrl(env, options), {
        method: 'GET',
        headers: { accept: 'application/json' }
    });

    if (!response?.ok) {
        throw new Error(`Unable to load Firebase JWKS: HTTP ${response?.status || 0}`);
    }

    const payload = await response.json();
    const keys = Array.isArray(payload?.keys) ? payload.keys : [];

    if (!keys.length) {
        throw new Error('Firebase JWKS response did not include keys.');
    }

    cachedJwks = {
        keys,
        expiresAt: nowMs + (parseCacheMaxAge(response.headers) * 1000)
    };

    return keys;
}

async function verifyJwtSignature(token, header, env, options = {}) {
    if (header?.alg !== 'RS256' || typeof header?.kid !== 'string') {
        throw new Error('Unsupported token header.');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const signingInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = base64UrlDecodeToBytes(encodedSignature);
    const keys = await fetchFirebaseJwks(env, options);
    const jwk = keys.find((candidate) => candidate?.kid === header.kid);

    if (!jwk) {
        throw new Error('No matching Firebase public key was found.');
    }

    const publicKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
        },
        false,
        ['verify']
    );

    const valid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        publicKey,
        signature,
        signingInput
    );

    if (!valid) {
        throw new Error('Invalid token signature.');
    }
}

function validateFirebaseClaims(claims, env, options = {}) {
    const projectId = resolveFirebaseProjectId(env);
    const nowSeconds = Math.floor(Number(options.nowMs || Date.now()) / 1000);
    const leewaySeconds = Number(options.leewaySeconds || 60);
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    const email = typeof claims?.email === 'string' ? claims.email.trim().toLowerCase() : '';
    const subject = typeof claims?.sub === 'string' ? claims.sub.trim() : '';

    if (claims?.iss !== expectedIssuer) {
        throw new Error('Invalid token issuer.');
    }

    if (claims?.aud !== projectId) {
        throw new Error('Invalid token audience.');
    }

    if (!subject || subject.length > 128) {
        throw new Error('Invalid token subject.');
    }

    if (!Number.isFinite(Number(claims?.exp)) || Number(claims.exp) <= nowSeconds - leewaySeconds) {
        throw new Error('Token has expired.');
    }

    if (!Number.isFinite(Number(claims?.iat)) || Number(claims.iat) > nowSeconds + leewaySeconds) {
        throw new Error('Token issued-at timestamp is invalid.');
    }

    if (!email) {
        throw new Error('Token does not include an email.');
    }

    if (env?.ADMIN_REQUIRE_VERIFIED_EMAIL !== 'false' && claims?.email_verified !== true) {
        throw new Error('Admin email must be verified.');
    }

    return {
        uid: subject,
        email,
        emailVerified: claims.email_verified === true,
        name: typeof claims?.name === 'string' ? claims.name : '',
        picture: typeof claims?.picture === 'string' ? claims.picture : '',
        provider: claims?.firebase?.sign_in_provider || ''
    };
}

export async function authenticateAdminRequest(request, env, options = {}) {
    const allowlist = parseAllowlist(env);
    if (!allowlist.length) {
        return createAuthFailure('AUTH_CONFIG_MISSING', 500);
    }

    const token = parseBearerToken(request);
    if (!token) {
        return createAuthFailure('AUTH_REQUIRED', 401);
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return createAuthFailure('AUTH_INVALID', 401, 'Malformed JWT.');
    }

    try {
        const header = base64UrlDecodeJson(parts[0]);
        const claims = base64UrlDecodeJson(parts[1]);

        await verifyJwtSignature(token, header, env, options);
        const admin = validateFirebaseClaims(claims, env, options);

        if (!allowlist.includes(admin.email)) {
            return createAuthFailure('ADMIN_FORBIDDEN', 403);
        }

        return {
            ok: true,
            admin
        };
    } catch (error) {
        return createAuthFailure(
            'AUTH_INVALID',
            401,
            error instanceof Error ? error.message : 'Invalid admin token.'
        );
    }
}

export function resetAdminAuthJwksCache() {
    cachedJwks = null;
}

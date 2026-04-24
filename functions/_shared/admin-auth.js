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

function parseCookieToken(request) {
    const cookieHeader = request?.headers?.get('cookie') || '';
    const cookies = cookieHeader.split(';').map((part) => part.trim());

    for (const cookie of cookies) {
        const [name, ...valueParts] = cookie.split('=');
        if (name === 'CF_Authorization') {
            return decodeURIComponent(valueParts.join('=') || '').trim();
        }
    }

    return '';
}

function parseAccessToken(request) {
    const headerToken = request?.headers?.get('cf-access-jwt-assertion') || '';
    if (headerToken.trim()) {
        return headerToken.trim();
    }

    const authorization = request?.headers?.get('authorization') || '';
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]?.trim()) {
        return bearerMatch[1].trim();
    }

    return parseCookieToken(request);
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

function normalizeIssuer(value) {
    const raw = String(value || '').trim().replace(/\/+$/g, '');

    if (!raw) {
        return '';
    }

    if (raw.startsWith('https://')) {
        return raw;
    }

    return `https://${raw}`;
}

function resolveAccessIssuer(env) {
    const explicitIssuer = normalizeIssuer(env?.CF_ACCESS_ISSUER);
    if (explicitIssuer) {
        return explicitIssuer;
    }

    return normalizeIssuer(env?.CF_ACCESS_TEAM_DOMAIN);
}

function resolveAccessAudiences(env) {
    return String(env?.CF_ACCESS_AUD || '')
        .split(/[\s,;]+/g)
        .map((audience) => audience.trim())
        .filter(Boolean);
}

function resolveJwksUrl(env, options = {}) {
    if (options.jwksUrl) {
        return String(options.jwksUrl).trim();
    }

    const issuer = resolveAccessIssuer(env);
    return issuer ? `${issuer}/cdn-cgi/access/certs` : '';
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

async function fetchAccessJwks(env, options = {}) {
    const nowMs = Number(options.nowMs || Date.now());

    if (cachedJwks && cachedJwks.expiresAt > nowMs && Array.isArray(cachedJwks.keys)) {
        return cachedJwks.keys;
    }

    const jwksUrl = resolveJwksUrl(env, options);
    if (!jwksUrl) {
        throw new Error('Cloudflare Access JWKS URL is not configured.');
    }

    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(jwksUrl, {
        method: 'GET',
        headers: { accept: 'application/json' }
    });

    if (!response?.ok) {
        throw new Error(`Unable to load Cloudflare Access JWKS: HTTP ${response?.status || 0}`);
    }

    const payload = await response.json();
    const keys = Array.isArray(payload?.keys) ? payload.keys : [];

    if (!keys.length) {
        throw new Error('Cloudflare Access JWKS response did not include keys.');
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
    const keys = await fetchAccessJwks(env, options);
    const jwk = keys.find((candidate) => candidate?.kid === header.kid);

    if (!jwk) {
        throw new Error('No matching Cloudflare Access public key was found.');
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

function tokenHasExpectedAudience(claimAudience, expectedAudiences) {
    const actualAudiences = Array.isArray(claimAudience)
        ? claimAudience.map(String)
        : [String(claimAudience || '')];

    return expectedAudiences.some((expectedAudience) => actualAudiences.includes(expectedAudience));
}

function validateAccessClaims(claims, env, options = {}) {
    const expectedIssuer = resolveAccessIssuer(env);
    const expectedAudiences = resolveAccessAudiences(env);
    const nowSeconds = Math.floor(Number(options.nowMs || Date.now()) / 1000);
    const leewaySeconds = Number(options.leewaySeconds || 60);
    const email = typeof claims?.email === 'string' ? claims.email.trim().toLowerCase() : '';
    const subject = typeof claims?.sub === 'string' ? claims.sub.trim() : '';

    if (!expectedIssuer || !expectedAudiences.length) {
        throw new Error('Cloudflare Access issuer/audience is not configured.');
    }

    if (claims?.iss !== expectedIssuer) {
        throw new Error('Invalid Cloudflare Access token issuer.');
    }

    if (!tokenHasExpectedAudience(claims?.aud, expectedAudiences)) {
        throw new Error('Invalid Cloudflare Access token audience.');
    }

    if (!subject) {
        throw new Error('Invalid Cloudflare Access token subject.');
    }

    if (!Number.isFinite(Number(claims?.exp)) || Number(claims.exp) <= nowSeconds - leewaySeconds) {
        throw new Error('Cloudflare Access token has expired.');
    }

    if (!Number.isFinite(Number(claims?.iat)) || Number(claims.iat) > nowSeconds + leewaySeconds) {
        throw new Error('Cloudflare Access token issued-at timestamp is invalid.');
    }

    if (!email) {
        throw new Error('Cloudflare Access token does not include an email.');
    }

    return {
        uid: subject,
        email,
        provider: 'cloudflare-access',
        name: typeof claims?.name === 'string' ? claims.name : '',
        identityNonce: typeof claims?.identity_nonce === 'string' ? claims.identity_nonce : ''
    };
}

export async function authenticateAdminRequest(request, env, options = {}) {
    const allowlist = parseAllowlist(env);
    const issuer = resolveAccessIssuer(env);
    const audiences = resolveAccessAudiences(env);

    if (!allowlist.length || !issuer || !audiences.length) {
        return createAuthFailure('AUTH_CONFIG_MISSING', 500);
    }

    const token = parseAccessToken(request);
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
        const admin = validateAccessClaims(claims, env, options);

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
            error instanceof Error ? error.message : 'Invalid Cloudflare Access token.'
        );
    }
}

export function resetAdminAuthJwksCache() {
    cachedJwks = null;
}

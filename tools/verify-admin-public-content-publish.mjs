import { strict as assert } from 'node:assert';
import { onRequest as onPublishRequest } from '../functions/api/admin/public-content/publish.js';
import { resetAdminAuthJwksCache } from '../functions/_shared/admin-auth.js';

const ISSUER = 'https://dalil-team.cloudflareaccess.com';
const AUDIENCE = 'access-audience-tag';
const ADMIN_EMAIL = 'admin@example.com';

function base64UrlEncodeBytes(bytes) {
    return Buffer.from(bytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlEncodeJson(value) {
    return base64UrlEncodeBytes(Buffer.from(JSON.stringify(value), 'utf8'));
}

async function createAccessTokenFixture() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['sign', 'verify']
    );

    const kid = 'test-access-key';
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const nowSeconds = Math.floor(Date.now() / 1000);

    const encodedHeader = base64UrlEncodeJson({
        alg: 'RS256',
        typ: 'JWT',
        kid
    });

    const encodedPayload = base64UrlEncodeJson({
        iss: ISSUER,
        aud: AUDIENCE,
        sub: 'admin-user-id',
        email: ADMIN_EMAIL,
        name: 'Admin User',
        iat: nowSeconds,
        exp: nowSeconds + 600
    });

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keyPair.privateKey,
        new TextEncoder().encode(signingInput)
    );

    return {
        token: `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`,
        jwks: {
            keys: [
                {
                    ...publicJwk,
                    kid,
                    alg: 'RS256',
                    use: 'sig'
                }
            ]
        }
    };
}

function createMockD1() {
    const calls = {
        prepared: [],
        batches: []
    };

    return {
        calls,
        prepare(sql) {
            const statement = {
                sql,
                boundParams: [],
                bind(...params) {
                    statement.boundParams = params;
                    return statement;
                },
                async first() {
                    return null;
                },
                async all() {
                    return { results: [] };
                }
            };

            calls.prepared.push(statement);
            return statement;
        },
        async batch(statements) {
            calls.batches.push(statements);
            return statements.map(() => ({ success: true }));
        }
    };
}

function createEnv(db = createMockD1()) {
    return {
        ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
        CF_ACCESS_ISSUER: ISSUER,
        CF_ACCESS_AUD: AUDIENCE,
        PUBLIC_CONTENT_DB: db
    };
}

function createRequest(pathname, options = {}) {
    return new Request(`https://dalil-almuslim.test${pathname}`, {
        method: options.method || 'POST',
        headers: options.headers || {},
        body: options.body
    });
}

function createPublishBody(overrides = {}) {
    return {
        section: 'azkar',
        version: `admin-publish-test-${Date.now()}`,
        payload: {
            categories: [
                {
                    id: 'morning',
                    title: 'Morning',
                    items: []
                }
            ]
        },
        notes: 'verification publish',
        ...overrides
    };
}

async function readJsonResponse(response) {
    const bodyText = await response.text();
    return bodyText ? JSON.parse(bodyText) : null;
}

async function createAuthorizedContext(token, env, body = createPublishBody()) {
    return {
        request: createRequest('/api/admin/public-content/publish', {
            headers: {
                'content-type': 'application/json',
                'cf-access-jwt-assertion': token
            },
            body: JSON.stringify(body)
        }),
        env
    };
}

async function main() {
    const originalFetch = globalThis.fetch;
    const fixture = await createAccessTokenFixture();

    globalThis.fetch = async function fetchStub(input) {
        const url = new URL(typeof input === 'string' ? input : input.url);
        if (url.href === `${ISSUER}/cdn-cgi/access/certs`) {
            return new Response(JSON.stringify(fixture.jwks), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                    'cache-control': 'max-age=60'
                }
            });
        }

        return new Response(null, { status: 404 });
    };

    try {
        resetAdminAuthJwksCache();

        const optionsResponse = await onPublishRequest({
            request: createRequest('/api/admin/public-content/publish', { method: 'OPTIONS' }),
            env: createEnv()
        });

        assert.equal(optionsResponse.status, 204, 'OPTIONS should return HTTP 204');
        assert.match(
            optionsResponse.headers.get('access-control-allow-methods') || '',
            /POST/,
            'OPTIONS should allow POST'
        );

        const getResponse = await onPublishRequest({
            request: createRequest('/api/admin/public-content/publish', { method: 'GET' }),
            env: createEnv()
        });
        const getJson = await readJsonResponse(getResponse);

        assert.equal(getResponse.status, 405, 'GET should return HTTP 405');
        assert.equal(getJson?.error?.code, 'METHOD_NOT_ALLOWED', 'GET should return METHOD_NOT_ALLOWED');

        const missingAuthResponse = await onPublishRequest({
            request: createRequest('/api/admin/public-content/publish', {
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(createPublishBody())
            }),
            env: createEnv()
        });
        const missingAuthJson = await readJsonResponse(missingAuthResponse);

        assert.equal(missingAuthResponse.status, 401, 'missing token should return HTTP 401');
        assert.equal(missingAuthJson?.error?.code, 'AUTH_REQUIRED', 'missing token should return AUTH_REQUIRED');

        resetAdminAuthJwksCache();

        const badContentTypeResponse = await onPublishRequest({
            request: createRequest('/api/admin/public-content/publish', {
                headers: {
                    'content-type': 'text/plain',
                    'cf-access-jwt-assertion': fixture.token
                },
                body: JSON.stringify(createPublishBody())
            }),
            env: createEnv()
        });
        const badContentTypeJson = await readJsonResponse(badContentTypeResponse);

        assert.equal(badContentTypeResponse.status, 415, 'bad content-type should return HTTP 415');
        assert.equal(badContentTypeJson?.error?.code, 'UNSUPPORTED_MEDIA_TYPE', 'bad content-type should be rejected');

        const invalidJsonResponse = await onPublishRequest({
            request: createRequest('/api/admin/public-content/publish', {
                headers: {
                    'content-type': 'application/json',
                    'cf-access-jwt-assertion': fixture.token
                },
                body: '{'
            }),
            env: createEnv()
        });
        const invalidJson = await readJsonResponse(invalidJsonResponse);

        assert.equal(invalidJsonResponse.status, 400, 'invalid JSON should return HTTP 400');
        assert.equal(invalidJson?.error?.code, 'INVALID_JSON', 'invalid JSON should be rejected');

        const invalidSectionResponse = await onPublishRequest(await createAuthorizedContext(
            fixture.token,
            createEnv(),
            createPublishBody({ section: 'bad-section' })
        ));
        const invalidSectionJson = await readJsonResponse(invalidSectionResponse);

        assert.equal(invalidSectionResponse.status, 400, 'invalid section should return HTTP 400');
        assert.equal(
            invalidSectionJson?.error?.code,
            'INVALID_PUBLIC_CONTENT_PUBLISH_REQUEST',
            'invalid section should be rejected'
        );

        const invalidVersionResponse = await onPublishRequest(await createAuthorizedContext(
            fixture.token,
            createEnv(),
            createPublishBody({ version: 'Bad Version With Spaces' })
        ));
        const invalidVersionJson = await readJsonResponse(invalidVersionResponse);

        assert.equal(invalidVersionResponse.status, 400, 'invalid version should return HTTP 400');
        assert.equal(
            invalidVersionJson?.error?.code,
            'INVALID_PUBLIC_CONTENT_PUBLISH_REQUEST',
            'invalid version should be rejected'
        );

        const missingDbEnv = createEnv(null);
        delete missingDbEnv.PUBLIC_CONTENT_DB;

        const missingDbResponse = await onPublishRequest(await createAuthorizedContext(
            fixture.token,
            missingDbEnv,
            createPublishBody()
        ));
        const missingDbJson = await readJsonResponse(missingDbResponse);

        assert.equal(missingDbResponse.status, 503, 'missing D1 binding should return HTTP 503');
        assert.equal(
            missingDbJson?.error?.code,
            'PUBLIC_CONTENT_DB_UNAVAILABLE',
            'missing D1 binding should be explicit'
        );

        const db = createMockD1();
        const successResponse = await onPublishRequest(await createAuthorizedContext(
            fixture.token,
            createEnv(db),
            createPublishBody({ version: 'admin-publish-test-v1' })
        ));
        const successJson = await readJsonResponse(successResponse);

        assert.equal(successResponse.status, 201, 'valid publish should return HTTP 201');
        assert.equal(successJson?.ok, true, 'valid publish should return ok=true');
        assert.equal(successJson?.data?.sectionId, 'azkar', 'valid publish should return section id');
        assert.equal(successJson?.data?.version, 'admin-publish-test-v1', 'valid publish should return version');
        assert.equal(successJson?.data?.publishedBy, ADMIN_EMAIL, 'valid publish should return normalized actor email');
        assert.equal(db.calls.batches.length, 1, 'valid publish should execute one D1 batch');
        assert.equal(db.calls.batches[0].length, 3, 'valid publish should write document, publication, and audit log');
        assert.equal(db.calls.batches[0][0].boundParams[0], 'azkar', 'document insert should bind section id');
        assert.equal(db.calls.batches[0][0].boundParams[1], 'admin-publish-test-v1', 'document insert should bind version');
        assert.equal(db.calls.batches[0][1].boundParams[3], ADMIN_EMAIL, 'publication should bind actor email');
        assert.equal(db.calls.batches[0][2].boundParams[1], 'public_content.publish', 'audit log should bind action');

        console.log(JSON.stringify({
            ok: true,
            checkedEndpoint: '/api/admin/public-content/publish',
            checks: [
                'OPTIONS CORS',
                'method guard',
                'Cloudflare Access auth guard',
                'content-type validation',
                'JSON validation',
                'section validation',
                'version validation',
                'D1 binding guard',
                'D1 write helper integration',
                'admin audit write integration'
            ]
        }, null, 2));
    } finally {
        globalThis.fetch = originalFetch;
        resetAdminAuthJwksCache();
    }
}

main().catch((error) => {
    console.error('[verify-admin-public-content-publish] Verification failed.');
    console.error(error);
    process.exitCode = 1;
});

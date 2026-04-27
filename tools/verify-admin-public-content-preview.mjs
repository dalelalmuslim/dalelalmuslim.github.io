import { strict as assert } from 'node:assert';
import { onRequest as onPreviewRequest } from '../functions/api/admin/public-content/preview.js';
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

function createMockD1(options = {}) {
    const calls = {
        prepared: [],
        batchCalls: 0
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
                    if (/FROM public_content_documents/i.test(sql)) {
                        return options.existingDocument || null;
                    }

                    if (/FROM public_content_publications/i.test(sql)) {
                        return options.currentPublication || null;
                    }

                    return null;
                },
                async all() {
                    return { results: [] };
                }
            };

            calls.prepared.push(statement);
            return statement;
        },
        async batch() {
            calls.batchCalls += 1;
            throw new Error('preview endpoint must not write to D1');
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

function createPreviewBody(overrides = {}) {
    return {
        section: 'azkar',
        version: `admin-preview-test-${Date.now()}`,
        payload: {
            categories: [
                {
                    id: 'morning',
                    title: 'Morning',
                    items: []
                }
            ]
        },
        notes: 'verification preview',
        ...overrides
    };
}

async function readJsonResponse(response) {
    const bodyText = await response.text();
    return bodyText ? JSON.parse(bodyText) : null;
}

async function createAuthorizedContext(token, env, body = createPreviewBody()) {
    return {
        request: createRequest('/api/admin/public-content/preview', {
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

        const optionsResponse = await onPreviewRequest({
            request: createRequest('/api/admin/public-content/preview', { method: 'OPTIONS' }),
            env: createEnv()
        });

        assert.equal(optionsResponse.status, 204, 'OPTIONS should return HTTP 204');
        assert.match(
            optionsResponse.headers.get('access-control-allow-methods') || '',
            /POST/,
            'OPTIONS should allow POST'
        );

        const getResponse = await onPreviewRequest({
            request: createRequest('/api/admin/public-content/preview', { method: 'GET' }),
            env: createEnv()
        });
        const getJson = await readJsonResponse(getResponse);

        assert.equal(getResponse.status, 405, 'GET should return HTTP 405');
        assert.equal(getJson?.error?.code, 'METHOD_NOT_ALLOWED', 'GET should return METHOD_NOT_ALLOWED');

        const missingAuthResponse = await onPreviewRequest({
            request: createRequest('/api/admin/public-content/preview', {
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(createPreviewBody())
            }),
            env: createEnv()
        });
        const missingAuthJson = await readJsonResponse(missingAuthResponse);

        assert.equal(missingAuthResponse.status, 401, 'missing token should return HTTP 401');
        assert.equal(missingAuthJson?.error?.code, 'AUTH_REQUIRED', 'missing token should return AUTH_REQUIRED');

        resetAdminAuthJwksCache();

        const invalidSectionResponse = await onPreviewRequest(await createAuthorizedContext(
            fixture.token,
            createEnv(),
            createPreviewBody({ section: 'bad-section' })
        ));
        const invalidSectionJson = await readJsonResponse(invalidSectionResponse);

        assert.equal(invalidSectionResponse.status, 400, 'invalid section should return HTTP 400');
        assert.equal(
            invalidSectionJson?.error?.code,
            'INVALID_PUBLIC_CONTENT_PREVIEW_REQUEST',
            'invalid section should be rejected'
        );

        const db = createMockD1({
            currentPublication: {
                section_id: 'azkar',
                version: 'current-azkar-v1',
                published_at: '2026-04-01T00:00:00.000Z',
                published_by: 'admin@example.com',
                notes: 'current publication'
            }
        });

        const successResponse = await onPreviewRequest(await createAuthorizedContext(
            fixture.token,
            createEnv(db),
            createPreviewBody({ version: 'admin-preview-test-v1' })
        ));
        const successJson = await readJsonResponse(successResponse);

        assert.equal(successResponse.status, 200, 'valid preview should return HTTP 200');
        assert.equal(successJson?.ok, true, 'valid preview should return ok=true');
        assert.equal(successJson?.data?.dryRun, true, 'preview must be marked as dryRun');
        assert.equal(successJson?.data?.valid, true, 'preview should be valid');
        assert.equal(successJson?.data?.wouldPublish, true, 'new version should be publishable');
        assert.equal(successJson?.data?.sectionId, 'azkar', 'preview should include section id');
        assert.equal(successJson?.data?.version, 'admin-preview-test-v1', 'preview should include version');
        assert.equal(typeof successJson?.data?.payloadHash, 'string', 'preview should include payload hash');
        assert.equal(successJson.data.payloadHash.length, 64, 'payload hash should be sha256 hex');
        assert.equal(successJson?.data?.currentPublication?.version, 'current-azkar-v1', 'preview should include current publication');
        assert.equal(successJson?.data?.existingDocument, null, 'new version should not have existing document');
        assert.equal(db.calls.batchCalls, 0, 'preview must not call D1 batch writes');

        const existingDb = createMockD1({
            existingDocument: {
                section_id: 'azkar',
                version: 'admin-preview-existing-v1',
                payload_hash: 'abc123',
                schema_version: 'public-content-v1',
                source_kind: 'admin-publish',
                created_at: '2026-04-01T00:00:00.000Z'
            }
        });

        const existingResponse = await onPreviewRequest(await createAuthorizedContext(
            fixture.token,
            createEnv(existingDb),
            createPreviewBody({ version: 'admin-preview-existing-v1' })
        ));
        const existingJson = await readJsonResponse(existingResponse);

        assert.equal(existingResponse.status, 200, 'existing version preview should return HTTP 200');
        assert.equal(existingJson?.data?.wouldPublish, false, 'existing version should not be publishable');
        assert.deepEqual(
            existingJson?.data?.blockingReasons,
            ['PUBLIC_CONTENT_VERSION_ALREADY_EXISTS'],
            'existing version should return duplicate blocker'
        );
        assert.equal(existingDb.calls.batchCalls, 0, 'existing preview must not write to D1');

        console.log(JSON.stringify({
            ok: true,
            checkedEndpoint: '/api/admin/public-content/preview',
            checks: [
                'OPTIONS CORS',
                'method guard',
                'Cloudflare Access auth guard',
                'section validation',
                'D1 binding read guard',
                'payload hash preview',
                'current publication lookup',
                'duplicate version detection',
                'no D1 writes'
            ]
        }, null, 2));
    } finally {
        globalThis.fetch = originalFetch;
        resetAdminAuthJwksCache();
    }
}

main().catch((error) => {
    console.error('[verify-admin-public-content-preview] Verification failed.');
    console.error(error);
    process.exitCode = 1;
});

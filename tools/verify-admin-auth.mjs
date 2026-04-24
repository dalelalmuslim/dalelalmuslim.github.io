import assert from 'node:assert/strict';
import { authenticateAdminRequest, resetAdminAuthJwksCache } from '../functions/_shared/admin-auth.js';

const PROJECT_ID = 'azkar-app-2bd85';
const ADMIN_EMAIL = 'admin@example.com';
const NOW_MS = Date.parse('2026-04-24T12:00:00.000Z');

function base64UrlEncodeBytes(bytes) {
  return Buffer
    .from(bytes)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlEncodeJson(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

async function createTestKeyPair() {
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

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  return {
    privateKey: keyPair.privateKey,
    publicJwk: {
      ...publicJwk,
      kid: 'test-key',
      alg: 'RS256',
      use: 'sig'
    }
  };
}

async function signFirebaseToken(privateKey, claimsPatch = {}) {
  const nowSeconds = Math.floor(NOW_MS / 1000);
  const header = {
    alg: 'RS256',
    kid: 'test-key',
    typ: 'JWT'
  };
  const claims = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    auth_time: nowSeconds - 10,
    iat: nowSeconds - 10,
    exp: nowSeconds + 3600,
    sub: 'firebase-user-123',
    user_id: 'firebase-user-123',
    email: ADMIN_EMAIL,
    email_verified: true,
    firebase: {
      sign_in_provider: 'google.com'
    },
    ...claimsPatch
  };

  const encodedHeader = base64UrlEncodeJson(header);
  const encodedPayload = base64UrlEncodeJson(claims);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

function createRequest(token = '') {
  return new Request('https://dalil-almuslim.test/api/admin/whoami', {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  });
}

function createEnv(overrides = {}) {
  return {
    FIREBASE_PROJECT_ID: PROJECT_ID,
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
    ...overrides
  };
}

function createFetchImpl(publicJwk) {
  return async () => new Response(JSON.stringify({ keys: [publicJwk] }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60'
    }
  });
}

async function main() {
  resetAdminAuthJwksCache();

  const { privateKey, publicJwk } = await createTestKeyPair();
  const fetchImpl = createFetchImpl(publicJwk);
  const validToken = await signFirebaseToken(privateKey);

  const okResult = await authenticateAdminRequest(
    createRequest(validToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(okResult.ok, true, 'valid allowlisted Firebase token should authenticate');
  assert.equal(okResult.admin.email, ADMIN_EMAIL, 'admin email should be normalized');

  const missingToken = await authenticateAdminRequest(
    createRequest(),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(missingToken.ok, false, 'missing token should fail');
  assert.equal(missingToken.error.code, 'AUTH_REQUIRED', 'missing token should return AUTH_REQUIRED');

  const forbiddenToken = await signFirebaseToken(privateKey, { email: 'other@example.com' });
  const forbiddenResult = await authenticateAdminRequest(
    createRequest(forbiddenToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(forbiddenResult.ok, false, 'non-allowlisted email should fail');
  assert.equal(forbiddenResult.status, 403, 'non-allowlisted email should be forbidden');
  assert.equal(forbiddenResult.error.code, 'ADMIN_FORBIDDEN', 'non-allowlisted email should return ADMIN_FORBIDDEN');

  const badAudienceToken = await signFirebaseToken(privateKey, { aud: 'wrong-project' });
  const badAudienceResult = await authenticateAdminRequest(
    createRequest(badAudienceToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(badAudienceResult.ok, false, 'bad audience should fail');
  assert.equal(badAudienceResult.error.code, 'AUTH_INVALID', 'bad audience should return AUTH_INVALID');

  const unverifiedEmailToken = await signFirebaseToken(privateKey, { email_verified: false });
  const unverifiedEmailResult = await authenticateAdminRequest(
    createRequest(unverifiedEmailToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(unverifiedEmailResult.ok, false, 'unverified admin email should fail by default');
  assert.equal(unverifiedEmailResult.error.code, 'AUTH_INVALID', 'unverified admin email should return AUTH_INVALID');

  const missingConfigResult = await authenticateAdminRequest(
    createRequest(validToken),
    createEnv({ ADMIN_EMAIL_ALLOWLIST: '' }),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(missingConfigResult.ok, false, 'missing admin allowlist should fail closed');
  assert.equal(missingConfigResult.status, 500, 'missing admin allowlist should be configuration error');
  assert.equal(missingConfigResult.error.code, 'AUTH_CONFIG_MISSING', 'missing admin allowlist should return AUTH_CONFIG_MISSING');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'firebase id token signature verification',
      'admin email allowlist',
      'missing token rejection',
      'invalid claims rejection',
      'verified email enforcement',
      'fail-closed admin config'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

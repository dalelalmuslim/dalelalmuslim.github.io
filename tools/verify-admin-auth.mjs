import assert from 'node:assert/strict';
import { authenticateAdminRequest, resetAdminAuthJwksCache } from '../functions/_shared/admin-auth.js';

const ACCESS_ISSUER = 'https://dalil-team.cloudflareaccess.com';
const ACCESS_AUD = 'access-audience-tag';
const ADMIN_EMAIL = 'admin@example.com';
const SERVICE_TOKEN_ID = 'dalil-admin-cli.access';
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
      kid: 'test-access-key',
      alg: 'RS256',
      use: 'sig'
    }
  };
}

async function signAccessToken(privateKey, claimsPatch = {}) {
  const nowSeconds = Math.floor(NOW_MS / 1000);
  const header = {
    alg: 'RS256',
    kid: 'test-access-key',
    typ: 'JWT'
  };
  const claims = {
    iss: ACCESS_ISSUER,
    aud: [ACCESS_AUD],
    iat: nowSeconds - 10,
    exp: nowSeconds + 3600,
    sub: 'cloudflare-access-user-123',
    email: ADMIN_EMAIL,
    name: 'Admin User',
    identity_nonce: 'nonce-123',
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

function createRequest(token = '', mode = 'header') {
  const headers = {};

  if (token && mode === 'header') {
    headers['cf-access-jwt-assertion'] = token;
  }

  if (token && mode === 'raw-header') {
    headers['cf-access-token'] = token;
  }

  if (token && mode === 'bearer') {
    headers.authorization = `Bearer ${token}`;
  }

  if (token && mode === 'cookie') {
    headers.cookie = `CF_Authorization=${encodeURIComponent(token)}`;
  }

  return new Request('https://dalil-almuslim.test/api/admin/whoami', { headers });
}

function createEnv(overrides = {}) {
  return {
    CF_ACCESS_ISSUER: ACCESS_ISSUER,
    CF_ACCESS_AUD: ACCESS_AUD,
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
    ADMIN_SERVICE_TOKEN_ALLOWLIST: SERVICE_TOKEN_ID,
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
  const validToken = await signAccessToken(privateKey);

  const okResult = await authenticateAdminRequest(
    createRequest(validToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(okResult.ok, true, 'valid allowlisted Cloudflare Access token should authenticate');
  assert.equal(okResult.admin.email, ADMIN_EMAIL, 'admin email should be normalized');
  assert.equal(okResult.admin.provider, 'cloudflare-access', 'admin provider should be Cloudflare Access');

  const cookieResult = await authenticateAdminRequest(
    createRequest(validToken, 'cookie'),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(cookieResult.ok, true, 'CF_Authorization cookie token should authenticate');

  const bearerResult = await authenticateAdminRequest(
    createRequest(validToken, 'bearer'),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(bearerResult.ok, true, 'Bearer fallback token should authenticate');

  const missingToken = await authenticateAdminRequest(
    createRequest(),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(missingToken.ok, false, 'missing token should fail');
  assert.equal(missingToken.error.code, 'AUTH_REQUIRED', 'missing token should return AUTH_REQUIRED');

  const serviceToken = await signAccessToken(privateKey, {
    sub: 'service-token-subject',
    email: undefined,
    name: undefined,
    identity_nonce: undefined,
    common_name: SERVICE_TOKEN_ID,
    service_token_status: true
  });
  const serviceTokenResult = await authenticateAdminRequest(
    createRequest(serviceToken, 'raw-header'),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(serviceTokenResult.ok, true, 'allowlisted service token should authenticate');
  assert.equal(serviceTokenResult.admin.email, `service-token:${SERVICE_TOKEN_ID}`, 'service token admin email should be synthetic');
  assert.equal(serviceTokenResult.admin.provider, 'cloudflare-access-service-token', 'service token provider should be explicit');
  assert.equal(serviceTokenResult.admin.serviceTokenId, SERVICE_TOKEN_ID, 'service token id should be preserved');

  const forbiddenServiceToken = await signAccessToken(privateKey, {
    sub: 'service-token-subject',
    email: undefined,
    name: undefined,
    identity_nonce: undefined,
    common_name: 'other-service-token.access',
    service_token_status: true
  });
  const forbiddenServiceTokenResult = await authenticateAdminRequest(
    createRequest(forbiddenServiceToken, 'raw-header'),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(forbiddenServiceTokenResult.ok, false, 'non-allowlisted service token should fail');
  assert.equal(forbiddenServiceTokenResult.status, 403, 'non-allowlisted service token should be forbidden');
  assert.equal(forbiddenServiceTokenResult.error.code, 'ADMIN_FORBIDDEN', 'non-allowlisted service token should return ADMIN_FORBIDDEN');

  const forbiddenToken = await signAccessToken(privateKey, { email: 'other@example.com' });
  const forbiddenResult = await authenticateAdminRequest(
    createRequest(forbiddenToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(forbiddenResult.ok, false, 'non-allowlisted email should fail');
  assert.equal(forbiddenResult.status, 403, 'non-allowlisted email should be forbidden');
  assert.equal(forbiddenResult.error.code, 'ADMIN_FORBIDDEN', 'non-allowlisted email should return ADMIN_FORBIDDEN');

  const badAudienceToken = await signAccessToken(privateKey, { aud: ['wrong-audience'] });
  const badAudienceResult = await authenticateAdminRequest(
    createRequest(badAudienceToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(badAudienceResult.ok, false, 'bad audience should fail');
  assert.equal(badAudienceResult.error.code, 'AUTH_INVALID', 'bad audience should return AUTH_INVALID');

  const badIssuerToken = await signAccessToken(privateKey, { iss: 'https://wrong.cloudflareaccess.com' });
  const badIssuerResult = await authenticateAdminRequest(
    createRequest(badIssuerToken),
    createEnv(),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(badIssuerResult.ok, false, 'bad issuer should fail');
  assert.equal(badIssuerResult.error.code, 'AUTH_INVALID', 'bad issuer should return AUTH_INVALID');

  const missingConfigResult = await authenticateAdminRequest(
    createRequest(validToken),
    createEnv({ CF_ACCESS_AUD: '', ADMIN_SERVICE_TOKEN_ALLOWLIST: '' }),
    { fetchImpl, nowMs: NOW_MS }
  );

  assert.equal(missingConfigResult.ok, false, 'missing Cloudflare Access config should fail closed');
  assert.equal(missingConfigResult.status, 500, 'missing Cloudflare Access config should be configuration error');
  assert.equal(missingConfigResult.error.code, 'AUTH_CONFIG_MISSING', 'missing Cloudflare Access config should return AUTH_CONFIG_MISSING');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'cloudflare access jwt signature verification',
      'cf-access-jwt-assertion header',
      'CF_Authorization cookie fallback',
      'Cloudflare Access service token auth',
      'admin email allowlist',
      'admin service token allowlist',
      'missing token rejection',
      'invalid issuer/audience rejection',
      'fail-closed access config'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

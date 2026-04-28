import { strict as assert } from 'node:assert';
import {
  assertPreviewAllowsPublish,
  assertPublishConfirmation,
  buildAccessHeaders,
  buildPublicContentRequest,
  createAdminPublicContentClient,
  hasAccessAuth,
  parseCliArgs,
  runControlledPublicContentPublish
} from './admin-public-content-publish.mjs';

function createJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

async function main() {
  const parsed = parseCliArgs([
    '--file', 'payload.json',
    '--section', 'azkar',
    '--version', 'azkar-2026-04-27-v1',
    '--notes', 'safe preview',
    '--schema-version', 'public-content-v1'
  ]);

  assert.equal(parsed.filePath, 'payload.json', 'file path should parse');
  assert.equal(parsed.section, 'azkar', 'section should parse');
  assert.equal(parsed.version, 'azkar-2026-04-27-v1', 'version should parse');
  assert.equal(parsed.notes, 'safe preview', 'notes should parse');
  assert.equal(parsed.schemaVersion, 'public-content-v1', 'schema version should parse');

  const headers = buildAccessHeaders({
    CF_ACCESS_JWT_ASSERTION: 'jwt-token',
    CF_AUTHORIZATION_COOKIE: '',
    ADMIN_AUTHORIZATION_BEARER: ''
  });
  assert.equal(headers['cf-access-jwt-assertion'], 'jwt-token', 'JWT assertion header should be set');
  assert.equal(headers['content-type'], 'application/json', 'content-type should be JSON');
  assert.equal(hasAccessAuth(headers), true, 'auth headers should be detected');
  assert.equal(hasAccessAuth({ 'content-type': 'application/json' }), false, 'missing auth should be detected');

  const serviceTokenHeaders = buildAccessHeaders({
    CF_ACCESS_CLIENT_ID: 'service-client-id.access',
    CF_ACCESS_CLIENT_SECRET: 'service-client-secret'
  });
  assert.equal(serviceTokenHeaders['cf-access-client-id'], 'service-client-id.access', 'service token client id header should be set');
  assert.equal(serviceTokenHeaders['cf-access-client-secret'], 'service-client-secret', 'service token client secret header should be set');
  assert.equal(hasAccessAuth(serviceTokenHeaders), true, 'service token auth should be detected');
  assert.throws(
    () => buildAccessHeaders({ CF_ACCESS_CLIENT_ID: 'service-client-id.access' }),
    /Both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET/,
    'partial service token auth should fail closed'
  );

  const wrapperRequest = await buildPublicContentRequest({
    filePath: 'payload.json',
    section: '',
    version: '',
    notes: '',
    schemaVersion: ''
  }, {
    async readFile() {
      return JSON.stringify({
        section: 'duas',
        version: 'duas-2026-04-27-v1',
        notes: 'from wrapper',
        payload: { groups: [] }
      });
    }
  });

  assert.equal(wrapperRequest.section, 'duas', 'wrapper section should be used');
  assert.equal(wrapperRequest.version, 'duas-2026-04-27-v1', 'wrapper version should be used');
  assert.equal(wrapperRequest.notes, 'from wrapper', 'wrapper notes should be used');
  assert.deepEqual(wrapperRequest.payload, { groups: [] }, 'wrapper payload should be used');

  const arrayWrapperRequest = await buildPublicContentRequest({
    filePath: 'payload.json',
    section: '',
    version: '',
    notes: '',
    schemaVersion: ''
  }, {
    async readFile() {
      return JSON.stringify({
        section: 'stories',
        version: 'stories-2026-04-27-v3',
        notes: 'array wrapper',
        payload: [{ slug: 'moral-stories', stories: [] }]
      });
    }
  });

  assert.equal(arrayWrapperRequest.section, 'stories', 'array wrapper section should be used');
  assert.equal(arrayWrapperRequest.version, 'stories-2026-04-27-v3', 'array wrapper version should be used');
  assert.equal(arrayWrapperRequest.notes, 'array wrapper', 'array wrapper notes should be used');
  assert.deepEqual(arrayWrapperRequest.payload, [{ slug: 'moral-stories', stories: [] }], 'array wrapper payload should be used');

  const directRequest = await buildPublicContentRequest({
    filePath: 'payload.json',
    section: 'azkar',
    version: 'azkar-2026-04-27-v1',
    notes: 'direct payload',
    schemaVersion: ''
  }, {
    async readFile() {
      return JSON.stringify({ categories: [] });
    }
  });

  assert.equal(directRequest.section, 'azkar', 'CLI section should be used');
  assert.equal(directRequest.version, 'azkar-2026-04-27-v1', 'CLI version should be used');
  assert.deepEqual(directRequest.payload, { categories: [] }, 'direct JSON should be treated as payload');

  const previewData = assertPreviewAllowsPublish({
    ok: true,
    data: {
      valid: true,
      wouldPublish: true,
      version: 'azkar-2026-04-27-v1',
      payloadHash: 'a'.repeat(64),
      blockingReasons: []
    }
  });
  assert.equal(previewData.payloadHash, 'a'.repeat(64), 'preview hash should pass through');

  assert.throws(
    () => assertPreviewAllowsPublish({
      ok: true,
      data: {
        valid: true,
        wouldPublish: false,
        blockingReasons: ['PUBLIC_CONTENT_VERSION_ALREADY_EXISTS']
      }
    }),
    /Preview blocked publish/,
    'blocked preview should throw'
  );

  assert.doesNotThrow(
    () => assertPublishConfirmation({
      publish: true,
      confirmVersion: 'azkar-2026-04-27-v1',
      confirmHash: 'a'.repeat(64)
    }, previewData),
    'matching publish confirmation should pass'
  );

  assert.throws(
    () => assertPublishConfirmation({
      publish: true,
      confirmVersion: 'wrong-version',
      confirmHash: 'a'.repeat(64)
    }, previewData),
    /confirm-version/,
    'wrong confirm version should throw'
  );

  const requests = [];
  const client = createAdminPublicContentClient({
    siteUrl: 'https://example.com/',
    headers: { 'content-type': 'application/json', 'cf-access-jwt-assertion': 'token' },
    async fetchImpl(url, init) {
      requests.push({ url, init });
      return createJsonResponse({ ok: true, data: { endpoint: url } });
    }
  });

  await client.preview({ section: 'azkar' });
  await client.publish({ section: 'azkar' });

  assert.equal(requests.length, 2, 'client should make two requests');
  assert.equal(requests[0].url, 'https://example.com/api/admin/public-content/preview', 'preview URL should be correct');
  assert.equal(requests[1].url, 'https://example.com/api/admin/public-content/publish', 'publish URL should be correct');
  assert.equal(requests[0].init.method, 'POST', 'preview should POST');

  const dryRunFetches = [];
  const dryRun = await runControlledPublicContentPublish([
    '--file', 'payload.json',
    '--section', 'azkar',
    '--version', 'azkar-2026-04-27-v1',
    '--site', 'https://example.com'
  ], {
    CF_ACCESS_CLIENT_ID: 'service-client-id.access',
    CF_ACCESS_CLIENT_SECRET: 'service-client-secret'
  }, {
    async readFile() {
      return JSON.stringify({ categories: [] });
    },
    async fetchImpl(url, init) {
      dryRunFetches.push({ url, init });
      return createJsonResponse({
        ok: true,
        data: {
          dryRun: true,
          valid: true,
          wouldPublish: true,
          sectionId: 'azkar',
          version: 'azkar-2026-04-27-v1',
          payloadHash: 'b'.repeat(64),
          blockingReasons: []
        }
      });
    }
  });

  assert.equal(dryRun.ok, true, 'dry-run should succeed');
  assert.equal(dryRun.published, false, 'dry-run should not publish');
  assert.equal(dryRunFetches.length, 1, 'dry-run should only call preview');
  assert.match(dryRunFetches[0].url, /\/preview$/, 'dry-run should call preview endpoint');
  assert.equal(dryRunFetches[0].init.headers['cf-access-client-id'], 'service-client-id.access', 'dry-run should send service token client id');

  const publishFetches = [];
  const publishRun = await runControlledPublicContentPublish([
    '--file', 'payload.json',
    '--section', 'azkar',
    '--version', 'azkar-2026-04-27-v1',
    '--site', 'https://example.com',
    '--publish',
    '--confirm-version', 'azkar-2026-04-27-v1',
    '--confirm-hash', 'c'.repeat(64)
  ], {
    CF_ACCESS_JWT_ASSERTION: 'token'
  }, {
    async readFile() {
      return JSON.stringify({ categories: [] });
    },
    async fetchImpl(url, init) {
      publishFetches.push({ url, init });
      if (url.endsWith('/preview')) {
        return createJsonResponse({
          ok: true,
          data: {
            dryRun: true,
            valid: true,
            wouldPublish: true,
            sectionId: 'azkar',
            version: 'azkar-2026-04-27-v1',
            payloadHash: 'c'.repeat(64),
            blockingReasons: []
          }
        });
      }

      return createJsonResponse({
        ok: true,
        data: {
          sectionId: 'azkar',
          version: 'azkar-2026-04-27-v1',
          publishedBy: 'admin@example.com'
        }
      }, 201);
    }
  });

  assert.equal(publishRun.ok, true, 'publish run should succeed');
  assert.equal(publishRun.published, true, 'publish run should publish');
  assert.equal(publishFetches.length, 2, 'publish run should call preview then publish');
  assert.match(publishFetches[0].url, /\/preview$/, 'first publish request should be preview');
  assert.match(publishFetches[1].url, /\/publish$/, 'second publish request should be publish');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'CLI argument parsing',
      'Cloudflare Access header selection',
      'Cloudflare Access service token headers',
      'wrapper payload files',
      'array wrapper payload files',
      'direct payload files',
      'preview gate enforcement',
      'double confirmation gate',
      'dry-run only mode',
      'publish mode preview-then-publish ordering'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error('[verify-admin-public-content-tool] Verification failed.');
  console.error(error);
  process.exitCode = 1;
});

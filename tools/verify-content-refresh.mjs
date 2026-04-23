import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(String(key), String(value));
  }

  removeItem(key) {
    this.store.delete(String(key));
  }

  clear() {
    this.store.clear();
  }
}

const remoteVersions = Object.freeze({
  app_config_version: '2026.04.18-app-config',
  azkar_version: '2026.04.18-azkar',
  duas_version: '2026.04.18-duas',
  stories_version: '2026.04.18-stories',
  daily_content_version: '2026.04.18-daily'
});

const remotePayloads = Object.freeze({
  '/api/public/content/app-config': {
    appId: 'dalil-almuslim',
    appNameAr: 'دليل المسلم',
    appNameEn: 'Dalil Almuslim',
    appVersion: '2.1.0',
    schemaVersion: 13
  },
  '/api/public/content/azkar': { categories: [] },
  '/api/public/content/duas': [],
  '/api/public/content/stories': [],
  '/api/public/content/daily-content': { messages: [], ayahs: [] }
});

function buildEnvelope(data) {
  return { ok: true, data, meta: {} };
}

function createFetchStub() {
  return async function fetchStub(input) {
    const url = new URL(typeof input === 'string' ? input : input.url);

    if (url.pathname === '/api/public/versions') {
      return new Response(JSON.stringify(buildEnvelope({ versions: remoteVersions, sections: [] })), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    if (remotePayloads[url.pathname]) {
      return new Response(JSON.stringify(buildEnvelope(remotePayloads[url.pathname])), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    if (url.pathname === '/data/home/home-ayahs.json') {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    return new Response('Not found', { status: 404 });
  };
}

async function main() {
  globalThis.localStorage = new MemoryStorage();
  globalThis.fetch = createFetchStub();

  if (!globalThis.location) {
    Object.defineProperty(globalThis, 'location', {
      value: { origin: 'https://dalil-almuslim.test' },
      configurable: true
    });
  }

  if (!globalThis.navigator) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true
    });
  }

  const contentClient = await import('../js/services/content/content-client.js');
  const { getPublicContentSourceStatus } = await import('../js/services/content/content-source-observability.js');

  await contentClient.primePublicContentFoundation({ forceRemoteSync: true, eager: false, silent: true });

  const beforeRefresh = getPublicContentSourceStatus();
  assert.ok(Number(beforeRefresh.summary?.counts?.stale || 0) >= 2, 'fast foundation should leave at least azkar/daily as stale payload sections');
  assert.equal(beforeRefresh.refresh.status, 'idle', 'manual refresh status should remain idle before explicit refresh');

  const summary = await contentClient.refreshPublicContentFoundation();
  assert.equal(summary.ok, true, 'manual content refresh should complete successfully');

  const afterRefresh = getPublicContentSourceStatus();
  assert.equal(afterRefresh.refresh.status, 'success', 'manual refresh status should be marked as success');
  assert.equal(Number(afterRefresh.summary?.counts?.stale || 0), 0, 'eager refresh should clear stale payload sections');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'stale payload detection after fast foundation',
      'manual refresh status lifecycle',
      'stale sections cleared after eager refresh'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error('[verify-content-refresh] Verification failed.');
  console.error(error);
  process.exitCode = 1;
});

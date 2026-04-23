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

    if (url.pathname === '/api/public/content/app-config') {
      return new Response(JSON.stringify(buildEnvelope({
        appId: 'dalil-almuslim',
        appNameAr: 'دليل المسلم',
        appNameEn: 'Dalil Almuslim',
        appVersion: '2.1.0',
        schemaVersion: 13
      })), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    if (url.pathname === '/api/public/content/azkar') {
      return new Response(JSON.stringify(buildEnvelope({ categories: [] })), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    if (url.pathname === '/api/public/content/duas') {
      return new Response(JSON.stringify(buildEnvelope([])), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    if (url.pathname === '/api/public/content/stories') {
      return new Response(JSON.stringify(buildEnvelope([])), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    if (url.pathname === '/api/public/content/daily-content') {
      return new Response(JSON.stringify(buildEnvelope({ messages: [], ayahs: [] })), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
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

  await contentClient.primePublicContentFoundation({ forceRemoteSync: true, eager: true });

  const snapshot = getPublicContentSourceStatus();
  assert.equal(snapshot.summary.tone, 'healthy', 'content source summary should be healthy after remote sync');
  assert.equal(snapshot.remoteVersions.source, 'remote-network', 'remote versions source should be tracked');
  assert.equal(snapshot.sections.length, 5, 'all content sections should be represented');

  const duas = snapshot.sections.find((entry) => entry.sectionId === 'duas');
  assert.equal(duas?.source, 'remote-cached', 'duas section should report remote-cached source');
  assert.equal(duas?.origin, 'remote', 'duas section should remember remote origin');

  contentClient.getDuasCatalog();
  const afterRead = contentClient.getPublicContentSourceSnapshot();
  const duasAfterRead = afterRead.sections.find((entry) => entry.sectionId === 'duas');
  assert.equal(duasAfterRead?.source, 'cache-reused', 'sync reads should update source to cache-reused');
  assert.equal(duasAfterRead?.origin, 'cache', 'sync reads should expose cache origin');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'remote versions observability',
      'per-section source tracking',
      'cache reuse source updates'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

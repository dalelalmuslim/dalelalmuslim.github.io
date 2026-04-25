import assert from 'node:assert/strict';
import {
  PUBLIC_CONTENT_D1_WRITE_QUERIES,
  writeAndPublishPublicContentDocument
} from '../functions/_shared/public-content-d1.js';

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

class FakeD1Statement {
  constructor(sql) {
    this.sql = normalizeSql(sql);
    this.boundParams = [];
  }

  bind(...params) {
    this.boundParams = params;
    return this;
  }
}

class FakeD1Database {
  constructor() {
    this.batches = [];
  }

  prepare(sql) {
    return new FakeD1Statement(sql);
  }

  async batch(statements) {
    this.batches.push(statements);
    return statements.map(() => ({ success: true }));
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function main() {
  const db = new FakeD1Database();
  const payload = {
    categories: [
      {
        slug: 'admin-test',
        title: 'اختبار إداري',
        azkar: []
      }
    ],
    source: 'admin-test'
  };

  const result = await writeAndPublishPublicContentDocument(db, {
    sectionId: 'azkar',
    version: 'admin-test-azkar-v1',
    payload,
    actor: {
      email: 'Admin@Example.com',
      provider: 'cloudflare-access'
    },
    notes: 'test publish',
    metadata: {
      reason: 'verify-write-helper'
    }
  });

  assert.equal(db.batches.length, 1, 'write helper should execute one D1 batch');
  assert.equal(db.batches[0].length, 3, 'write helper should execute document/publication/audit statements');

  const [documentStatement, publicationStatement, auditStatement] = db.batches[0];

  assert.equal(
    documentStatement.sql,
    normalizeSql(PUBLIC_CONTENT_D1_WRITE_QUERIES.INSERT_CONTENT_DOCUMENT_SQL),
    'first statement should insert content document'
  );

  assert.equal(
    publicationStatement.sql,
    normalizeSql(PUBLIC_CONTENT_D1_WRITE_QUERIES.UPSERT_CONTENT_PUBLICATION_SQL),
    'second statement should publish content version'
  );

  assert.equal(
    auditStatement.sql,
    normalizeSql(PUBLIC_CONTENT_D1_WRITE_QUERIES.INSERT_ADMIN_AUDIT_LOG_SQL),
    'third statement should insert admin audit log'
  );

  const payloadJson = JSON.stringify(payload);
  const expectedHash = await sha256Hex(payloadJson);

  assert.equal(documentStatement.boundParams[0], 'azkar', 'document section should be azkar');
  assert.equal(documentStatement.boundParams[1], 'admin-test-azkar-v1', 'document version should match input');
  assert.equal(documentStatement.boundParams[2], payloadJson, 'document payload JSON should match serialized payload');
  assert.equal(documentStatement.boundParams[3], expectedHash, 'document payload hash should be sha256');
  assert.equal(documentStatement.boundParams[4], 'public-content-v1', 'document schema version should default');
  assert.equal(documentStatement.boundParams[5], 'admin-publish', 'document source kind should default to admin-publish');

  assert.equal(publicationStatement.boundParams[0], 'azkar', 'publication section should be azkar');
  assert.equal(publicationStatement.boundParams[1], 'admin-test-azkar-v1', 'publication version should match input');
  assert.equal(publicationStatement.boundParams[3], 'admin@example.com', 'publication actor email should be normalized');
  assert.equal(publicationStatement.boundParams[4], 'test publish', 'publication notes should match input');

  assert.match(auditStatement.boundParams[0], /^audit_azkar_admin-test-azkar-v1_/, 'audit id should include section/version');
  assert.equal(auditStatement.boundParams[1], 'public_content.publish', 'audit action should be publish');
  assert.equal(auditStatement.boundParams[2], 'azkar', 'audit section should match');
  assert.equal(auditStatement.boundParams[3], 'admin-test-azkar-v1', 'audit version should match');
  assert.equal(auditStatement.boundParams[4], 'admin@example.com', 'audit actor email should be normalized');
  assert.equal(auditStatement.boundParams[5], 'cloudflare-access', 'audit provider should be cloudflare-access');

  const auditMetadata = JSON.parse(auditStatement.boundParams[6]);
  assert.equal(auditMetadata.notes, 'test publish', 'audit metadata should include notes');
  assert.equal(auditMetadata.payloadHash, expectedHash, 'audit metadata should include payload hash');
  assert.equal(auditMetadata.reason, 'verify-write-helper', 'audit metadata should include custom metadata');

  assert.equal(result.sectionId, 'azkar', 'result should include section id');
  assert.equal(result.version, 'admin-test-azkar-v1', 'result should include version');
  assert.equal(result.payloadHash, expectedHash, 'result should include payload hash');
  assert.equal(result.publishedBy, 'admin@example.com', 'result should include normalized publisher');

  await assert.rejects(
    () => writeAndPublishPublicContentDocument(db, {
      sectionId: 'unknown',
      version: 'v1',
      payload,
      actor: { email: 'admin@example.com' }
    }),
    /Unknown public content section/,
    'unknown section should be rejected'
  );

  await assert.rejects(
    () => writeAndPublishPublicContentDocument(db, {
      sectionId: 'azkar',
      version: '',
      payload,
      actor: { email: 'admin@example.com' }
    }),
    /Content version is required/,
    'empty version should be rejected'
  );

  await assert.rejects(
    () => writeAndPublishPublicContentDocument(db, {
      sectionId: 'azkar',
      version: 'v1',
      payloadJson: '{bad json',
      actor: { email: 'admin@example.com' }
    }),
    SyntaxError,
    'invalid JSON payload should be rejected'
  );

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'document insert statement',
      'publication upsert statement',
      'admin audit insert statement',
      'payload sha256 hash',
      'actor normalization',
      'invalid section rejection',
      'invalid version rejection',
      'invalid json rejection'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

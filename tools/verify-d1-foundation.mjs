import fs from 'node:fs';
import { onRequest as onVersionsRequest } from '../functions/api/public/versions.js';
import { onRequest as onAzkarRequest } from '../functions/api/public/content/azkar.js';
import { PUBLIC_CONTENT_D1_QUERIES } from '../functions/_shared/public-content-d1.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function exists(filePath) {
    return fs.existsSync(new URL(`../${filePath}`, import.meta.url));
}

function createContext(pathname, env = {}, method = 'GET') {
    return {
        env,
        request: new Request(`https://dalil-almuslim.test${pathname}`, { method })
    };
}

async function readJsonResponse(response) {
    const bodyText = await response.text();
    return bodyText ? JSON.parse(bodyText) : null;
}

class FakeD1Statement {
    constructor(sql, rows) {
        this.sql = sql.replace(/\s+/g, ' ').trim();
        this.rows = rows;
        this.boundParams = [];
    }

    bind(...params) {
        this.boundParams = params;
        return this;
    }

    async all() {
        if (this.sql === PUBLIC_CONTENT_D1_QUERIES.SELECT_PUBLISHED_ROWS_SQL.replace(/\s+/g, ' ').trim()) {
            return {
                results: this.rows.map((row) => ({
                    section_id: row.section_id,
                    version: row.version,
                    published_at: row.published_at
                }))
            };
        }

        throw new Error(`Unexpected D1 all() query: ${this.sql}`);
    }

    async first() {
        if (this.sql === PUBLIC_CONTENT_D1_QUERIES.SELECT_PUBLISHED_SECTION_SQL.replace(/\s+/g, ' ').trim()) {
            const [sectionId] = this.boundParams;
            return this.rows.find((row) => row.section_id === sectionId) || null;
        }

        throw new Error(`Unexpected D1 first() query: ${this.sql}`);
    }
}

class FakeD1Database {
    constructor(rows) {
        this.rows = rows;
    }

    prepare(sql) {
        return new FakeD1Statement(sql, this.rows);
    }
}

async function main() {
    assert(exists('d1/migrations/0001_public_content_schema.sql'), 'D1 schema migration must exist');
    assert(exists('d1/seed/public-content.seed.json'), 'D1 seed JSON must exist');
    assert(exists('d1/seed/0001_public_content_seed.sql'), 'D1 seed SQL must exist');
    assert(exists('functions/_shared/public-content-d1.js'), 'D1 repository helper must exist');
    assert(exists('functions/_shared/public-content-local.js'), 'Local repository helper must exist');

    const fakeRows = [
        {
            section_id: 'azkar',
            version: 'd1-azkar-v2',
            published_at: '2026-04-18T10:00:00.000Z',
            payload_json: JSON.stringify({
                categories: [{ slug: 'morning', title: 'أذكار الصباح', azkar: [] }],
                source: 'd1-seed'
            }),
            payload_hash: 'hash-azkar',
            schema_version: 'public-content-v1',
            source_kind: 'seed-import'
        },
        {
            section_id: 'duas',
            version: 'd1-duas-v2',
            published_at: '2026-04-18T10:00:00.000Z',
            payload_json: JSON.stringify([]),
            payload_hash: 'hash-duas',
            schema_version: 'public-content-v1',
            source_kind: 'seed-import'
        }
    ];

    const env = {
        PUBLIC_CONTENT_DB: new FakeD1Database(fakeRows)
    };

    const versionsResponse = await onVersionsRequest(createContext('/api/public/versions', env));
    const versionsJson = await readJsonResponse(versionsResponse);
    assert(versionsResponse.status === 200, 'versions endpoint should return HTTP 200 with D1 binding');
    assert(versionsJson?.data?.versions?.azkar_version === 'd1-azkar-v2', 'versions endpoint should read azkar version from D1');
    assert(versionsResponse.headers.get('x-public-content-store') === 'd1', 'versions endpoint should expose D1 store header');

    const azkarResponse = await onAzkarRequest(createContext('/api/public/content/azkar', env));
    const azkarJson = await readJsonResponse(azkarResponse);
    assert(azkarResponse.status === 200, 'azkar endpoint should return HTTP 200 with D1 binding');
    assert(azkarJson?.data?.source === 'd1-seed', 'azkar endpoint should return D1 payload');
    assert(azkarResponse.headers.get('x-public-content-store') === 'd1', 'azkar endpoint should expose D1 store header');
    assert(azkarResponse.headers.get('x-public-content-version') === 'd1-azkar-v2', 'azkar endpoint should expose D1 version header');

    console.log(JSON.stringify({
        ok: true,
        checkedFiles: [
            'd1/migrations/0001_public_content_schema.sql',
            'd1/seed/public-content.seed.json',
            'd1/seed/0001_public_content_seed.sql'
        ],
        checkedEndpoints: [
            '/api/public/versions',
            '/api/public/content/azkar'
        ]
    }, null, 2));
}

main().catch((error) => {
    console.error('[verify-d1-foundation] Verification failed.');
    console.error(error);
    process.exitCode = 1;
});

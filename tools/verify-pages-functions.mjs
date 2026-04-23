import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest as onHealthRequest } from '../functions/api/health.js';
import { onRequest as onVersionsRequest } from '../functions/api/public/versions.js';
import { onRequest as onAppConfigRequest } from '../functions/api/public/content/app-config.js';
import { onRequest as onAzkarRequest } from '../functions/api/public/content/azkar.js';
import { onRequest as onDuasRequest } from '../functions/api/public/content/duas.js';
import { onRequest as onStoriesRequest } from '../functions/api/public/content/stories.js';
import { onRequest as onDailyContentRequest } from '../functions/api/public/content/daily-content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const ayahsJsonPath = path.join(rootDir, 'data/home/home-ayahs.json');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createContext(pathname, method = 'GET') {
    return {
        request: new Request(`https://dalil-almuslim.test${pathname}`, { method })
    };
}

async function readJsonResponse(response) {
    const bodyText = await response.text();
    return bodyText ? JSON.parse(bodyText) : null;
}

async function createAyahsFetchStub() {
    const ayahsPayload = await fs.readFile(ayahsJsonPath, 'utf8');
    return async function fetchStub(input) {
        const url = new URL(typeof input === 'string' ? input : input.url);
        if (url.pathname === '/data/home/home-ayahs.json') {
            return new Response(ayahsPayload, {
                status: 200,
                headers: {
                    'content-type': 'application/json; charset=utf-8'
                }
            });
        }

        return new Response(null, { status: 404 });
    };
}

async function main() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = await createAyahsFetchStub();

    try {
        const healthResponse = await onHealthRequest(createContext('/api/health'));
        assert(healthResponse.status === 200, 'health endpoint should return HTTP 200');

        const versionsResponse = await onVersionsRequest(createContext('/api/public/versions'));
        const versionsJson = await readJsonResponse(versionsResponse);
        assert(versionsResponse.status === 200, 'versions endpoint should return HTTP 200');
        assert(versionsJson?.ok === true, 'versions endpoint should return ok=true');
        assert(Array.isArray(versionsJson?.data?.sections), 'versions endpoint should return sections array');
        assert(typeof versionsJson?.data?.versions?.azkar_version === 'string', 'versions endpoint should return azkar version');

        const versionsHeadResponse = await onVersionsRequest(createContext('/api/public/versions', 'HEAD'));
        assert(versionsHeadResponse.status === 200, 'versions HEAD should return HTTP 200');
        assert((await versionsHeadResponse.text()) === '', 'versions HEAD should not return a body');

        const versionsPostResponse = await onVersionsRequest(createContext('/api/public/versions', 'POST'));
        assert(versionsPostResponse.status === 405, 'versions POST should return HTTP 405');

        const appConfigResponse = await onAppConfigRequest(createContext('/api/public/content/app-config'));
        const appConfigJson = await readJsonResponse(appConfigResponse);
        assert(appConfigResponse.status === 200, 'app-config endpoint should return HTTP 200');
        assert(appConfigJson?.data?.appId === 'dalil-almuslim', 'app-config endpoint should return app config payload');

        const azkarResponse = await onAzkarRequest(createContext('/api/public/content/azkar'));
        const azkarJson = await readJsonResponse(azkarResponse);
        assert(azkarResponse.status === 200, 'azkar endpoint should return HTTP 200');
        assert(Array.isArray(azkarJson?.data?.categories), 'azkar endpoint should return categories array');

        const duasResponse = await onDuasRequest(createContext('/api/public/content/duas'));
        const duasJson = await readJsonResponse(duasResponse);
        assert(duasResponse.status === 200, 'duas endpoint should return HTTP 200');
        assert(Array.isArray(duasJson?.data), 'duas endpoint should return categories list');

        const storiesResponse = await onStoriesRequest(createContext('/api/public/content/stories'));
        const storiesJson = await readJsonResponse(storiesResponse);
        assert(storiesResponse.status === 200, 'stories endpoint should return HTTP 200');
        assert(Array.isArray(storiesJson?.data), 'stories endpoint should return categories list');

        const dailyContentResponse = await onDailyContentRequest(createContext('/api/public/content/daily-content'));
        const dailyContentJson = await readJsonResponse(dailyContentResponse);
        assert(dailyContentResponse.status === 200, 'daily-content endpoint should return HTTP 200');
        assert(Array.isArray(dailyContentJson?.data?.messages), 'daily-content endpoint should return messages array');
        assert(Array.isArray(dailyContentJson?.data?.ayahs), 'daily-content endpoint should return ayahs array');

        console.log(JSON.stringify({
            ok: true,
            checkedEndpoints: [
                '/api/health',
                '/api/public/versions',
                '/api/public/content/app-config',
                '/api/public/content/azkar',
                '/api/public/content/duas',
                '/api/public/content/stories',
                '/api/public/content/daily-content'
            ]
        }, null, 2));
    } finally {
        globalThis.fetch = originalFetch;
    }
}

main().catch((error) => {
    console.error('[verify-pages-functions] Verification failed.');
    console.error(error);
    process.exitCode = 1;
});

import { APP_CONFIG } from '../../js/app/app-config.js';
import {
    getDailyMessages,
    getDuasCatalog,
    getPublicVersions,
    getStoriesCatalog,
    getAzkarCatalog
} from '../../js/services/content/content-provider-local.js';
import { getPublicContentVersionSnapshot } from '../../js/shared/contracts/public-content-manifest.js';

function createAppConfigPayload() {
    return {
        appId: APP_CONFIG.APP_ID,
        appNameAr: APP_CONFIG.APP_NAME_AR,
        appNameEn: APP_CONFIG.APP_NAME_EN,
        appVersion: APP_CONFIG.APP_VERSION,
        schemaVersion: APP_CONFIG.SCHEMA_VERSION
    };
}

export async function loadDailyAyahsFromAsset(request, fetchImpl = globalThis.fetch?.bind(globalThis)) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('Global fetch is unavailable while resolving daily ayahs payload.');
    }

    const assetUrl = new URL('/data/home/home-ayahs.json', request.url);
    const response = await fetchImpl(assetUrl.toString(), {
        headers: {
            accept: 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to load daily ayahs asset: ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
}

export async function resolveLocalSectionPayload(sectionId, request) {
    switch (sectionId) {
        case 'app_config':
            return createAppConfigPayload();
        case 'azkar':
            return getAzkarCatalog();
        case 'duas':
            return getDuasCatalog();
        case 'stories':
            return getStoriesCatalog();
        case 'daily_content':
            return {
                messages: getDailyMessages(),
                ayahs: await loadDailyAyahsFromAsset(request)
            };
        default:
            return null;
    }
}

export function getLocalPublicVersionSnapshot() {
    return getPublicVersions?.() || getPublicContentVersionSnapshot();
}

export async function getLocalPublicSection(sectionId, request) {
    const payload = await resolveLocalSectionPayload(sectionId, request);
    if (payload === null || payload === undefined) {
        return null;
    }

    const versions = getLocalPublicVersionSnapshot();
    return {
        source: 'local',
        sectionId,
        version: versions?.[`${sectionId}_version`] || versions?.[sectionId] || '',
        payload,
        publishedAt: null,
        schemaVersion: 'local-static-v1',
        payloadHash: ''
    };
}

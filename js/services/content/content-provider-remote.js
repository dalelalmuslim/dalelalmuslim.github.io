import { APP_CONFIG } from '../../app/app-config.js';
import {
    getPublicContentSectionById,
    listPublicContentSections
} from '../../shared/contracts/public-content-manifest.js';

const DEFAULT_TIMEOUT_MS = 3500;
const FALLBACK_ORIGIN = 'https://dalil-almuslim.local';

function canUseFetch() {
    return typeof globalThis.fetch === 'function';
}

function resolveBaseOrigin() {
    if (typeof globalThis.location?.origin === 'string' && globalThis.location.origin) {
        return globalThis.location.origin;
    }

    return FALLBACK_ORIGIN;
}

function normalizeBasePath(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const safe = value.trim();
    if (!safe) {
        return '';
    }

    return safe.endsWith('/') ? safe.slice(0, -1) : safe;
}

function resolveEndpointUrl(pathname) {
    const basePath = normalizeBasePath(APP_CONFIG.PUBLIC_CONTENT_API?.BASE_PATH || '');
    const relativePath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const finalPath = `${basePath}${relativePath}`;
    return new URL(finalPath, resolveBaseOrigin()).toString();
}

function createTimeoutController(timeoutMs) {
    if (typeof AbortController !== 'function') {
        return {
            signal: undefined,
            cancel: () => undefined
        };
    }

    const controller = new AbortController();
    const timeoutId = typeof globalThis.setTimeout === 'function'
        ? globalThis.setTimeout(() => controller.abort(new Error('Request timeout exceeded')), timeoutMs)
        : null;

    return {
        signal: controller.signal,
        cancel: () => {
            if (timeoutId !== null && typeof globalThis.clearTimeout === 'function') {
                globalThis.clearTimeout(timeoutId);
            }
        }
    };
}

async function parseJsonResponse(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, cache?: RequestCache }} [options]
 */
async function requestJsonEnvelope(url, options = {}) {
    if (!canUseFetch()) {
        throw new Error('Global fetch is unavailable for public content requests.');
    }

    const timeoutMs = Number(options.timeoutMs) > 0
        ? Number(options.timeoutMs)
        : Number(APP_CONFIG.PUBLIC_CONTENT_API?.TIMEOUT_MS) > 0
            ? Number(APP_CONFIG.PUBLIC_CONTENT_API.TIMEOUT_MS)
            : DEFAULT_TIMEOUT_MS;

    const controller = createTimeoutController(timeoutMs);

    try {
        const response = await globalThis.fetch(url, {
            method: 'GET',
            cache: options.cache || 'no-store',
            headers: {
                accept: 'application/json'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Public content request failed with HTTP ${response.status}`);
        }

        const payload = await parseJsonResponse(response);
        if (!payload || payload.ok !== true) {
            throw new Error('Public content response envelope is invalid.');
        }

        return payload;
    } finally {
        controller.cancel();
    }
}

export function isRemoteContentApiEnabled() {
    return Boolean(APP_CONFIG.PUBLIC_CONTENT_API?.ENABLED) && canUseFetch();
}

export function getRemotePublicContentEndpoints() {
    return listPublicContentSections().reduce((acc, section) => {
        acc[section.id] = resolveEndpointUrl(section.endpoint);
        return acc;
    }, {
        versions: resolveEndpointUrl(APP_CONFIG.PUBLIC_CONTENT_API?.VERSIONS_ENDPOINT || '/api/public/versions')
    });
}

export async function fetchRemotePublicVersions() {
    const envelope = await requestJsonEnvelope(
        resolveEndpointUrl(APP_CONFIG.PUBLIC_CONTENT_API?.VERSIONS_ENDPOINT || '/api/public/versions'),
        {
            timeoutMs: APP_CONFIG.PUBLIC_CONTENT_API?.VERSIONS_TIMEOUT_MS,
            cache: 'no-store'
        }
    );

    return {
        versions: envelope?.data?.versions || null,
        sections: Array.isArray(envelope?.data?.sections) ? envelope.data.sections : []
    };
}

export async function fetchRemotePublicSection(sectionId) {
    const section = getPublicContentSectionById(sectionId);
    if (!section) {
        throw new Error(`Unknown public content section: ${sectionId}`);
    }

    const envelope = await requestJsonEnvelope(resolveEndpointUrl(section.endpoint), {
        timeoutMs: APP_CONFIG.PUBLIC_CONTENT_API?.SECTION_TIMEOUT_MS,
        cache: 'no-store'
    });

    return {
        section,
        payload: envelope?.data ?? null,
        meta: envelope?.meta ?? null
    };
}

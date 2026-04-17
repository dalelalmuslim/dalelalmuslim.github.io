import { APP_CONFIG } from '../../app/app-config.js';
import { getJSONStorageItem, removeStorageItem, setJSONStorageItem } from '../platform/browser-storage.js';
import { getContentSectionDefinition } from '../../shared/contracts/content-sections.js';

function getSectionCacheKey(sectionId) {
    const section = getContentSectionDefinition(sectionId);
    const safeSectionId = section?.cacheKey || String(sectionId || '').trim();
    return safeSectionId ? `${APP_CONFIG.CONTENT_CACHE_NAMESPACE}:${safeSectionId}` : '';
}

export function getCachedSectionSnapshot(sectionId) {
    const key = getSectionCacheKey(sectionId);
    if (!key) return null;

    const snapshot = getJSONStorageItem(key, null);
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
}

/**
 * @template T
 * @param {string} sectionId
 * @param {string} [expectedVersion='']
 * @param {(payload: unknown) => payload is T} [validator]
 * @returns {T | null}
 */
export function getCachedSectionPayload(sectionId, expectedVersion = '', validator) {
    const snapshot = getCachedSectionSnapshot(sectionId);
    if (!snapshot || typeof snapshot !== 'object') {
        return null;
    }

    if (expectedVersion && String(snapshot.version || '') !== String(expectedVersion)) {
        return null;
    }

    const payload = snapshot.payload ?? null;
    if (typeof validator === 'function' && !validator(payload)) {
        return null;
    }

    return /** @type {T | null} */ (payload);
}

export function setCachedSectionSnapshot(sectionId, version, payload) {
    const key = getSectionCacheKey(sectionId);
    if (!key) return false;

    return setJSONStorageItem(key, {
        sectionId,
        version: String(version || ''),
        payload: payload ?? null,
        cachedAt: new Date().toISOString()
    });
}

export function clearCachedSectionSnapshot(sectionId) {
    const key = getSectionCacheKey(sectionId);
    if (!key) return false;
    return removeStorageItem(key);
}

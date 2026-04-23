import '../../shared/contracts/content-types.js';
import { APP_CONFIG } from '../../app/app-config.js';
import { appLogger } from '../../shared/logging/app-logger.js';
import {
    CONTENT_CACHE_MODES,
    CONTENT_SECTION_IDS,
    getContentSectionDefinition,
    listContentSections
} from '../../shared/contracts/content-sections.js';
import { getAzkarManifestEntryByKey, resolveAzkarSlug } from '../../../data/azkar/categories/manifest.js';
import { getDuaManifestEntryByKey, resolveDuaSlug } from '../../../data/duas/manifest.js';
import { getStoryManifestEntryByKey, resolveStoryCategorySlug } from '../../../data/stories/manifest.js';
import * as sectionCache from '../cache/section-cache.js';
import * as sectionVersions from '../versions/section-version-store.js';
import * as localContentProvider from './content-provider-local.js';
import {
    fetchRemotePublicSection,
    fetchRemotePublicVersions,
    getRemotePublicContentEndpoints,
    isRemoteContentApiEnabled
} from './content-provider-remote.js';
import {
    getPublicContentSourceStatus,
    recordContentRefreshStatus,
    recordPublicContentFoundationSummary,
    recordRemoteVersionsStatus,
    recordSectionSourceStatus,
    subscribePublicContentSourceStatus
} from './content-source-observability.js';

let foundationWarmupScheduled = false;
let remoteVersionsInflight = null;
let remoteVersionsState = {
    status: 'idle',
    snapshot: null,
    syncedAt: null,
    error: null
};
const remoteSectionInflight = new Map();


/**
 * @typedef {'payload-cached' | 'version-synced' | 'cache-reused' | 'cache-skip' | 'remote-cached' | 'remote-fallback-local' | 'failed'} ContentFoundationStatus
 */

/**
 * @typedef {{ sectionId: string, version: string, status: ContentFoundationStatus, message?: string | null, usedRemote: boolean }} ContentFoundationRuntimeResult
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canAttemptRemoteSync() {
    if (!isRemoteContentApiEnabled()) {
        return false;
    }

    if (typeof globalThis.navigator?.onLine === 'boolean') {
        return globalThis.navigator.onLine;
    }

    return true;
}

function getVersionPayload() {
    return sectionVersions.getStoredSectionVersions();
}

function getDefaultSectionVersion(sectionId) {
    return String(APP_CONFIG.CONTENT_DEFAULT_VERSIONS[sectionId] || '');
}

function getSectionVersion(sectionId, versions = getVersionPayload()) {
    const definition = getContentSectionDefinition(sectionId);
    if (!definition) {
        return getDefaultSectionVersion(sectionId);
    }

    const version = versions?.[definition.versionKey];
    if (typeof version === 'string' && version.trim()) {
        return version;
    }

    return getDefaultSectionVersion(definition.id);
}

function createAppConfigSnapshot() {
    return {
        appId: APP_CONFIG.APP_ID,
        appNameAr: APP_CONFIG.APP_NAME_AR,
        appNameEn: APP_CONFIG.APP_NAME_EN,
        appVersion: APP_CONFIG.APP_VERSION,
        schemaVersion: APP_CONFIG.SCHEMA_VERSION
    };
}

/**
 * @param {unknown} payload
 * @returns {payload is { appId: string, appNameAr: string, appNameEn: string, appVersion: string, schemaVersion: number }}
 */
function isValidAppConfigSnapshot(payload) {
    return isPlainObject(payload)
        && typeof payload.appId === 'string'
        && typeof payload.appNameAr === 'string'
        && typeof payload.appVersion === 'string';
}

/**
 * @param {unknown} payload
 * @returns {payload is { categories: unknown[] }}
 */
function isValidAzkarCatalog(payload) {
    return isPlainObject(payload) && Array.isArray(payload.categories);
}

/**
 * @param {unknown} payload
 * @returns {payload is unknown[]}
 */
function isValidDuasCatalog(payload) {
    return Array.isArray(payload);
}

/**
 * @param {unknown} payload
 * @returns {payload is unknown[]}
 */
function isValidStoriesCatalog(payload) {
    return Array.isArray(payload);
}

/**
 * @param {unknown} payload
 * @returns {payload is { messages: { id: number, message: string }[], ayahs: unknown[] }}
 */
function isValidDailyContent(payload) {
    return isPlainObject(payload)
        && Array.isArray(payload.messages)
        && payload.messages.every((entry) => isPlainObject(entry) && Number.isFinite(Number(entry.id)) && typeof entry.message === 'string')
        && Array.isArray(payload.ayahs);
}

/**
 * @template T
 * @param {string} sectionId
 * @param {string} version
 * @param {(payload: unknown) => payload is T} validator
 * @returns {T | null}
 */
function readFreshCachedPayload(sectionId, version, validator) {
    return sectionCache.getCachedSectionPayload(sectionId, version, validator);
}

function rememberSectionVersion(sectionId, version) {
    sectionVersions.setStoredSectionVersion(sectionId, version);
}

function persistPayloadSnapshot(sectionId, version, payload) {
    rememberSectionVersion(sectionId, version);
    return sectionCache.setCachedSectionSnapshot(sectionId, version, payload);
}

function getCachedSectionVersion(sectionId) {
    const snapshot = sectionCache.getCachedSectionSnapshot(sectionId);
    return typeof snapshot?.version === 'string' ? snapshot.version : '';
}

function getRemoteKnownSectionVersion(sectionId) {
    if (!isPlainObject(remoteVersionsState.snapshot)) {
        return '';
    }

    return getSectionVersion(sectionId, remoteVersionsState.snapshot);
}

function resolveSectionFreshness(sectionId, explicitVersion = '') {
    const definition = getContentSectionDefinition(sectionId);
    const currentVersion = explicitVersion || getSectionVersion(sectionId);
    const cachedVersion = getCachedSectionVersion(sectionId);
    const remoteVersion = getRemoteKnownSectionVersion(sectionId);
    const cacheMode = definition?.cacheMode || CONTENT_CACHE_MODES.VERSION_ONLY;

    let stale = false;
    let staleReason = '';

    if (cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        if (currentVersion && !cachedVersion) {
            stale = true;
            staleReason = 'missing-payload-cache';
        } else if (currentVersion && cachedVersion && cachedVersion !== currentVersion) {
            stale = true;
            staleReason = 'cached-version-mismatch';
        }

        if (!stale && remoteVersionsState.status === 'resolved' && remoteVersion) {
            if (currentVersion && currentVersion !== remoteVersion) {
                stale = true;
                staleReason = 'stored-version-mismatch';
            } else if (!cachedVersion) {
                stale = true;
                staleReason = 'missing-remote-payload';
            } else if (cachedVersion !== remoteVersion) {
                stale = true;
                staleReason = 'remote-version-mismatch';
            }
        }
    }

    return {
        cachedVersion,
        remoteVersion,
        stale,
        staleReason
    };
}

function recordSectionObservability(sectionId, source, options = {}) {
    const safeVersion = typeof options.version === 'string' ? options.version : getSectionVersion(sectionId);
    const freshness = resolveSectionFreshness(sectionId, safeVersion);

    return recordSectionSourceStatus(sectionId, {
        version: safeVersion,
        source,
        origin: options.origin,
        message: typeof options.message === 'string' ? options.message : '',
        error: typeof options.error === 'string' ? options.error : '',
        pending: Boolean(options.pending),
        usedRemote: Boolean(options.usedRemote),
        updatedAt: options.updatedAt || new Date().toISOString(),
        remoteVersionSource: typeof options.remoteVersionSource === 'string' ? options.remoteVersionSource : '',
        remoteVersionError: typeof options.remoteVersionError === 'string' ? options.remoteVersionError : '',
        cachedVersion: typeof options.cachedVersion === 'string' ? options.cachedVersion : freshness.cachedVersion,
        remoteVersion: typeof options.remoteVersion === 'string' ? options.remoteVersion : freshness.remoteVersion,
        stale: typeof options.stale === 'boolean' ? options.stale : freshness.stale,
        staleReason: typeof options.staleReason === 'string' ? options.staleReason : freshness.staleReason
    });
}

/**
 * @param {unknown} _payload
 * @returns {_payload is never}
 */
function isNeverPayload(_payload) {
    return false;
}

function clearRemoteSyncError() {
    remoteVersionsState = {
        ...remoteVersionsState,
        error: null
    };

    recordRemoteVersionsStatus({
        status: remoteVersionsState.status,
        source: 'remote-memory',
        syncedAt: remoteVersionsState.syncedAt,
        error: '',
        sections: []
    });
}

function setRemoteVersionSnapshot(snapshot) {
    remoteVersionsState = {
        status: 'resolved',
        snapshot,
        syncedAt: new Date().toISOString(),
        error: null
    };

    recordRemoteVersionsStatus({
        status: 'resolved',
        source: 'remote-network',
        syncedAt: remoteVersionsState.syncedAt,
        error: '',
        sections: []
    });
}

function setRemoteVersionError(error) {
    remoteVersionsState = {
        ...remoteVersionsState,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error || 'Unknown remote versions failure')
    };

    recordRemoteVersionsStatus({
        status: 'failed',
        source: 'local-fallback',
        syncedAt: new Date().toISOString(),
        error: remoteVersionsState.error,
        sections: []
    });
}

async function syncRemoteVersions(options = {}) {
    if (!canAttemptRemoteSync()) {
        recordRemoteVersionsStatus({
            status: typeof globalThis.navigator?.onLine === 'boolean' && globalThis.navigator.onLine === false ? 'idle' : 'disabled',
            source: 'local',
            syncedAt: new Date().toISOString(),
            error: '',
            sections: []
        });

        return {
            ok: false,
            source: 'local',
            versions: getVersionPayload(),
            sections: []
        };
    }

    if (!options.force && remoteVersionsState.status === 'resolved' && remoteVersionsState.snapshot) {
        recordRemoteVersionsStatus({
            status: 'resolved',
            source: 'remote-memory',
            syncedAt: remoteVersionsState.syncedAt,
            error: '',
            sections: []
        });

        return {
            ok: true,
            source: 'remote-memory',
            versions: remoteVersionsState.snapshot,
            sections: []
        };
    }

    if (!options.force && remoteVersionsInflight) {
        return remoteVersionsInflight;
    }

    remoteVersionsInflight = (async () => {
        try {
            const response = await fetchRemotePublicVersions();
            const snapshot = response?.versions;
            if (!isPlainObject(snapshot)) {
                throw new Error('Remote public versions payload is invalid.');
            }

            setRemoteVersionSnapshot(snapshot);
            return {
                ok: true,
                source: 'remote-network',
                versions: snapshot,
                sections: Array.isArray(response?.sections) ? response.sections : []
            };
        } catch (error) {
            setRemoteVersionError(error);
            appLogger.warn('[ContentClient] Remote versions sync failed, falling back to stored/local versions.', error);
            return {
                ok: false,
                source: 'local-fallback',
                versions: getVersionPayload(),
                sections: []
            };
        } finally {
            remoteVersionsInflight = null;
        }
    })();

    return remoteVersionsInflight;
}

function getSectionValidator(sectionId) {
    switch (sectionId) {
        case CONTENT_SECTION_IDS.APP_CONFIG:
            return isValidAppConfigSnapshot;
        case CONTENT_SECTION_IDS.AZKAR:
            return isValidAzkarCatalog;
        case CONTENT_SECTION_IDS.DUAS:
            return isValidDuasCatalog;
        case CONTENT_SECTION_IDS.STORIES:
            return isValidStoriesCatalog;
        case CONTENT_SECTION_IDS.DAILY_CONTENT:
            return isValidDailyContent;
        default:
            return isNeverPayload;
    }
}

function getSectionLocalLoader(sectionId) {
    switch (sectionId) {
        case CONTENT_SECTION_IDS.APP_CONFIG:
            return () => createAppConfigSnapshot();
        case CONTENT_SECTION_IDS.AZKAR:
            return () => localContentProvider.getAzkarCatalog();
        case CONTENT_SECTION_IDS.DUAS:
            return () => localContentProvider.getDuasCatalog();
        case CONTENT_SECTION_IDS.STORIES:
            return () => localContentProvider.getStoriesCatalog();
        case CONTENT_SECTION_IDS.DAILY_CONTENT:
            return () => localContentProvider.getDailyContent();
        default:
            return null;
    }
}

/**
 * @template T
 * @param {string} sectionId
 * @param {string} targetVersion
 * @param {(payload: unknown) => payload is T} validator
 * @param {() => T | Promise<T>} loader
 * @returns {Promise<ContentFoundationRuntimeResult>}
 */
async function prepareSectionFoundation(sectionId, targetVersion, validator, loader) {
    const definition = getContentSectionDefinition(sectionId);
    const storedVersion = sectionVersions.getStoredSectionVersion(sectionId);
    const cachedTargetPayload = readFreshCachedPayload(sectionId, targetVersion, validator);

    if (cachedTargetPayload) {
        rememberSectionVersion(sectionId, targetVersion);
        recordSectionObservability(sectionId, 'cache-reused', {
            version: targetVersion,
            origin: 'cache',
            usedRemote: targetVersion !== storedVersion,
            remoteVersionSource: remoteVersionsState.status,
            remoteVersionError: remoteVersionsState.error || ''
        });
        return {
            sectionId,
            version: targetVersion,
            status: 'cache-reused',
            message: null,
            usedRemote: targetVersion !== storedVersion
        };
    }

    if (canAttemptRemoteSync() && targetVersion && definition?.cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        if (remoteSectionInflight.has(sectionId)) {
            return remoteSectionInflight.get(sectionId);
        }

        recordSectionObservability(sectionId, 'pending', {
            version: targetVersion,
            origin: storedVersion === targetVersion ? 'cache' : 'local',
            message: 'جاري مزامنة payload من الـ API.',
            pending: true,
            usedRemote: false,
            remoteVersionSource: 'remote-network'
        });

        /** @type {Promise<ContentFoundationRuntimeResult>} */
        const remoteTask = (async () => {
            try {
                const response = await fetchRemotePublicSection(sectionId);
                if (validator(response?.payload)) {
                    persistPayloadSnapshot(sectionId, targetVersion, response.payload);
                    clearRemoteSyncError();
                    recordSectionObservability(sectionId, 'remote-cached', {
                        version: targetVersion,
                        origin: 'remote',
                        usedRemote: true,
                        remoteVersionSource: 'remote-network'
                    });
                    return {
                        sectionId,
                        version: targetVersion,
                        status: 'remote-cached',
                        message: null,
                        usedRemote: true
                    };
                }

                throw new Error(`Remote payload validation failed for section ${sectionId}.`);
            } catch (error) {
                appLogger.warn(`[ContentClient] Remote section sync failed for ${sectionId}, using local fallback.`, error);
                const fallbackPayload = await loader();
                const fallbackVersion = storedVersion || getDefaultSectionVersion(sectionId);
                if (validator(fallbackPayload) && definition?.cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
                    persistPayloadSnapshot(sectionId, fallbackVersion, fallbackPayload);
                } else {
                    rememberSectionVersion(sectionId, fallbackVersion);
                }

                recordSectionObservability(sectionId, 'remote-fallback-local', {
                    version: fallbackVersion,
                    origin: 'local',
                    message: error instanceof Error ? error.message : 'Remote section sync failed.',
                    error: error instanceof Error ? error.message : 'Remote section sync failed.',
                    usedRemote: false,
                    remoteVersionSource: 'local-fallback',
                    remoteVersionError: error instanceof Error ? error.message : 'Remote section sync failed.'
                });

                return {
                    sectionId,
                    version: fallbackVersion,
                    status: 'remote-fallback-local',
                    message: error instanceof Error ? error.message : 'Remote section sync failed.',
                    usedRemote: false
                };
            } finally {
                remoteSectionInflight.delete(sectionId);
            }
        })();

        remoteSectionInflight.set(sectionId, remoteTask);
        return remoteTask;
    }

    const fallbackPayload = await loader();
    const fallbackVersion = storedVersion || getDefaultSectionVersion(sectionId);
    if (validator(fallbackPayload) && definition?.cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        persistPayloadSnapshot(sectionId, fallbackVersion, fallbackPayload);
        recordSectionObservability(sectionId, 'payload-cached', {
            version: fallbackVersion,
            origin: 'local',
            usedRemote: false,
            remoteVersionSource: remoteVersionsState.status,
            remoteVersionError: remoteVersionsState.error || ''
        });
        return {
            sectionId,
            version: fallbackVersion,
            status: 'payload-cached',
            message: null,
            usedRemote: false
        };
    }

    rememberSectionVersion(sectionId, fallbackVersion);
    recordSectionObservability(sectionId, 'version-synced', {
        version: fallbackVersion,
        origin: 'local',
        message: 'تمت مزامنة الإصدار المحلي بدون payload قابل للتخزين.',
        usedRemote: false,
        remoteVersionSource: remoteVersionsState.status,
        remoteVersionError: remoteVersionsState.error || ''
    });
    return {
        sectionId,
        version: fallbackVersion,
        status: 'version-synced',
        message: 'تمت مزامنة الإصدار المحلي بدون payload قابل للتخزين.',
        usedRemote: false
    };
}

/**
 * @template T
 * @param {string} sectionId
 * @param {() => T} loader
 * @param {(payload: unknown) => payload is T} validator
 * @returns {T}
 */
function loadSyncSection(sectionId, loader, validator) {
    const definition = getContentSectionDefinition(sectionId);
    const version = getSectionVersion(sectionId);
    const cacheMode = definition?.cacheMode || CONTENT_CACHE_MODES.VERSION_ONLY;

    if (cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        const cachedPayload = readFreshCachedPayload(sectionId, version, validator);
        if (cachedPayload) {
            rememberSectionVersion(sectionId, version);
            recordSectionObservability(sectionId, 'cache-reused', {
                version,
                origin: 'cache',
                remoteVersionSource: remoteVersionsState.status,
                remoteVersionError: remoteVersionsState.error || ''
            });
            return cachedPayload;
        }
    }

    const payload = loader();
    if (validator(payload) && cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        persistPayloadSnapshot(sectionId, version, payload);
        recordSectionObservability(sectionId, 'payload-cached', {
            version,
            origin: 'local',
            remoteVersionSource: remoteVersionsState.status,
            remoteVersionError: remoteVersionsState.error || ''
        });
        return payload;
    }

    rememberSectionVersion(sectionId, version);
    recordSectionObservability(sectionId, 'local-static', {
        version,
        origin: 'local',
        remoteVersionSource: remoteVersionsState.status,
        remoteVersionError: remoteVersionsState.error || ''
    });
    return payload;
}

/**
 * @template T
 * @param {string} sectionId
 * @param {() => Promise<T>} loader
 * @param {(payload: unknown) => payload is T} validator
 * @returns {Promise<T>}
 */
async function loadAsyncSection(sectionId, loader, validator) {
    const definition = getContentSectionDefinition(sectionId);
    const version = getSectionVersion(sectionId);
    const cacheMode = definition?.cacheMode || CONTENT_CACHE_MODES.VERSION_ONLY;

    if (cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        const cachedPayload = readFreshCachedPayload(sectionId, version, validator);
        if (cachedPayload) {
            rememberSectionVersion(sectionId, version);
            recordSectionObservability(sectionId, 'cache-reused', {
                version,
                origin: 'cache',
                remoteVersionSource: remoteVersionsState.status,
                remoteVersionError: remoteVersionsState.error || ''
            });
            return cachedPayload;
        }
    }

    const payload = await loader();
    if (validator(payload) && cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        persistPayloadSnapshot(sectionId, version, payload);
        recordSectionObservability(sectionId, 'payload-cached', {
            version,
            origin: 'local',
            remoteVersionSource: remoteVersionsState.status,
            remoteVersionError: remoteVersionsState.error || ''
        });
        return payload;
    }

    rememberSectionVersion(sectionId, version);
    recordSectionObservability(sectionId, 'local-static', {
        version,
        origin: 'local',
        remoteVersionSource: remoteVersionsState.status,
        remoteVersionError: remoteVersionsState.error || ''
    });
    return payload;
}

/**
 * @param {string} sectionId
 * @param {string} message
 * @returns {ContentFoundationRuntimeResult}
 */
function buildVersionSyncedResult(sectionId, message) {
    const version = getSectionVersion(sectionId);
    rememberSectionVersion(sectionId, version);
    recordSectionObservability(sectionId, 'version-synced', {
        version,
        origin: 'local',
        message,
        remoteVersionSource: remoteVersionsState.status,
        remoteVersionError: remoteVersionsState.error || ''
    });
    return {
        sectionId,
        version,
        status: 'version-synced',
        message,
        usedRemote: false
    };
}

/**
 * @template T
 * @param {string} sectionId
 * @param {(payload: unknown) => payload is T} validator
 * @param {() => T | Promise<T>} loader
 * @returns {Promise<ContentFoundationRuntimeResult>}
 */
async function prepareFastFoundationSection(sectionId, validator, loader) {
    const version = getSectionVersion(sectionId);
    const cachedPayload = readFreshCachedPayload(sectionId, version, validator);
    if (cachedPayload) {
        rememberSectionVersion(sectionId, version);
        recordSectionObservability(sectionId, 'cache-reused', {
            version,
            origin: 'cache',
            pending: false,
            remoteVersionSource: remoteVersionsState.status,
            remoteVersionError: remoteVersionsState.error || ''
        });
        return {
            sectionId,
            version,
            status: 'cache-reused',
            message: null,
            usedRemote: false
        };
    }

    if (sectionId === CONTENT_SECTION_IDS.APP_CONFIG || sectionId === CONTENT_SECTION_IDS.DUAS || sectionId === CONTENT_SECTION_IDS.STORIES) {
        const payload = await loader();
        if (validator(payload)) {
            persistPayloadSnapshot(sectionId, version, payload);
            recordSectionObservability(sectionId, 'payload-cached', {
                version,
                origin: 'local',
                pending: false,
                remoteVersionSource: remoteVersionsState.status,
                remoteVersionError: remoteVersionsState.error || ''
            });
            return {
                sectionId,
                version,
                status: 'payload-cached',
                message: null,
                usedRemote: false
            };
        }

        return buildVersionSyncedResult(sectionId, 'تعذر التحقق من payload المحلي أثناء التهيئة السريعة.');
    }

    return buildVersionSyncedResult(sectionId, 'تمت مزامنة الإصدار فقط، وسيكتمل refresh المحتوى في الخلفية.');
}

function scheduleFoundationWarmup() {
    if (foundationWarmupScheduled || !canAttemptRemoteSync()) {
        return;
    }

    foundationWarmupScheduled = true;
    const scheduleTask = typeof globalThis.setTimeout === 'function'
        ? globalThis.setTimeout.bind(globalThis)
        : (task) => Promise.resolve().then(task);

    scheduleTask(async () => {
        foundationWarmupScheduled = false;

        try {
            await primePublicContentFoundation({ forceRemoteSync: true, eager: true, silent: true });
            appLogger.info('[ContentClient] Background content refresh completed', {
                versions: getPublicContentVersions()
            });
        } catch (error) {
            appLogger.warn('[ContentClient] Background content refresh failed', error);
        }
    }, 0);
}

export function getPublicContentVersions() {
    return getVersionPayload();
}

export async function primePublicContentFoundation(options = {}) {
    const eager = Boolean(options.eager === true);
    const storedVersionsBeforeSync = getVersionPayload();
    const remoteVersionsResult = await syncRemoteVersions({ force: Boolean(options.forceRemoteSync) });
    const targetVersions = remoteVersionsResult?.versions || storedVersionsBeforeSync;

    const sections = await Promise.all(listContentSections().map(async (section) => {
        const validator = getSectionValidator(section.id);
        const loader = getSectionLocalLoader(section.id);
        const targetVersion = getSectionVersion(section.id, targetVersions);

        if (typeof loader !== 'function') {
            return {
                sectionId: section.id,
                version: getSectionVersion(section.id),
                status: 'failed',
                message: 'Local loader is unavailable for the requested section.',
                usedRemote: false
            };
        }

        if (!eager) {
            return prepareFastFoundationSection(section.id, validator, loader);
        }

        return prepareSectionFoundation(section.id, targetVersion, validator, loader);
    }));

    const failures = sections.filter((entry) => entry.status === 'failed');
    const statusCounts = sections.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
    }, {});

    const resolvedVersions = getVersionPayload();
    const deferredWarmup = Boolean(!eager && canAttemptRemoteSync());
    if (deferredWarmup && options.silent !== true) {
        scheduleFoundationWarmup();
    }

    const summary = {
        ok: failures.length === 0,
        versions: resolvedVersions,
        sections,
        failures,
        deferredWarmup,
        payloadCachedCount: Number(statusCounts['payload-cached'] || 0),
        cacheReusedCount: Number(statusCounts['cache-reused'] || 0),
        versionSyncedCount: Number(statusCounts['version-synced'] || 0),
        versionOnlyCount: Number(statusCounts['version-only'] || 0),
        failedCount: failures.length,
        remoteCachedCount: Number(statusCounts['remote-cached'] || 0),
        remoteFallbackCount: Number(statusCounts['remote-fallback-local'] || 0),
        remoteVersionsStatus: remoteVersionsResult?.source || remoteVersionsState.status,
        remoteEndpoints: getRemotePublicContentEndpoints(),
        completedAt: new Date().toISOString()
    };

    recordPublicContentFoundationSummary(summary);
    return summary;
}

export async function refreshPublicContentFoundation(options = {}) {
    const startedAt = new Date().toISOString();
    recordContentRefreshStatus({
        status: 'running',
        startedAt,
        completedAt: null,
        error: ''
    });

    try {
        const summary = await primePublicContentFoundation({
            forceRemoteSync: true,
            eager: true,
            silent: true,
            ...options
        });
        const snapshot = getPublicContentSourceStatus();
        const staleCount = Number(snapshot?.summary?.counts?.stale || 0);
        const hasWarnings = Boolean(
            summary.failedCount
            || summary.remoteFallbackCount
            || staleCount
            || snapshot?.remoteVersions?.source === 'local-fallback'
        );
        recordContentRefreshStatus({
            status: hasWarnings ? 'warning' : 'success',
            startedAt,
            completedAt: new Date().toISOString(),
            error: hasWarnings && staleCount > 0
                ? `يوجد ${staleCount} أقسام ما زالت تحتاج refresh payload.`
                : ''
        });
        return summary;
    } catch (error) {
        const safeError = error instanceof Error ? error.message : String(error || 'Unknown content refresh failure');
        recordContentRefreshStatus({
            status: 'error',
            startedAt,
            completedAt: new Date().toISOString(),
            error: safeError
        });
        throw error;
    }
}

export function listAzkarManifestEntries() {
    return localContentProvider.listAzkarManifestEntries();
}

export function getAzkarCategoryMetadataByKey(key) {
    return localContentProvider.getAzkarCategoryMetadataByKey(key);
}

export async function warmAzkarCatalog() {
    try {
        await getAzkarCatalog();
        return true;
    } catch (error) {
        appLogger.error('[ContentClient] Failed to warm azkar catalog', error);
        return false;
    }
}

export async function getAzkarCatalog() {
    return loadAsyncSection(
        CONTENT_SECTION_IDS.AZKAR,
        () => localContentProvider.getAzkarCatalog(),
        isValidAzkarCatalog
    );
}

export async function getAzkarCategoryByKey(categoryKey) {
    const catalog = await getAzkarCatalog();
    const manifestEntry = getAzkarManifestEntryByKey(categoryKey);
    const safeSlug = manifestEntry?.slug || resolveAzkarSlug(categoryKey);

    return catalog.categories.find((category) => (
        category.slug === safeSlug || category.title === categoryKey || category.category === categoryKey
    )) ?? null;
}

export async function getAzkarCategoryBySlug(slug) {
    const catalog = await getAzkarCatalog();
    const safeSlug = resolveAzkarSlug(slug);
    if (!safeSlug) return null;
    return catalog.categories.find((category) => category.slug === safeSlug) ?? null;
}

export function getDuasCatalog() {
    return loadSyncSection(
        CONTENT_SECTION_IDS.DUAS,
        () => localContentProvider.getDuasCatalog(),
        isValidDuasCatalog
    );
}

export function getDuaCategoryByKey(key) {
    const manifestEntry = getDuaManifestEntryByKey(key);
    if (!manifestEntry) return null;
    return getDuasCatalog().find((category) => category.slug === manifestEntry.slug) || null;
}

export function getDuaCategoryBySlug(slug) {
    const safeSlug = resolveDuaSlug(slug);
    if (!safeSlug) return null;
    return getDuasCatalog().find((category) => category.slug === safeSlug) || null;
}

export function getAllDuaItems() {
    return getDuasCatalog().flatMap((category) => category.items.map((item) => ({ ...item, category: category.title })));
}

export function makeStoryKey(categorySlug, storyId) {
    return localContentProvider.makeStoryKey(categorySlug, storyId);
}

export function parseStoryKey(storyKey) {
    return localContentProvider.parseStoryKey(storyKey);
}

export function getStoriesCatalog() {
    return loadSyncSection(
        CONTENT_SECTION_IDS.STORIES,
        () => localContentProvider.getStoriesCatalog(),
        isValidStoriesCatalog
    );
}

export function getStoryCategoryBySlug(slug) {
    const safeSlug = resolveStoryCategorySlug(slug);
    if (!safeSlug) return null;
    return getStoriesCatalog().find((category) => category.slug === safeSlug) || null;
}

export function getStoryCategoryByKey(key) {
    const entry = getStoryManifestEntryByKey(key);
    if (!entry) return null;
    return getStoryCategoryBySlug(entry.slug);
}

export function getStoryByKey(storyKey) {
    if (typeof storyKey !== 'string' || !storyKey) return null;
    return getAllStories().find((story) => story.storyKey === storyKey) || null;
}

export function getStoryByCategoryAndId(categoryKey, storyId) {
    const category = getStoryCategoryByKey(categoryKey);
    if (!category) return null;
    const key = makeStoryKey(category.slug, storyId);
    return getStoryByKey(key);
}

export function getAllStories() {
    return getStoriesCatalog().flatMap((category) => category.stories);
}

export function getDailyMessages() {
    const version = getSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT);
    const cachedPayload = readFreshCachedPayload(CONTENT_SECTION_IDS.DAILY_CONTENT, version, isValidDailyContent);
    if (cachedPayload) {
        rememberSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT, version);
        recordSectionObservability(CONTENT_SECTION_IDS.DAILY_CONTENT, 'cache-reused', {
            version,
            origin: 'cache',
            remoteVersionSource: remoteVersionsState.status,
            remoteVersionError: remoteVersionsState.error || ''
        });
        return cachedPayload.messages;
    }

    recordSectionObservability(CONTENT_SECTION_IDS.DAILY_CONTENT, 'local-static', {
        version,
        origin: 'local',
        remoteVersionSource: remoteVersionsState.status,
        remoteVersionError: remoteVersionsState.error || ''
    });
    return localContentProvider.getDailyMessages();
}

export async function getDailyAyahs() {
    const payload = await getDailyContent();
    return Array.isArray(payload?.ayahs) ? payload.ayahs : [];
}

export async function getDailyContent() {
    return loadAsyncSection(
        CONTENT_SECTION_IDS.DAILY_CONTENT,
        () => localContentProvider.getDailyContent(),
        isValidDailyContent
    );
}

export function getStoredPublicContentVersions() {
    return sectionVersions.getStoredSectionVersions();
}

export function listPublicContentSectionDefinitions() {
    return listContentSections();
}

export function getPublicContentSourceSnapshot() {
    return getPublicContentSourceStatus();
}

export function onPublicContentSourceStatus(listener, options = {}) {
    return subscribePublicContentSourceStatus(listener, options);
}

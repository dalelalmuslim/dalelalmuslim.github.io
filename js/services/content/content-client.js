import '../../shared/contracts/content-types.js';
import { APP_CONFIG } from '../../app/app-config.js';
import { appLogger } from '../../shared/logging/app-logger.js';
import {
    CONTENT_CACHE_MODES,
    CONTENT_SECTION_IDS,
    getContentSectionDefinition,
    listContentSections
} from '../../shared/contracts/content-sections.js';
import * as sectionCache from '../cache/section-cache.js';
import * as sectionVersions from '../versions/section-version-store.js';
import * as localContentProvider from './content-provider-local.js';

let foundationWarmupScheduled = false;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getVersionPayload() {
    return localContentProvider.getPublicVersions();
}

function getSectionVersion(sectionId, versions = getVersionPayload()) {
    const definition = getContentSectionDefinition(sectionId);
    if (!definition) {
        return String(APP_CONFIG.CONTENT_DEFAULT_VERSIONS[sectionId] || '');
    }

    const version = versions?.[definition.versionKey];
    if (typeof version === 'string' && version.trim()) {
        return version;
    }

    return String(APP_CONFIG.CONTENT_DEFAULT_VERSIONS[definition.id] || '');
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
            return cachedPayload;
        }
    }

    const payload = loader();
    if (validator(payload) && cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        persistPayloadSnapshot(sectionId, version, payload);
        return payload;
    }

    rememberSectionVersion(sectionId, version);
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
            return cachedPayload;
        }
    }

    const payload = await loader();
    if (validator(payload) && cacheMode === CONTENT_CACHE_MODES.PAYLOAD) {
        persistPayloadSnapshot(sectionId, version, payload);
        return payload;
    }

    rememberSectionVersion(sectionId, version);
    return payload;
}

/**
 * @param {string} sectionId
 * @param {string} version
 * @returns {import('../../shared/contracts/content-types.js').ContentFoundationSectionResult}
 */
function buildVersionOnlyResult(sectionId, version) {
    rememberSectionVersion(sectionId, version);
    return {
        sectionId,
        version,
        status: 'version-synced',
        message: 'تمت مزامنة الإصدار فقط لتجنب تكرار payload كبير في التخزين المحلي.'
    };
}

/**
 * @template T
 * @param {string} sectionId
 * @param {string} version
 * @param {(payload: unknown) => payload is T} validator
 * @param {() => T} loader
 * @returns {import('../../shared/contracts/content-types.js').ContentFoundationSectionResult}
 */
function warmSyncPayloadSection(sectionId, version, validator, loader) {
    const cachedPayload = readFreshCachedPayload(sectionId, version, validator);
    if (cachedPayload) {
        rememberSectionVersion(sectionId, version);
        return { sectionId, version, status: 'cache-reused' };
    }

    const payload = loader();
    if (!validator(payload)) {
        rememberSectionVersion(sectionId, version);
        return {
            sectionId,
            version,
            status: 'cache-skip',
            message: 'تعذر التحقق من payload المحلي، وتم الاكتفاء بتسجيل الإصدار.'
        };
    }

    const stored = persistPayloadSnapshot(sectionId, version, payload);
    return {
        sectionId,
        version,
        status: stored ? 'payload-cached' : 'cache-skip',
        message: stored ? null : 'تعذر حفظ الـ payload محليًا، وتم الاكتفاء بتسجيل الإصدار.'
    };
}

function scheduleFoundationWarmup() {
    if (foundationWarmupScheduled) {
        return;
    }

    foundationWarmupScheduled = true;
    const scheduleTask = typeof globalThis.setTimeout === 'function'
        ? globalThis.setTimeout.bind(globalThis)
        : (task) => Promise.resolve().then(task);

    scheduleTask(async () => {
        foundationWarmupScheduled = false;

        try {
            const versions = getPublicContentVersions();
            await loadAsyncSection(
                CONTENT_SECTION_IDS.AZKAR,
                () => localContentProvider.getAzkarCatalog(),
                isValidAzkarCatalog
            );
            await loadAsyncSection(
                CONTENT_SECTION_IDS.DAILY_CONTENT,
                () => localContentProvider.getDailyContent(),
                isValidDailyContent
            );

            appLogger.info('[ContentClient] Background foundation warmup completed', {
                azkarVersion: getSectionVersion(CONTENT_SECTION_IDS.AZKAR, versions),
                dailyContentVersion: getSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT, versions)
            });
        } catch (error) {
            appLogger.warn('[ContentClient] Background foundation warmup failed', error);
        }
    }, 0);
}

export function getPublicContentVersions() {
    return getVersionPayload();
}

export function primePublicContentFoundation() {
    const versions = getPublicContentVersions();
    /** @type {import('../../shared/contracts/content-types.js').ContentFoundationSectionResult[]} */
    const sections = [];

    sections.push(
        warmSyncPayloadSection(
            CONTENT_SECTION_IDS.APP_CONFIG,
            getSectionVersion(CONTENT_SECTION_IDS.APP_CONFIG, versions),
            isValidAppConfigSnapshot,
            () => createAppConfigSnapshot()
        )
    );

    const azkarVersion = getSectionVersion(CONTENT_SECTION_IDS.AZKAR, versions);
    const cachedAzkar = readFreshCachedPayload(CONTENT_SECTION_IDS.AZKAR, azkarVersion, isValidAzkarCatalog);
    rememberSectionVersion(CONTENT_SECTION_IDS.AZKAR, azkarVersion);
    sections.push(cachedAzkar
        ? { sectionId: CONTENT_SECTION_IDS.AZKAR, version: azkarVersion, status: 'cache-reused' }
        : {
            sectionId: CONTENT_SECTION_IDS.AZKAR,
            version: azkarVersion,
            status: 'version-synced',
            message: 'تمت مزامنة الإصدار، وسيتم تسخين الكاش في الخلفية.'
        });

    sections.push(
        buildVersionOnlyResult(
            CONTENT_SECTION_IDS.DUAS,
            getSectionVersion(CONTENT_SECTION_IDS.DUAS, versions)
        )
    );

    sections.push(
        buildVersionOnlyResult(
            CONTENT_SECTION_IDS.STORIES,
            getSectionVersion(CONTENT_SECTION_IDS.STORIES, versions)
        )
    );

    const dailyContentVersion = getSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT, versions);
    const cachedDailyContent = readFreshCachedPayload(CONTENT_SECTION_IDS.DAILY_CONTENT, dailyContentVersion, isValidDailyContent);
    rememberSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT, dailyContentVersion);
    sections.push(cachedDailyContent
        ? { sectionId: CONTENT_SECTION_IDS.DAILY_CONTENT, version: dailyContentVersion, status: 'cache-reused' }
        : {
            sectionId: CONTENT_SECTION_IDS.DAILY_CONTENT,
            version: dailyContentVersion,
            status: 'version-synced',
            message: 'تمت مزامنة الإصدار، وسيتم تسخين الكاش في الخلفية.'
        });

    const deferredWarmup = Boolean(!cachedAzkar || !cachedDailyContent);
    if (deferredWarmup) {
        scheduleFoundationWarmup();
    }

    const failures = sections.filter((entry) => entry.status === 'failed');
    const statusCounts = sections.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
    }, {});

    return {
        ok: failures.length === 0,
        versions,
        sections,
        failures,
        deferredWarmup,
        payloadCachedCount: Number(statusCounts['payload-cached'] || 0),
        cacheReusedCount: Number(statusCounts['cache-reused'] || 0),
        versionSyncedCount: Number(statusCounts['version-synced'] || 0),
        versionOnlyCount: Number(statusCounts['version-only'] || 0),
        failedCount: failures.length,
        completedAt: new Date().toISOString()
    };
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
    return localContentProvider.getAzkarCategoryByKey(categoryKey);
}

export async function getAzkarCategoryBySlug(slug) {
    return localContentProvider.getAzkarCategoryBySlug(slug);
}

export function getDuasCatalog() {
    return loadSyncSection(
        CONTENT_SECTION_IDS.DUAS,
        () => localContentProvider.getDuasCatalog(),
        isValidDuasCatalog
    );
}

export function getDuaCategoryByKey(key) {
    return localContentProvider.getDuaCategoryByKey(key);
}

export function getDuaCategoryBySlug(slug) {
    return localContentProvider.getDuaCategoryBySlug(slug);
}

export function getAllDuaItems() {
    return localContentProvider.getAllDuaItems();
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
    return localContentProvider.getStoryCategoryBySlug(slug);
}

export function getStoryCategoryByKey(key) {
    return localContentProvider.getStoryCategoryByKey(key);
}

export function getStoryByKey(storyKey) {
    return localContentProvider.getStoryByKey(storyKey);
}

export function getStoryByCategoryAndId(categoryKey, storyId) {
    return localContentProvider.getStoryByCategoryAndId(categoryKey, storyId);
}

export function getAllStories() {
    return localContentProvider.getAllStories();
}

export function getDailyMessages() {
    const version = getSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT);
    const cachedPayload = readFreshCachedPayload(CONTENT_SECTION_IDS.DAILY_CONTENT, version, isValidDailyContent);
    if (cachedPayload) {
        rememberSectionVersion(CONTENT_SECTION_IDS.DAILY_CONTENT, version);
        return cachedPayload.messages;
    }

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

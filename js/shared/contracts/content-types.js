/**
 * @typedef {Object} ContentVersionPayload
 * @property {string} app_config_version
 * @property {string} azkar_version
 * @property {string} duas_version
 * @property {string} stories_version
 * @property {string} daily_content_version
 */

/**
 * @typedef {Object} DailyContentPayload
 * @property {Array<unknown>} messages
 * @property {Array<unknown>} ayahs
 */

/**
 * @typedef {Object} ContentCacheSnapshot
 * @property {string} sectionId
 * @property {string} version
 * @property {unknown} payload
 * @property {string} cachedAt
 */

/**
 * @typedef {Object} ContentFoundationSectionResult
 * @property {string} sectionId
 * @property {string} version
 * @property {'payload-cached' | 'version-synced' | 'cache-reused' | 'cache-skip' | 'failed'} status
 * @property {string | null} [message]
 */

/**
 * @typedef {Object} ContentFoundationSummary
 * @property {boolean} ok
 * @property {ContentVersionPayload} versions
 * @property {ContentFoundationSectionResult[]} sections
 * @property {ContentFoundationSectionResult[]} failures
 * @property {boolean} [deferredWarmup]
 * @property {number} [payloadCachedCount]
 * @property {number} [cacheReusedCount]
 * @property {number} [versionSyncedCount]
 * @property {number} [versionOnlyCount]
 * @property {number} [failedCount]
 * @property {string} completedAt
 */

export const CONTENT_TYPE_VERSION = 'stage-1';

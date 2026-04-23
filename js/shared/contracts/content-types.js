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
 * @property {'payload-cached' | 'version-synced' | 'cache-reused' | 'cache-skip' | 'remote-cached' | 'remote-fallback-local' | 'failed'} status
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

/**
 * @typedef {Object} PublicContentSourceSectionStatus
 * @property {string} sectionId
 * @property {string} title
 * @property {string} versionKey
 * @property {string} version
 * @property {string} endpoint
 * @property {string} cacheMode
 * @property {string} source
 * @property {string} sourceLabel
 * @property {string} sourceTone
 * @property {string} origin
 * @property {string} originLabel
 * @property {boolean} pending
 * @property {string} message
 * @property {string} error
 * @property {string | null} updatedAt
 * @property {boolean} usedRemote
 * @property {string} cachedVersion
 * @property {string} remoteVersion
 * @property {boolean} stale
 * @property {string} staleReason
 * @property {string} [staleReasonLabel]
 */

/**
 * @typedef {Object} PublicContentRefreshStatus
 * @property {string} status
 * @property {string | null} startedAt
 * @property {string | null} completedAt
 * @property {string} error
 */

/**
 * @typedef {Object} PublicContentSourceSnapshot
 * @property {{ tone: string, label: string, text: string, meta: string, lastUpdatedAt: string | null, refreshStatus?: string }} summary
 * @property {{ status: string, source: string, syncedAt: string | null, error: string }} remoteVersions
 * @property {PublicContentRefreshStatus} refresh
 * @property {PublicContentSourceSectionStatus[]} sections
 */

export const CONTENT_TYPE_VERSION = 'stage-2';

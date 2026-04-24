import {
    CONTENT_CACHE_MODES,
    getContentSectionDefinition,
    listContentSections
} from '../../shared/contracts/content-sections.js';

const listeners = new Set();

const SOURCE_PRESENTATION = Object.freeze({
    idle: { label: 'قيد التهيئة', tone: 'idle', summaryBucket: 'idle' },
    pending: { label: 'قيد التحديث', tone: 'warning', summaryBucket: 'pending' },
    'remote-network': { label: 'API مباشر', tone: 'healthy', summaryBucket: 'remote' },
    'remote-memory': { label: 'ذاكرة الجلسة', tone: 'healthy', summaryBucket: 'remote' },
    'remote-cached': { label: 'API → Cache', tone: 'healthy', summaryBucket: 'remote' },
    'cache-reused': { label: 'Cache', tone: 'healthy', summaryBucket: 'cache' },
    'payload-cached': { label: 'محلي → Cache', tone: 'healthy', summaryBucket: 'local' },
    'local-static': { label: 'محلي مباشر', tone: 'healthy', summaryBucket: 'local' },
    'remote-fallback-local': { label: 'Fallback محلي', tone: 'warning', summaryBucket: 'fallback' },
    'version-synced': { label: 'إصدار فقط', tone: 'warning', summaryBucket: 'version-only' },
    failed: { label: 'فشل', tone: 'error', summaryBucket: 'failed' }
});

const ORIGIN_PRESENTATION = Object.freeze({
    remote: 'آخر أصل: Remote',
    local: 'آخر أصل: Local',
    cache: 'آخر أصل: Cache',
    unknown: ''
});

const STALE_REASON_PRESENTATION = Object.freeze({
    'missing-payload-cache': 'لا يوجد payload مخزن للإصدار الحالي بعد.',
    'cached-version-mismatch': 'الـ payload المخزن لا يطابق الإصدار المطلوب حاليًا.',
    'stored-version-mismatch': 'الإصدار المخزن محليًا لا يطابق آخر إصدار معروف.',
    'remote-version-mismatch': 'الـ payload الحالي أقدم من نسخة Remote المعروفة.',
    'missing-remote-payload': 'تمت معرفة نسخة أحدث، لكن payload هذه النسخة لم يصل بعد.'
});

const REFRESH_PRESENTATION = Object.freeze({
    idle: { label: 'جاهز', tone: 'idle' },
    running: { label: 'جاري التحديث', tone: 'warning' },
    success: { label: 'تم التحديث', tone: 'healthy' },
    warning: { label: 'تم مع ملاحظات', tone: 'warning' },
    error: { label: 'فشل التحديث', tone: 'error' }
});

function getOnlineStatus() {
    if (typeof globalThis.navigator?.onLine === 'boolean') {
        return globalThis.navigator.onLine;
    }

    return null;
}

function cloneState(currentState) {
    return {
        ...currentState,
        summary: { ...(currentState.summary || {}) },
        remoteVersions: { ...(currentState.remoteVersions || {}) },
        refresh: { ...(currentState.refresh || {}) },
        sections: Array.isArray(currentState.sections)
            ? currentState.sections.map((section) => ({ ...section }))
            : []
    };
}

function createSectionState(section) {
    return {
        sectionId: section.id,
        title: section.titleAr || section.id,
        versionKey: section.versionKey,
        version: '',
        endpoint: section.endpoint,
        cacheMode: section.cacheMode || CONTENT_CACHE_MODES.VERSION_ONLY,
        source: 'idle',
        sourceLabel: SOURCE_PRESENTATION.idle.label,
        sourceTone: SOURCE_PRESENTATION.idle.tone,
        summaryBucket: SOURCE_PRESENTATION.idle.summaryBucket,
        origin: 'unknown',
        originLabel: '',
        pending: false,
        message: '',
        error: '',
        updatedAt: null,
        usedRemote: false,
        remoteVersionSource: '',
        remoteVersionError: '',
        cachedVersion: '',
        remoteVersion: '',
        stale: false,
        staleReason: ''
    };
}

function summarizeSectionBuckets(sections) {
    return sections.reduce((acc, section) => {
        const bucket = section.summaryBucket || 'idle';
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
    }, {
        remote: 0,
        cache: 0,
        local: 0,
        fallback: 0,
        'version-only': 0,
        failed: 0,
        pending: 0,
        idle: 0,
        stale: 0
    });
}

function countStaleSections(sections) {
    return sections.reduce((count, section) => count + (section.stale ? 1 : 0), 0);
}

function buildSummary(state) {
    const sections = Array.isArray(state.sections) ? state.sections : [];
    const counts = summarizeSectionBuckets(sections);
    counts.stale = countStaleSections(sections);

    const remoteVersions = state.remoteVersions || {};
    const refresh = state.refresh || {};
    const online = getOnlineStatus();

    let tone = 'healthy';
    let label = 'متصل';
    let text = 'كل أقسام المحتوى جاهزة.';

    if (!sections.length) {
        tone = 'idle';
        label = 'قيد التهيئة';
        text = 'لم تُسجل حالة مصادر المحتوى بعد.';
    } else if (refresh.status === 'running') {
        tone = 'warning';
        label = 'جاري التحديث';
        text = 'جاري مزامنة المحتوى يدويًا من الـ API.';
    } else if (counts.failed > 0) {
        tone = 'error';
        label = 'يوجد خلل';
        text = `فشل ${counts.failed} قسم من أقسام المحتوى.`;
    } else if (counts.stale > 0) {
        tone = 'warning';
        label = 'يحتاج تحديث';
        text = `يوجد ${counts.stale} أقسام تحتاج refresh payload حتى تطابق أحدث نسخة معروفة.`;
    } else if (counts.fallback > 0 || counts['version-only'] > 0 || counts.pending > 0) {
        tone = 'warning';
        label = 'جزئي';
        text = `يوجد ${counts.fallback} fallback محلي و${counts['version-only']} أقسام بإصدار فقط.`;
    } else if (remoteVersions.status === 'failed' || remoteVersions.source === 'local-fallback') {
        tone = online === false ? 'idle' : 'warning';
        label = online === false ? 'بدون إنترنت' : 'محلي';
        text = online === false
            ? 'التطبيق يعمل على النسخ المحلية/المخزنة لحين عودة الإنترنت.'
            : 'تعذر مزامنة نسخ Remote، ويتم الاعتماد على النسخ المحلية/المخزنة.';
    } else if (counts.remote === 0 && counts.cache > 0) {
        tone = 'healthy';
        label = 'Cache';
        text = 'المحتوى متاح من الكاش الحالي بدون إعادة جلب جديدة.';
    } else if (counts.remote === 0 && counts.local > 0) {
        tone = online === false ? 'idle' : 'warning';
        label = 'محلي';
        text = 'المحتوى يعمل من المصدر المحلي الحالي.';
    }

    const parts = [];
    if (counts.remote) parts.push(`Remote: ${counts.remote}`);
    if (counts.cache) parts.push(`Cache: ${counts.cache}`);
    if (counts.local) parts.push(`Local: ${counts.local}`);
    if (counts.fallback) parts.push(`Fallback: ${counts.fallback}`);
    if (counts['version-only']) parts.push(`Version-only: ${counts['version-only']}`);
    if (counts.stale) parts.push(`Stale: ${counts.stale}`);
    if (counts.failed) parts.push(`Failed: ${counts.failed}`);

    return {
        tone,
        label,
        text,
        counts,
        meta: parts.join(' • ') || 'لا توجد أقسام مسجلة.',
        lastUpdatedAt: new Date().toISOString(),
        online,
        remoteVersionsStatus: remoteVersions.status || 'idle',
        remoteVersionsSource: remoteVersions.source || '',
        refreshStatus: refresh.status || 'idle'
    };
}

function notify() {
    const snapshot = getPublicContentSourceStatus();
    listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch {
            // noop: observability listeners must not break content flow.
        }
    });
}

function normalizeSourceMeta(source) {
    return SOURCE_PRESENTATION[source] || SOURCE_PRESENTATION.idle;
}

function normalizeOrigin(origin) {
    if (origin === 'remote' || origin === 'local' || origin === 'cache') {
        return origin;
    }

    return 'unknown';
}

function resolveStaleReasonLabel(reason) {
    if (typeof reason !== 'string' || !reason.trim()) {
        return '';
    }

    return STALE_REASON_PRESENTATION[reason] || reason.trim();
}

function resolveNextState(mutator) {
    const draft = cloneState(state);
    const nextState = mutator(draft) || draft;
    nextState.summary = buildSummary(nextState);
    state = nextState;
    notify();
    return getPublicContentSourceStatus();
}

function createDefaultState() {
    return {
        remoteVersions: {
            status: 'idle',
            source: 'idle',
            syncedAt: null,
            error: '',
            sections: []
        },
        refresh: {
            status: 'idle',
            startedAt: null,
            completedAt: null,
            error: ''
        },
        summary: {
            tone: 'idle',
            label: 'قيد التهيئة',
            text: 'لم تُسجل حالة مصادر المحتوى بعد.',
            counts: {},
            meta: 'لا توجد أقسام مسجلة.',
            lastUpdatedAt: null,
            online: getOnlineStatus(),
            remoteVersionsStatus: 'idle',
            remoteVersionsSource: 'idle',
            refreshStatus: 'idle'
        },
        sections: listContentSections().map(createSectionState)
    };
}

let state = createDefaultState();
state.summary = buildSummary(state);

export function resetPublicContentSourceStatus() {
    state = createDefaultState();
    state.summary = buildSummary(state);
    notify();
    return getPublicContentSourceStatus();
}

export function getPublicContentSourceStatus() {
    return cloneState(state);
}

export function subscribePublicContentSourceStatus(listener, options = {}) {
    if (typeof listener !== 'function') {
        return () => {};
    }

    listeners.add(listener);
    if (options.emitCurrent !== false) {
        listener(getPublicContentSourceStatus());
    }

    return () => {
        listeners.delete(listener);
    };
}

export function recordRemoteVersionsStatus({ status = 'idle', source = 'idle', syncedAt = null, error = '', sections = [] } = {}) {
    return resolveNextState((draft) => {
        draft.remoteVersions = {
            status,
            source,
            syncedAt: syncedAt || new Date().toISOString(),
            error: typeof error === 'string' ? error : String(error || ''),
            sections: Array.isArray(sections) ? sections.slice() : []
        };
        return draft;
    });
}

export function recordContentRefreshStatus({ status = 'idle', startedAt = null, completedAt = null, error = '' } = {}) {
    return resolveNextState((draft) => {
        draft.refresh = {
            status,
            startedAt: startedAt || draft.refresh?.startedAt || null,
            completedAt: completedAt || draft.refresh?.completedAt || null,
            error: typeof error === 'string' ? error : String(error || '')
        };
        return draft;
    });
}

export function recordSectionSourceStatus(sectionId, patch = {}) {
    const definition = getContentSectionDefinition(sectionId);
    if (!definition) {
        return getPublicContentSourceStatus();
    }

    return resolveNextState((draft) => {
        const currentIndex = draft.sections.findIndex((entry) => entry.sectionId === sectionId);
        const current = currentIndex >= 0 ? draft.sections[currentIndex] : createSectionState(definition);
        const requestedSource = typeof patch.source === 'string' && patch.source.trim()
            ? patch.source.trim()
            : current.source;
        const nextVersion = typeof patch.version === 'string' ? patch.version : current.version;
        const shouldPreserveRemoteCache = requestedSource === 'cache-reused'
            && current.source === 'remote-cached'
            && current.origin === 'remote'
            && current.version === nextVersion;

        const source = shouldPreserveRemoteCache ? current.source : requestedSource;
        const sourceMeta = normalizeSourceMeta(source);
        const origin = shouldPreserveRemoteCache
            ? current.origin
            : (patch.origin ? normalizeOrigin(patch.origin) : current.origin);
        const stale = typeof patch.stale === 'boolean' ? patch.stale : current.stale;
        const staleReason = typeof patch.staleReason === 'string' ? patch.staleReason : current.staleReason;
        const staleReasonLabel = resolveStaleReasonLabel(staleReason);

        const next = {
            ...current,
            version: nextVersion,
            pending: typeof patch.pending === 'boolean' ? patch.pending : current.pending,
            source,
            sourceLabel: patch.sourceLabel || sourceMeta.label,
            sourceTone: patch.sourceTone || sourceMeta.tone,
            summaryBucket: patch.summaryBucket || sourceMeta.summaryBucket,
            origin,
            originLabel: ORIGIN_PRESENTATION[origin] || '',
            message: typeof patch.message === 'string' ? patch.message : current.message,
            error: typeof patch.error === 'string' ? patch.error : current.error,
            updatedAt: patch.updatedAt || new Date().toISOString(),
            usedRemote: shouldPreserveRemoteCache
                ? true
                : (typeof patch.usedRemote === 'boolean' ? patch.usedRemote : current.usedRemote),
            remoteVersionSource: patch.remoteVersionSource || current.remoteVersionSource,
            remoteVersionError: patch.remoteVersionError || current.remoteVersionError,
            endpoint: definition.endpoint,
            title: definition.titleAr || current.title,
            cacheMode: definition.cacheMode || current.cacheMode,
            versionKey: definition.versionKey || current.versionKey,
            cachedVersion: typeof patch.cachedVersion === 'string' ? patch.cachedVersion : current.cachedVersion,
            remoteVersion: typeof patch.remoteVersion === 'string' ? patch.remoteVersion : current.remoteVersion,
            stale,
            staleReason,
            staleReasonLabel
        };

        if (currentIndex >= 0) {
            draft.sections[currentIndex] = next;
        } else {
            draft.sections.push(next);
        }

        return draft;
    });
}

export function recordPublicContentFoundationSummary(summary = null) {
    if (!summary || typeof summary !== 'object') {
        return getPublicContentSourceStatus();
    }

    const remoteStatus = typeof summary.remoteVersionsStatus === 'string'
        ? summary.remoteVersionsStatus
        : 'idle';

    if (remoteStatus && remoteStatus !== 'idle') {
        recordRemoteVersionsStatus({
            status: summary.ok === false ? 'failed' : 'resolved',
            source: remoteStatus,
            syncedAt: summary.completedAt || new Date().toISOString(),
            error: summary.ok === false && Array.isArray(summary.failures) && summary.failures.length
                ? summary.failures.map((entry) => entry.message).filter(Boolean).join(' • ')
                : ''
        });
    }

    if (Array.isArray(summary.sections)) {
        summary.sections.forEach((entry) => {
            const source = entry.status === 'remote-cached'
                ? 'remote-cached'
                : entry.status === 'remote-fallback-local'
                    ? 'remote-fallback-local'
                    : entry.status;
            recordSectionSourceStatus(entry.sectionId, {
                version: entry.version,
                source,
                origin: entry.usedRemote ? 'remote' : (entry.status === 'cache-reused' ? 'cache' : 'local'),
                message: typeof entry.message === 'string' ? entry.message : '',
                error: entry.status === 'failed' ? (entry.message || 'Section initialization failed.') : '',
                pending: Boolean(summary.deferredWarmup && entry.status === 'version-synced'),
                usedRemote: Boolean(entry.usedRemote),
                updatedAt: summary.completedAt || new Date().toISOString(),
                remoteVersionSource: remoteStatus,
                cachedVersion: typeof entry.cachedVersion === 'string' ? entry.cachedVersion : undefined,
                remoteVersion: typeof entry.remoteVersion === 'string' ? entry.remoteVersion : undefined,
                stale: typeof entry.stale === 'boolean' ? entry.stale : undefined,
                staleReason: typeof entry.staleReason === 'string' ? entry.staleReason : undefined
            });
        });
    }

    return getPublicContentSourceStatus();
}

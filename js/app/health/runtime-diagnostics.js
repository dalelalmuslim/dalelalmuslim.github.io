import { appEventBus } from '../events/app-event-bus.js';
import { APP_CONFIG } from '../app-config.js';
import { appLogger } from '../../shared/logging/app-logger.js';
import { getPublicContentSourceStatus } from '../../services/content/content-source-observability.js';
import { getDiagnosticDescriptor, resolveLogDescriptor } from './runtime-diagnostic-codes.js';

const DIAGNOSTIC_LIMIT = 12;
const SUPPORT_LOG_LIMIT = 20;
const SUPPORT_STRING_LIMIT = 180;
const SUPPORT_PAYLOAD_PREVIEW_LIMIT = 4;
const DIAGNOSTIC_BADGE_CLASS = Object.freeze({
  healthy: 'settings__status-badge--refreshed',
  warning: 'settings__status-badge--checking',
  error: 'settings__status-badge--error'
});

function resolveAppApi(context, candidate) {
  if (candidate && typeof candidate.getElement === 'function') {
    return candidate;
  }

  if (context && typeof context.getElement === 'function') {
    return context;
  }

  return null;
}

function createDefaultRuntimeDiagnostics() {
  return {
    entries: [],
    counts: {
      warning: 0,
      error: 0,
      total: 0
    },
    byCode: {},
    bySource: {},
    lastUpdatedAt: null,
    lastCode: null,
    supportBundleCount: 0,
    lastBundleGeneratedAt: null
  };
}

function normalizeMessage(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value instanceof Error) {
    return value.message || value.name || 'Unknown error';
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable object]';
    }
  }

  return String(value || '').trim();
}

function truncateSupportText(value, maxLength = SUPPORT_STRING_LIMIT) {
  const normalized = normalizeMessage(value);
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function describePayloadValue(value) {
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (value instanceof Error) {
    return 'error';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value || {}).slice(0, 3);
    return keys.length ? `object{${keys.join(',')}}` : 'object';
  }

  if (typeof value === 'string') {
    return `string(${value.length})`;
  }

  return typeof value;
}

function sanitizeFailureEntries(entries = []) {
  return entries.slice(0, SUPPORT_PAYLOAD_PREVIEW_LIMIT).map((entry) => ({
    id: truncateSupportText(entry?.id || '', 64),
    task: truncateSupportText(entry?.task || '', 64),
    message: truncateSupportText(entry?.message || '', 160),
    error: truncateSupportText(entry?.error || '', 160),
    skipped: Boolean(entry?.skipped)
  }));
}

function sanitizeDiagnosticDetails(details = null) {
  if (!details || typeof details !== 'object') {
    return null;
  }

  const sanitized = {};

  if ('reason' in details) {
    sanitized.reason = truncateSupportText(details.reason, 160);
  }

  if ('error' in details) {
    sanitized.error = truncateSupportText(details.error, 160);
  }

  if ('sectionId' in details) {
    sanitized.sectionId = truncateSupportText(details.sectionId, 64);
  }

  if ('dateKey' in details) {
    sanitized.dateKey = truncateSupportText(details.dateKey, 64);
  }

  if ('persistent' in details) {
    sanitized.persistent = Boolean(details.persistent);
  }

  if ('recovered' in details) {
    sanitized.recovered = Boolean(details.recovered);
  }

  if ('usedLegacyKey' in details) {
    sanitized.usedLegacyKey = Boolean(details.usedLegacyKey);
  }

  if ('promotedToPrimary' in details) {
    sanitized.promotedToPrimary = Boolean(details.promotedToPrimary);
  }

  if ('deferredWarmup' in details) {
    sanitized.deferredWarmup = Boolean(details.deferredWarmup);
  }

  if (Array.isArray(details.failures) && details.failures.length) {
    sanitized.failures = sanitizeFailureEntries(details.failures);
  }

  if (Array.isArray(details.payload) && details.payload.length) {
    sanitized.payloadCount = details.payload.length;
    sanitized.payloadKinds = details.payload.slice(0, SUPPORT_PAYLOAD_PREVIEW_LIMIT).map(describePayloadValue);
  }

  return Object.keys(sanitized).length ? sanitized : null;
}

function sanitizeDiagnosticEntry(entry = {}) {
  return {
    code: truncateSupportText(entry.code || 'APP-000', 32),
    level: entry.level === 'error' ? 'error' : 'warning',
    source: truncateSupportText(entry.source || 'runtime', 64),
    category: truncateSupportText(entry.category || entry.source || 'runtime', 64),
    title: truncateSupportText(entry.title || 'تشخيص تشغيلي', 160),
    message: truncateSupportText(entry.message || 'لا توجد تفاصيل إضافية.', 220),
    action: truncateSupportText(entry.action || 'راجع حزمة الدعم لمزيد من التفاصيل.', 220),
    timestamp: entry.timestamp || null,
    details: sanitizeDiagnosticDetails(entry.details || null)
  };
}

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${date.toLocaleDateString('ar-EG')} ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
}

function createEntry(descriptor, message, meta = {}) {
  const normalizedDescriptor = descriptor || getDiagnosticDescriptor('APP_WARNING');
  const details = meta.details && typeof meta.details === 'object' ? meta.details : undefined;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    code: normalizedDescriptor.code,
    level: normalizedDescriptor.severity === 'error' ? 'error' : 'warning',
    severity: normalizedDescriptor.severity === 'error' ? 'error' : 'warning',
    source: meta.source || normalizedDescriptor.category || 'runtime',
    category: meta.category || normalizedDescriptor.category || 'runtime',
    title: normalizeMessage(meta.title || normalizedDescriptor.title) || 'تشخيص تشغيلي',
    message: normalizeMessage(message) || 'لا توجد تفاصيل إضافية.',
    action: normalizeMessage(meta.action || normalizedDescriptor.action) || 'راجع حزمة الدعم لمزيد من التفاصيل.',
    timestamp: meta.timestamp || new Date().toISOString(),
    details,
    scope: meta.scope || '',
    rawReason: normalizeMessage(meta.rawReason || '')
  };
}

function summarizeDiagnostics(state) {
  const warningCount = state?.counts?.warning || 0;
  const errorCount = state?.counts?.error || 0;
  const totalCount = state?.counts?.total || 0;

  if (errorCount > 0) {
    return {
      tone: 'error',
      label: 'يوجد أعطال',
      summary: `تم تسجيل ${errorCount} خطأ و${warningCount} تحذير (${totalCount} حادثة إجمالًا).`
    };
  }

  if (warningCount > 0) {
    return {
      tone: 'warning',
      label: 'تحت المراقبة',
      summary: `تم تسجيل ${warningCount} تحذير تشغيلي بدون أخطاء حرجة (${totalCount} حادثة).`
    };
  }

  return {
    tone: 'healthy',
    label: 'هادئ',
    summary: 'لا توجد حوادث تشغيلية حديثة تحتاج تدخلًا.'
  };
}

function createTag(text, className) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

function createListItem(entry) {
  const element = document.createElement('li');
  element.className = `settings__diagnostics-item settings__diagnostics-item--${entry.level}`;

  const head = document.createElement('div');
  head.className = 'settings__diagnostics-head';

  const headMain = document.createElement('div');
  headMain.className = 'settings__diagnostics-head-main';

  const title = document.createElement('strong');
  title.className = 'settings__diagnostics-title';
  title.textContent = entry.title;

  const tags = document.createElement('div');
  tags.className = 'settings__diagnostics-tags';
  tags.append(
    createTag(entry.code || 'APP-000', 'settings__diagnostics-code'),
    createTag(entry.level === 'error' ? 'خطأ' : 'تحذير', `settings__diagnostics-level settings__diagnostics-level--${entry.level}`)
  );

  headMain.append(title, tags);

  const message = document.createElement('p');
  message.className = 'settings__diagnostics-message';
  message.textContent = entry.message;

  const action = document.createElement('p');
  action.className = 'settings__diagnostics-action';
  action.textContent = `الإجراء المقترح: ${entry.action}`;

  const meta = document.createElement('p');
  meta.className = 'settings__diagnostics-meta';
  meta.textContent = `${entry.source || 'runtime'} • ${formatTimestamp(entry.timestamp)}`;

  element.append(head, headMain, message, action, meta);
  return element;
}

function renderList(appApi, entries = []) {
  const list = appApi.getElement('runtimeDiagnosticsList');
  if (!list) {
    return;
  }

  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'settings__diagnostics-empty';
    empty.textContent = 'لا توجد حوادث تشغيلية حديثة.';
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...entries.map(createListItem));
}

function setText(appApi, id, value) {
  const element = appApi.getElement(id);
  if (element) {
    element.textContent = String(value || '—');
  }
}

function renderSupportBundleSummary(appApi, state) {
  const lastEntry = (state?.entries || [])[0] || null;
  const summary = lastEntry
    ? `آخر رمز مرصود: ${lastEntry.code} (${lastEntry.source})`
    : 'لا توجد أعطال حديثة ضمن حزمة الدعم.';
  const generatedText = state?.lastBundleGeneratedAt
    ? `آخر توليد: ${formatTimestamp(state.lastBundleGeneratedAt)} • مرات النسخ/التصدير: ${state.supportBundleCount || 0}`
    : 'لم تُولد حزمة دعم بعد.';
  const badge = appApi.getElement('supportBundleStatusBadge');
  const status = summarizeDiagnostics(state);
  if (badge) {
    badge.textContent = state?.supportBundleCount ? 'محدّثة' : 'جاهز';
    badge.className = `settings__status-badge ${DIAGNOSTIC_BADGE_CLASS[status.tone]}`;
  }
  setText(appApi, 'supportBundleSummaryText', summary);
  setText(appApi, 'supportBundleMetaText', generatedText);
  setText(appApi, 'supportBundlePrivacyText', 'الحزمة مصممة لاستبعاد محتوى المستخدم وبيانات الحساب، وتصدر فقط ملخصات تشغيلية وأعطال مختصرة.');
}

export function renderRuntimeDiagnostics(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  const state = resolvedAppApi.runtimeDiagnostics || createDefaultRuntimeDiagnostics();
  const status = summarizeDiagnostics(state);
  const badge = resolvedAppApi.getElement('runtimeDiagnosticsStatusBadge');

  if (badge) {
    badge.textContent = status.label;
    badge.className = `settings__status-badge ${DIAGNOSTIC_BADGE_CLASS[status.tone]}`;
  }

  setText(resolvedAppApi, 'runtimeDiagnosticsSummaryText', status.summary);
  setText(resolvedAppApi, 'runtimeDiagnosticsUpdatedAtText', formatTimestamp(state.lastUpdatedAt));
  renderList(resolvedAppApi, state.entries || []);
  renderSupportBundleSummary(resolvedAppApi, state);
  return state;
}

function incrementObjectCount(record = {}, key) {
  if (!key) {
    return { ...record };
  }

  return {
    ...record,
    [key]: (record[key] || 0) + 1
  };
}

export function updateRuntimeDiagnostics(appApi, entry) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  const normalizedEntry = resolvedAppApi === appApi ? entry : appApi;
  if (!resolvedAppApi || !normalizedEntry) {
    return null;
  }

  const current = resolvedAppApi.runtimeDiagnostics || createDefaultRuntimeDiagnostics();
  const nextEntry = {
    ...normalizedEntry,
    code: normalizedEntry.code || 'APP-000',
    level: normalizedEntry.level === 'error' ? 'error' : 'warning',
    severity: normalizedEntry.level === 'error' ? 'error' : 'warning',
    timestamp: normalizedEntry.timestamp || new Date().toISOString(),
    source: normalizedEntry.source || 'runtime',
    category: normalizedEntry.category || normalizedEntry.source || 'runtime',
    action: normalizeMessage(normalizedEntry.action) || 'راجع حزمة الدعم لمزيد من التفاصيل.'
  };

  const next = {
    ...current,
    lastUpdatedAt: nextEntry.timestamp,
    lastCode: nextEntry.code,
    entries: [nextEntry, ...(current.entries || [])].slice(0, DIAGNOSTIC_LIMIT),
    counts: {
      warning: (current.counts?.warning || 0) + (nextEntry.level === 'warning' ? 1 : 0),
      error: (current.counts?.error || 0) + (nextEntry.level === 'error' ? 1 : 0),
      total: (current.counts?.total || 0) + 1
    },
    byCode: incrementObjectCount(current.byCode, nextEntry.code),
    bySource: incrementObjectCount(current.bySource, nextEntry.source)
  };

  resolvedAppApi.runtimeDiagnostics = next;
  renderRuntimeDiagnostics(resolvedAppApi);
  return next;
}

function buildStartupEntry(summary) {
  if (!summary || summary.ok) {
    return null;
  }

  const failed = (summary.failures || []).map((entry) => entry.id).filter(Boolean).join('، ');
  return createEntry(getDiagnosticDescriptor('STARTUP_FAILURE'), failed || 'تعذر إكمال مرحلة أو أكثر أثناء الإقلاع.', {
    source: 'startup',
    details: { failures: summary.failures || [] },
    rawReason: failed
  });
}

function buildStorageEntry(status) {
  if (!status) {
    return null;
  }

  if (status.fatal) {
    return createEntry(getDiagnosticDescriptor('STORAGE_FATAL'), status.reason || status.error || 'فشل حرج أثناء تهيئة التخزين المحلي.', {
      source: 'storage',
      details: {
        reason: status.reason || null,
        error: normalizeMessage(status.error || ''),
        persistent: Boolean(status.persistent)
      }
    });
  }

  if (!status.persistent) {
    return createEntry(getDiagnosticDescriptor('STORAGE_EPHEMERAL'), status.reason || 'localStorage غير متاحة حاليًا.', {
      source: 'storage',
      details: { reason: status.reason || null, persistent: false }
    });
  }

  if (status.recovered || status?.migration?.parseRecovered) {
    return createEntry(getDiagnosticDescriptor('STORAGE_RECOVERED'), status.reason || 'أصلح التطبيق حالة تخزين غير مستقرة أثناء التهيئة.', {
      source: 'storage',
      details: { reason: status.reason || null, recovered: true, error: normalizeMessage(status.error || '') }
    });
  }

  if (status?.migration?.usedLegacyKey) {
    return createEntry(getDiagnosticDescriptor('STORAGE_MIGRATED'), status.migration.sourceKey || 'تمت قراءة الحالة من مفتاح legacy ثم ترقيتها للمفتاح الحالي.', {
      source: 'storage',
      details: {
        usedLegacyKey: true,
        promotedToPrimary: Boolean(status.migration.promotedToPrimary),
        reason: status.reason || null
      }
    });
  }

  return null;
}

function buildDayCycleEntry(summary) {
  if (!summary || summary.ok) {
    return null;
  }

  const failed = (summary.failures || []).map((entry) => entry.task).filter(Boolean).join('، ');
  return createEntry(getDiagnosticDescriptor('DAY_CYCLE_PARTIAL'), failed || 'تعذر تحديث بعض المهام اليومية.', {
    source: 'day-cycle',
    details: { failures: summary.failures || [], dateKey: summary.dateKey || null }
  });
}

function buildContentFoundationEntry(summary) {
  if (!summary) {
    return null;
  }

  if (summary.ok === false) {
    const failed = (summary.failures || []).map((entry) => entry.sectionId).filter(Boolean).join('، ');
    return createEntry(getDiagnosticDescriptor('CONTENT_FOUNDATION_FAILURE'), failed || 'تعذر تجهيز قسم أو أكثر من أقسام المحتوى.', {
      source: 'content-foundation',
      details: { failures: summary.failures || [] }
    });
  }

  if (summary.deferredWarmup) {
    return createEntry(getDiagnosticDescriptor('CONTENT_FOUNDATION_DEFERRED'), 'تم تأجيل warmup لبعض أقسام المحتوى إلى الخلفية لتقليل زمن الإقلاع.', {
      source: 'content-foundation',
      details: { deferredWarmup: true }
    });
  }

  return null;
}

function buildSectionFailureEntry(payload = {}) {
  return createEntry(getDiagnosticDescriptor('SECTION_BOOT_FAILURE', {
    title: `فشل تشغيل القسم: ${payload.sectionId || 'unknown'}`
  }), payload.reason || payload.error || 'تعذر إكمال دورة تشغيل القسم.', {
    source: 'section',
    details: { sectionId: payload.sectionId || null, reason: normalizeMessage(payload.reason || payload.error || '') },
    rawReason: payload.reason || payload.error || ''
  });
}

function buildLogEntry(event) {
  const detail = event?.detail || event || {};
  const level = detail.level;
  if (level !== 'error' && level !== 'warn') {
    return null;
  }

  const descriptor = resolveLogDescriptor(detail);
  const scope = detail.scope || 'App';
  const message = detail.message || detail.error?.message || 'حدث خطأ تشغيلي.';
  return createEntry(descriptor, message, {
    source: scope,
    scope,
    details: {
      payload: Array.isArray(detail.payload) ? detail.payload.map(normalizeMessage).slice(0, 4) : [],
      error: normalizeMessage(detail.error || '')
    }
  });
}

function buildEnvironmentSnapshot() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const win = typeof window !== 'undefined' ? window : null;
  const doc = typeof document !== 'undefined' ? document : null;
  const standaloneMedia = typeof win?.matchMedia === 'function' ? win.matchMedia('(display-mode: standalone)').matches : false;
  return {
    language: nav?.language || 'unknown',
    online: typeof nav?.onLine === 'boolean' ? nav.onLine : null,
    standalone: Boolean(nav?.standalone || standaloneMedia),
    visibilityState: doc?.visibilityState || 'unknown',
    pathname: win?.location?.pathname || '/',
    hash: win?.location?.hash || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
  };
}

function sanitizeStartupSummary(summary = null) {
  if (!summary) {
    return null;
  }

  return {
    ok: summary.ok !== false,
    completedAt: summary.completedAt || null,
    failures: (summary.failures || []).map((entry) => ({
      id: entry.id || 'unknown',
      error: normalizeMessage(entry.error || ''),
      skipped: Boolean(entry.skipped)
    })),
    phases: (summary.phases || []).map((entry) => ({
      id: entry.id || 'unknown',
      ok: entry.ok !== false,
      skipped: Boolean(entry.skipped),
      dependsOn: Array.isArray(entry.dependsOn) ? entry.dependsOn.slice() : []
    }))
  };
}

function sanitizeStorageStatus(status = null) {
  if (!status) {
    return null;
  }

  return {
    ok: status.ok !== false,
    fatal: Boolean(status.fatal),
    persistent: status.persistent !== false,
    recovered: Boolean(status.recovered),
    stateChanged: Boolean(status.stateChanged),
    reason: normalizeMessage(status.reason || ''),
    error: normalizeMessage(status.error || ''),
    migration: status?.migration ? {
      sourceKey: normalizeMessage(status.migration.sourceKey || ''),
      usedLegacyKey: Boolean(status.migration.usedLegacyKey),
      promotedToPrimary: Boolean(status.migration.promotedToPrimary),
      parseRecovered: Boolean(status.migration.parseRecovered),
      schemaChanged: Boolean(status.migration.schemaChanged),
      hadExistingState: Boolean(status.migration.hadExistingState)
    } : null
  };
}

function sanitizeContentFoundationSummary(summary = null) {
  if (!summary) {
    return null;
  }

  return {
    ok: summary.ok !== false,
    completedAt: summary.completedAt || null,
    deferredWarmup: Boolean(summary.deferredWarmup),
    payloadCachedCount: Number(summary.payloadCachedCount || 0),
    cacheReusedCount: Number(summary.cacheReusedCount || 0),
    versionSyncedCount: Number(summary.versionSyncedCount || 0),
    versionOnlyCount: Number(summary.versionOnlyCount || 0),
    failedCount: Number(summary.failedCount || 0),
    failures: (summary.failures || []).map((entry) => ({
      sectionId: entry.sectionId || 'unknown',
      status: entry.status || 'failed',
      message: normalizeMessage(entry.message || '')
    })),
    sections: (summary.sections || []).map((entry) => ({
      sectionId: entry.sectionId || 'unknown',
      version: entry.version || '',
      status: entry.status || 'unknown'
    }))
  };
}

function sanitizeContentSourceSnapshot(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return {
    summary: snapshot.summary ? {
      tone: snapshot.summary.tone || 'idle',
      label: normalizeMessage(snapshot.summary.label || ''),
      text: normalizeMessage(snapshot.summary.text || ''),
      meta: normalizeMessage(snapshot.summary.meta || ''),
      lastUpdatedAt: snapshot.summary.lastUpdatedAt || null,
      remoteVersionsStatus: normalizeMessage(snapshot.summary.remoteVersionsStatus || ''),
      remoteVersionsSource: normalizeMessage(snapshot.summary.remoteVersionsSource || ''),
      refreshStatus: normalizeMessage(snapshot.summary.refreshStatus || '')
    } : null,
    remoteVersions: snapshot.remoteVersions ? {
      status: normalizeMessage(snapshot.remoteVersions.status || ''),
      source: normalizeMessage(snapshot.remoteVersions.source || ''),
      syncedAt: snapshot.remoteVersions.syncedAt || null,
      error: normalizeMessage(snapshot.remoteVersions.error || '')
    } : null,
    refresh: snapshot.refresh ? {
      status: normalizeMessage(snapshot.refresh.status || ''),
      startedAt: snapshot.refresh.startedAt || null,
      completedAt: snapshot.refresh.completedAt || null,
      error: normalizeMessage(snapshot.refresh.error || '')
    } : null,
    sections: Array.isArray(snapshot.sections) ? snapshot.sections.map((section) => ({
      sectionId: normalizeMessage(section.sectionId || ''),
      title: normalizeMessage(section.title || ''),
      versionKey: normalizeMessage(section.versionKey || ''),
      version: normalizeMessage(section.version || ''),
      source: normalizeMessage(section.source || ''),
      sourceLabel: normalizeMessage(section.sourceLabel || ''),
      sourceTone: normalizeMessage(section.sourceTone || ''),
      origin: normalizeMessage(section.origin || ''),
      endpoint: normalizeMessage(section.endpoint || ''),
      cacheMode: normalizeMessage(section.cacheMode || ''),
      message: normalizeMessage(section.message || ''),
      error: normalizeMessage(section.error || ''),
      updatedAt: section.updatedAt || null,
      usedRemote: Boolean(section.usedRemote),
      cachedVersion: normalizeMessage(section.cachedVersion || ''),
      remoteVersion: normalizeMessage(section.remoteVersion || ''),
      stale: Boolean(section.stale),
      staleReason: normalizeMessage(section.staleReason || ''),
      staleReasonLabel: normalizeMessage(section.staleReasonLabel || '')
    })) : []
  };
}

function sanitizeDayCycleSummary(summary = null) {
  if (!summary) {
    return null;
  }

  return {
    ok: summary.ok !== false,
    completedAt: summary.completedAt || null,
    dateKey: summary.dateKey || null,
    successes: Array.isArray(summary.successes) ? summary.successes.slice() : [],
    failures: (summary.failures || []).map((entry) => ({
      task: entry.task || 'unknown',
      message: normalizeMessage(entry.message || '')
    }))
  };
}

function getFilteredLogHistory() {
  return appLogger.getHistory()
    .filter((entry) => entry.level === 'warn' || entry.level === 'error')
    .slice(-SUPPORT_LOG_LIMIT)
    .map((entry) => ({
      level: entry.level === 'error' ? 'error' : 'warn',
      scope: truncateSupportText(entry.scope || 'App', 64),
      message: truncateSupportText(entry.message || '', 220),
      timestamp: entry.timestamp || null,
      error: truncateSupportText(entry.error || '', 180),
      payloadCount: Array.isArray(entry.payload) ? entry.payload.length : 0,
      payloadKinds: Array.isArray(entry.payload)
        ? entry.payload.slice(0, SUPPORT_PAYLOAD_PREVIEW_LIMIT).map(describePayloadValue)
        : []
    }));
}

export function buildSupportBundle(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  const diagnostics = resolvedAppApi.runtimeDiagnostics || createDefaultRuntimeDiagnostics();
  const runtimeHealth = resolvedAppApi.runtimeHealth || {};
  const startup = sanitizeStartupSummary(runtimeHealth.startup || resolvedAppApi.bootstrapStatus?.startup || null);
  const storage = sanitizeStorageStatus(runtimeHealth.storage || resolvedAppApi.storageStatus || resolvedAppApi.bootstrapStatus?.storage || null);
  const dayCycle = sanitizeDayCycleSummary(runtimeHealth.dayCycle || resolvedAppApi.bootstrapStatus?.dayCycle || null);
  const contentFoundation = sanitizeContentFoundationSummary(runtimeHealth.contentFoundation || resolvedAppApi.contentFoundationStatus || resolvedAppApi.bootstrapStatus?.contentFoundation || null);
  const contentSources = sanitizeContentSourceSnapshot(resolvedAppApi.contentSourceStatus || getPublicContentSourceStatus());

  const bundle = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    app: {
      name: APP_CONFIG.APP_NAME_EN,
      version: APP_CONFIG.APP_VERSION,
      schemaVersion: APP_CONFIG.SCHEMA_VERSION
    },
    environment: buildEnvironmentSnapshot(),
    runtime: {
      initialized: Boolean(resolvedAppApi.initialized),
      updateStatus: {
        state: resolvedAppApi.updateStatus?.state || 'idle',
        message: normalizeMessage(resolvedAppApi.updateStatus?.message || ''),
        detail: normalizeMessage(resolvedAppApi.updateStatus?.detail || '')
      },
      startup,
      storage,
      dayCycle,
      contentFoundation,
      contentSources,
      bootstrapStatus: {
        startupOk: startup?.ok !== false,
        storageFatal: Boolean(storage?.fatal),
        dayCycleOk: dayCycle?.ok !== false,
        contentFoundationOk: contentFoundation?.ok !== false
      }
    },
    diagnostics: {
      counts: diagnostics.counts || { warning: 0, error: 0, total: 0 },
      lastUpdatedAt: diagnostics.lastUpdatedAt || null,
      lastCode: diagnostics.lastCode || null,
      byCode: diagnostics.byCode || {},
      bySource: diagnostics.bySource || {},
      recentEntries: (diagnostics.entries || []).map((entry) => sanitizeDiagnosticEntry(entry))
    },
    logs: getFilteredLogHistory()
  };

  return bundle;
}

function formatSupportBundleText(bundle) {
  if (!bundle) {
    return 'تعذر إنشاء حزمة الدعم الحالية.';
  }

  const lines = [
    `${APP_CONFIG.APP_NAME_EN} Support Bundle`,
    `Generated At: ${bundle.generatedAt}`,
    `App Version: ${bundle.app.version}`,
    `Schema Version: ${bundle.app.schemaVersion}`,
    `Online: ${bundle.environment.online ? 'yes' : 'no'}`,
    `Content Sources: ${bundle.runtime.contentSources?.summary?.label || 'n/a'}`,
    `Content Sources Meta: ${bundle.runtime.contentSources?.summary?.meta || 'n/a'}`,
    `Content Refresh: ${bundle.runtime.contentSources?.refresh?.status || 'n/a'}`,
    `Standalone: ${bundle.environment.standalone ? 'yes' : 'no'}`,
    `Route: ${bundle.environment.pathname || '/'}${bundle.environment.hash || ''}`,
    `Storage Mode: ${bundle.runtime.storage?.persistent === false ? 'ephemeral' : 'persistent'}`,
    `Startup OK: ${bundle.runtime.startup?.ok === false ? 'no' : 'yes'}`,
    `Day Cycle OK: ${bundle.runtime.dayCycle?.ok === false ? 'no' : 'yes'}`,
    `Diagnostics Total: ${bundle.diagnostics.counts?.total || 0}`,
    `Diagnostics Errors: ${bundle.diagnostics.counts?.error || 0}`,
    `Diagnostics Warnings: ${bundle.diagnostics.counts?.warning || 0}`,
    '',
    'Recent Diagnostics:'
  ];

  if (!(bundle.diagnostics.recentEntries || []).length) {
    lines.push('1. No recent diagnostics entries.');
  } else {
    bundle.diagnostics.recentEntries.forEach((entry, index) => {
      lines.push(`${index + 1}. [${entry.code}] ${entry.title}`);
      lines.push(`   Level: ${entry.level} • Source: ${entry.source} • At: ${entry.timestamp}`);
      lines.push(`   Message: ${entry.message}`);
      lines.push(`   Suggested Action: ${entry.action}`);
    });
  }

  lines.push('', 'Content Source Sections:');
  if (!(bundle.runtime.contentSources?.sections || []).length) {
    lines.push('1. No content source sections recorded.');
  } else {
    bundle.runtime.contentSources.sections.forEach((section, index) => {
      lines.push(`${index + 1}. ${section.title || section.sectionId}`);
      lines.push(`   Source: ${section.sourceLabel || section.source} • Version: ${section.version || '—'} • Origin: ${section.origin || 'unknown'}`);
      if (section.cachedVersion || section.remoteVersion) {
        lines.push(`   Cache/Remote: ${section.cachedVersion || '—'} / ${section.remoteVersion || '—'}`);
      }
      if (section.stale) {
        lines.push(`   Stale: yes${section.staleReasonLabel ? ` • ${section.staleReasonLabel}` : ''}`);
      }
      if (section.message) {
        lines.push(`   Message: ${section.message}`);
      }
      if (section.error) {
        lines.push(`   Error: ${section.error}`);
      }
    });
  }

  lines.push('', 'Recent Log History:');
  if (!(bundle.logs || []).length) {
    lines.push('1. No recent warn/error log entries.');
  } else {
    bundle.logs.forEach((entry, index) => {
      lines.push(`${index + 1}. [${entry.level.toUpperCase()}] ${entry.scope} :: ${entry.message}`);
      lines.push(`   at ${entry.timestamp}`);
    });
  }

  return lines.join('\n');
}

function bumpSupportBundleMeta(appApi) {
  const state = appApi.runtimeDiagnostics || createDefaultRuntimeDiagnostics();
  appApi.runtimeDiagnostics = {
    ...state,
    supportBundleCount: (state.supportBundleCount || 0) + 1,
    lastBundleGeneratedAt: new Date().toISOString()
  };
  renderRuntimeDiagnostics(appApi);
}

export function buildRuntimeDiagnosticsReport(appApi) {
  const bundle = buildSupportBundle.call(this, appApi);
  return formatSupportBundleText(bundle);
}

export async function copyRuntimeDiagnostics(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return false;
  }

  const report = buildRuntimeDiagnosticsReport(resolvedAppApi);
  const copied = await resolvedAppApi.copyToClipboard?.(report);
  if (!copied) {
    return false;
  }

  bumpSupportBundleMeta(resolvedAppApi);
  return true;
}

export function downloadSupportBundle(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return false;
  }

  const bundle = buildSupportBundle(resolvedAppApi);
  if (!bundle) {
    return false;
  }

  const safeAppId = String(APP_CONFIG.APP_ID || 'dalil-almuslim').replace(/[^a-z0-9_-]/gi, '-');
  const fileName = `${safeAppId}-support-bundle-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const payload = JSON.stringify(bundle, null, 2);

  try {
    let didStartDownload = false;

    if (typeof document !== 'undefined' && typeof Blob === 'function' && globalThis.URL?.createObjectURL) {
      const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
      const href = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName;
      document.body?.append?.(link);
      if (typeof link.click === 'function') {
        link.click();
        didStartDownload = true;
      }
      link.remove?.();
      setTimeout(() => globalThis.URL.revokeObjectURL?.(href), 0);
    } else if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = `data:application/json;charset=utf-8,${encodeURIComponent(payload)}`;
      link.download = fileName;
      document.body?.append?.(link);
      if (typeof link.click === 'function') {
        link.click();
        didStartDownload = true;
      }
      link.remove?.();
    }

    if (!didStartDownload) {
      resolvedAppApi.showToast?.('تعذر تنزيل حزمة الدعم.', 'error');
      return false;
    }

    resolvedAppApi.showToast?.('تم تجهيز حزمة الدعم للتنزيل.', 'success');
    bumpSupportBundleMeta(resolvedAppApi);
    return true;
  } catch (error) {
    appLogger.error('[Diagnostics] Failed to download support bundle.', error);
    resolvedAppApi.showToast?.('تعذر تنزيل حزمة الدعم.', 'error');
    return false;
  }
}

export function setupRuntimeDiagnostics(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  if (resolvedAppApi.runtimeDiagnosticsSubscriptions) {
    return resolvedAppApi.runtimeDiagnostics;
  }

  resolvedAppApi.runtimeDiagnostics = createDefaultRuntimeDiagnostics();
  resolvedAppApi.runtimeDiagnosticsSubscriptions = [];

  const handleLog = (event) => {
    const entry = buildLogEntry(event);
    if (entry) {
      updateRuntimeDiagnostics(resolvedAppApi, entry);
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('azkar:log', handleLog);
    resolvedAppApi.runtimeDiagnosticsSubscriptions.push(() => window.removeEventListener?.('azkar:log', handleLog));
  }

  resolvedAppApi.runtimeDiagnosticsSubscriptions.push(
    appEventBus.on('app:startup', (summary) => {
      const entry = buildStartupEntry(summary);
      if (entry) {
        updateRuntimeDiagnostics(resolvedAppApi, entry);
      }
    })
  );

  resolvedAppApi.runtimeDiagnosticsSubscriptions.push(
    appEventBus.on('app:storage-status', (status) => {
      const entry = buildStorageEntry(status);
      if (entry) {
        updateRuntimeDiagnostics(resolvedAppApi, entry);
      }
    })
  );

  resolvedAppApi.runtimeDiagnosticsSubscriptions.push(
    appEventBus.on('app:day-cycle', (summary) => {
      const entry = buildDayCycleEntry(summary);
      if (entry) {
        updateRuntimeDiagnostics(resolvedAppApi, entry);
      }
    })
  );

  resolvedAppApi.runtimeDiagnosticsSubscriptions.push(
    appEventBus.on('app:content-foundation', (summary) => {
      const entry = buildContentFoundationEntry(summary);
      if (entry) {
        updateRuntimeDiagnostics(resolvedAppApi, entry);
      }
    })
  );

  resolvedAppApi.runtimeDiagnosticsSubscriptions.push(
    appEventBus.on('app:section-boot-failure', (payload) => {
      updateRuntimeDiagnostics(resolvedAppApi, buildSectionFailureEntry(payload));
    })
  );

  renderRuntimeDiagnostics(resolvedAppApi);
  return resolvedAppApi.runtimeDiagnostics;
}

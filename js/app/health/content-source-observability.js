import {
  getPublicContentSourceStatus,
  subscribePublicContentSourceStatus
} from '../../services/content/content-source-observability.js';

const CONTENT_SOURCE_BADGE_CLASS = Object.freeze({
  healthy: 'settings__status-badge--refreshed',
  warning: 'settings__status-badge--checking',
  error: 'settings__status-badge--error',
  idle: 'settings__status-badge--idle'
});

const CONTENT_SOURCE_LEVEL_CLASS = Object.freeze({
  healthy: 'settings__diagnostics-level',
  warning: 'settings__diagnostics-level settings__diagnostics-level--warning',
  error: 'settings__diagnostics-level settings__diagnostics-level--error',
  idle: 'settings__diagnostics-level'
});

const REFRESH_BADGE_LABEL = Object.freeze({
  idle: 'جاهز',
  running: 'جاري المزامنة',
  success: 'تم التحديث',
  warning: 'تم مع ملاحظات',
  error: 'فشل التحديث'
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

function formatLocalTimestamp(value) {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function setText(appApi, id, value) {
  const element = appApi.getElement(id);
  if (element) {
    element.textContent = String(value || '—');
  }
}

function setButtonBusy(button, busy, labels = {}) {
  if (!button) return;

  const idleLabel = labels.idle || button.dataset.idleLabel || button.textContent.trim();
  const busyLabel = labels.busy || button.dataset.busyLabel || 'جاري التنفيذ...';

  button.dataset.idleLabel = idleLabel;
  button.dataset.busyLabel = busyLabel;
  button.disabled = Boolean(busy);
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  button.textContent = busy ? busyLabel : idleLabel;
}

function createMetaTag(text, className = 'settings__diagnostics-code') {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

function buildSectionMeta(section) {
  const parts = [];
  if (section.version) {
    parts.push(`الإصدار الحالي: ${section.version}`);
  }
  if (section.cachedVersion) {
    parts.push(`Cache: ${section.cachedVersion}`);
  }
  if (section.remoteVersion) {
    parts.push(`Remote: ${section.remoteVersion}`);
  }
  if (section.originLabel) {
    parts.push(section.originLabel);
  }
  if (section.endpoint) {
    parts.push(section.endpoint);
  }
  parts.push(`آخر تحديث: ${formatLocalTimestamp(section.updatedAt)}`);
  return parts.join(' • ');
}

function buildRefreshMeta(snapshot) {
  const refresh = snapshot?.refresh || {};
  const parts = [];

  parts.push(`الحالة: ${REFRESH_BADGE_LABEL[refresh.status] || 'جاهز'}`);

  if (refresh.startedAt) {
    parts.push(`بدأت: ${formatLocalTimestamp(refresh.startedAt)}`);
  }

  if (refresh.completedAt) {
    parts.push(`اكتملت: ${formatLocalTimestamp(refresh.completedAt)}`);
  }

  if (refresh.error) {
    parts.push(refresh.error);
  }

  return parts.join(' • ') || 'جاهز للمزامنة اليدوية عند الحاجة.';
}

function createEmptyStateItem() {
  const element = document.createElement('li');
  element.className = 'settings__diagnostics-empty';
  element.textContent = 'لم تُسجل أقسام محتوى بعد.';
  return element;
}

function createSectionItem(section) {
  const item = document.createElement('li');
  const borderTone = section.sourceTone === 'error'
    ? ' settings__diagnostics-item--error'
    : section.sourceTone === 'warning'
      ? ' settings__diagnostics-item--warning'
      : '';
  item.className = `settings__diagnostics-item${borderTone}`;

  const head = document.createElement('div');
  head.className = 'settings__diagnostics-head';

  const headMain = document.createElement('div');
  headMain.className = 'settings__diagnostics-head-main';

  const title = document.createElement('strong');
  title.className = 'settings__diagnostics-title';
  title.textContent = section.title || section.sectionId;

  const tags = document.createElement('div');
  tags.className = 'settings__diagnostics-tags';
  tags.append(
    createMetaTag(section.sectionId),
    createMetaTag(section.cacheMode === 'payload' ? 'Payload cache' : 'Version only')
  );

  if (section.stale) {
    tags.append(createMetaTag('Stale', 'settings__diagnostics-level settings__diagnostics-level--warning'));
  }

  headMain.append(title, tags);

  const level = document.createElement('span');
  level.className = CONTENT_SOURCE_LEVEL_CLASS[section.sourceTone] || CONTENT_SOURCE_LEVEL_CLASS.idle;
  level.textContent = section.sourceLabel || '—';

  head.append(headMain, level);

  const message = document.createElement('p');
  message.className = 'settings__diagnostics-message';
  message.textContent = section.message
    || section.staleReasonLabel
    || (section.error ? section.error : 'لا توجد ملاحظات تشغيلية على هذا القسم.');

  const meta = document.createElement('p');
  meta.className = 'settings__diagnostics-meta';
  meta.textContent = buildSectionMeta(section);

  item.append(head, message, meta);
  return item;
}

export function renderContentSourceObservability(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  const snapshot = getPublicContentSourceStatus();
  resolvedAppApi.contentSourceStatus = snapshot;

  const badge = resolvedAppApi.getElement('contentSourceStatusBadge');
  if (badge) {
    const tone = snapshot.summary?.tone || 'idle';
    badge.textContent = snapshot.summary?.label || 'قيد التهيئة';
    badge.className = `settings__status-badge ${CONTENT_SOURCE_BADGE_CLASS[tone] || CONTENT_SOURCE_BADGE_CLASS.idle}`;
  }

  setText(resolvedAppApi, 'contentSourceSummaryText', snapshot.summary?.text || 'لم تُسجل حالة مصادر المحتوى بعد.');
  setText(resolvedAppApi, 'contentSourceMetaText', snapshot.summary?.meta || 'لا توجد أقسام مسجلة.');
  setText(resolvedAppApi, 'contentSourceRefreshMetaText', buildRefreshMeta(snapshot));

  const refreshButton = resolvedAppApi.getElement('refreshContentBtn');
  setButtonBusy(refreshButton, snapshot.refresh?.status === 'running', {
    idle: 'مزامنة المحتوى الآن',
    busy: 'جاري المزامنة...'
  });

  const list = resolvedAppApi.getElement('contentSourceList');
  if (list) {
    list.replaceChildren();
    const sections = Array.isArray(snapshot.sections) ? snapshot.sections : [];
    if (!sections.length) {
      list.append(createEmptyStateItem());
    } else {
      sections.forEach((section) => list.append(createSectionItem(section)));
    }
  }

  return snapshot;
}

export function setupContentSourceObservability(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  if (resolvedAppApi.contentSourceStatusSubscription) {
    return renderContentSourceObservability(resolvedAppApi);
  }

  resolvedAppApi.contentSourceStatusSubscription = subscribePublicContentSourceStatus((snapshot) => {
    resolvedAppApi.contentSourceStatus = snapshot;
    renderContentSourceObservability(resolvedAppApi);
    resolvedAppApi.renderRuntimeHealth?.();
    resolvedAppApi.renderRuntimeDiagnostics?.();
  }, { emitCurrent: true });

  return renderContentSourceObservability(resolvedAppApi);
}

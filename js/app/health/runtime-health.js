import { appEventBus } from '../events/app-event-bus.js';
import { listFeatureStartupPlans } from '../../features/feature-startup-plan.js';

const HEALTH_BADGE_CLASS = Object.freeze({
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

function createDefaultRuntimeHealth() {
  return {
    startup: null,
    storage: null,
    dayCycle: null,
    contentFoundation: null,
    features: {
      total: listFeatureStartupPlans().length,
      bootedIds: [],
      lastBootedId: null,
      lastFailureId: null,
      failedIds: []
    },
    logs: {
      warnCount: 0,
      errorCount: 0,
      lastLevel: 'info',
      lastMessage: ''
    }
  };
}

function dedupeIds(ids = []) {
  return [...new Set(ids.filter(Boolean))];
}

function summarizeHealth(runtimeHealth) {
  const startupOk = runtimeHealth?.startup?.ok !== false;
  const storagePersistent = runtimeHealth?.storage?.persistent !== false;
  const dayCycleOk = runtimeHealth?.dayCycle?.ok !== false;
  const contentFoundationOk = runtimeHealth?.contentFoundation?.ok !== false;
  const contentFoundationDeferred = Boolean(runtimeHealth?.contentFoundation?.deferredWarmup);
  const hasErrors = (runtimeHealth?.logs?.errorCount || 0) > 0 || (runtimeHealth?.features?.failedIds?.length || 0) > 0;
  const hasWarnings = !storagePersistent || !dayCycleOk || contentFoundationDeferred || (runtimeHealth?.logs?.warnCount || 0) > 0;

  if (!startupOk || !contentFoundationOk || hasErrors) {
    return {
      tone: 'error',
      label: 'يحتاج تدخل',
      summary: 'هناك أعطال تشغيلية مسجلة وتحتاج متابعة.'
    };
  }

  if (hasWarnings) {
    return {
      tone: 'warning',
      label: 'تنبيه',
      summary: 'التطبيق يعمل مع ملاحظات تشغيلية أو قيود مؤقتة.'
    };
  }

  return {
    tone: 'healthy',
    label: 'مستقر',
    summary: 'التهيئة والتخزين والتحديثات اليومية تعمل ضمن الحدود المتوقعة.'
  };
}

function setText(appApi, id, value) {
  const element = appApi.getElement(id);
  if (element) {
    element.textContent = String(value || '—');
  }
}

function formatStartupText(startup) {
  if (!startup) {
    return 'لم تُسجل بعد.';
  }

  if (!startup.ok) {
    const failed = startup.failures?.map((entry) => entry.id).filter(Boolean).join('، ');
    return failed ? `فشلت مراحل: ${failed}` : 'فشلت بعض مراحل التهيئة.';
  }

  const completed = startup.phases?.length || 0;
  return `اكتملت ${completed} مرحلة تشغيل بنجاح.`;
}

function formatStorageText(storage) {
  if (!storage) {
    return 'لم تُسجل بعد.';
  }

  if (storage.fatal) {
    return 'التخزين المحلي غير جاهز، وتم إيقاف التهيئة.';
  }

  if (!storage.persistent) {
    return 'الوضع الحالي مؤقت بدون حفظ دائم.';
  }

  if (storage.recovered) {
    return 'تمت استعادة بيانات التطبيق بعد مشكلة سابقة.';
  }

  return 'التخزين المحلي الدائم يعمل بشكل طبيعي.';
}

function formatDayCycleText(dayCycle) {
  if (!dayCycle?.completedAt) {
    return 'لم يحدث انتقال يومي منذ آخر تشغيل.';
  }

  if (!dayCycle.ok) {
    const failed = dayCycle.failures?.map((entry) => entry.task).filter(Boolean).join('، ');
    return failed ? `فشل تحديث: ${failed}` : 'تعذر تحديث بعض الأقسام تلقائيًا.';
  }

  return `آخر تحديث يومي نجح (${dayCycle.successes?.length || 0} مهمة).`;
}

function formatContentFoundationText(summary) {
  if (!summary?.completedAt) {
    return 'لم تُسجل مزامنة المحتوى بعد.';
  }

  if (!summary.ok) {
    const failed = (summary.failures || []).map((entry) => entry.sectionId).filter(Boolean).join('، ');
    return failed ? `فشل تهيئة: ${failed}` : 'تعذر تجهيز طبقة المحتوى.';
  }

  const sectionCount = Array.isArray(summary.sections) ? summary.sections.length : 0;
  if (summary.deferredWarmup) {
    return `تمت مزامنة ${sectionCount} أقسام مع warmup خلفي لبعض الـ payload.`;
  }

  return `تمت مزامنة ${sectionCount} أقسام محتوى بدون أخطاء.`;
}

function formatFeaturesText(features) {
  const bootedCount = features?.bootedIds?.length || 0;
  const total = features?.total || 0;
  const lastBootedId = features?.lastBootedId;
  const failedCount = features?.failedIds?.length || 0;

  if (failedCount > 0) {
    return `تم تشغيل ${bootedCount}/${total} أقسام، مع فشل آخر في ${features.failedIds[features.failedIds.length - 1]}.`;
  }

  if (lastBootedId) {
    return `تم تشغيل ${bootedCount}/${total} أقسام، وآخر قسم جُهز: ${lastBootedId}.`;
  }

  return `لم تُشغل أي أقسام بعد (${bootedCount}/${total}).`;
}

function formatLogsText(logs) {
  const warnCount = logs?.warnCount || 0;
  const errorCount = logs?.errorCount || 0;
  const lastMessage = logs?.lastMessage || '';

  if (errorCount === 0 && warnCount === 0) {
    return 'لا توجد تحذيرات أو أخطاء تشغيلية مسجلة.';
  }

  const counts = [`تحذيرات: ${warnCount}`, `أخطاء: ${errorCount}`].join(' • ');
  return lastMessage ? `${counts} • آخر رسالة: ${lastMessage}` : counts;
}

export function renderRuntimeHealth(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  const runtimeHealth = resolvedAppApi.runtimeHealth || createDefaultRuntimeHealth();
  const status = summarizeHealth(runtimeHealth);
  const badge = resolvedAppApi.getElement('runtimeHealthStatusBadge');

  if (badge) {
    badge.textContent = status.label;
    badge.className = `settings__status-badge ${HEALTH_BADGE_CLASS[status.tone]}`;
  }

  setText(resolvedAppApi, 'runtimeHealthSummaryText', status.summary);
  setText(resolvedAppApi, 'runtimeHealthStartupText', formatStartupText(runtimeHealth.startup));
  setText(resolvedAppApi, 'runtimeHealthStorageText', formatStorageText(runtimeHealth.storage));
  setText(resolvedAppApi, 'runtimeHealthDayCycleText', formatDayCycleText(runtimeHealth.dayCycle));
  setText(resolvedAppApi, 'runtimeHealthContentText', formatContentFoundationText(runtimeHealth.contentFoundation));
  setText(resolvedAppApi, 'runtimeHealthFeaturesText', formatFeaturesText(runtimeHealth.features));
  setText(resolvedAppApi, 'runtimeHealthLogsText', formatLogsText(runtimeHealth.logs));
  return runtimeHealth;
}

export function updateRuntimeHealth(appApi, patch = {}) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  const normalizedPatch = resolvedAppApi === appApi ? patch : (appApi || {});
  if (!resolvedAppApi) {
    return null;
  }

  const current = resolvedAppApi.runtimeHealth || createDefaultRuntimeHealth();
  const next = {
    ...current,
    ...normalizedPatch,
    startup: normalizedPatch.startup ?? current.startup,
    storage: normalizedPatch.storage ?? current.storage,
    dayCycle: normalizedPatch.dayCycle ?? current.dayCycle,
    contentFoundation: normalizedPatch.contentFoundation ?? current.contentFoundation,
    features: {
      ...current.features,
      ...(normalizedPatch.features || {})
    },
    logs: {
      ...current.logs,
      ...(normalizedPatch.logs || {})
    }
  };

  next.features.bootedIds = dedupeIds(next.features.bootedIds);
  next.features.failedIds = dedupeIds(next.features.failedIds);
  resolvedAppApi.runtimeHealth = next;
  renderRuntimeHealth(resolvedAppApi);
  return next;
}

function buildLogHealth(entry, currentLogs = {}) {
  const level = entry?.detail?.level || entry?.level || 'info';
  const message = entry?.detail?.message || entry?.message || '';
  return {
    warnCount: currentLogs.warnCount + (level === 'warn' ? 1 : 0),
    errorCount: currentLogs.errorCount + (level === 'error' ? 1 : 0),
    lastLevel: level,
    lastMessage: message
  };
}

export function recordStartupHealth(appApi, summary) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  const normalizedSummary = resolvedAppApi === appApi ? summary : appApi;
  if (!resolvedAppApi) {
    return null;
  }

  return updateRuntimeHealth(resolvedAppApi, { startup: normalizedSummary || null });
}

export function recordStorageHealth(appApi, status) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  const normalizedStatus = resolvedAppApi === appApi ? status : appApi;
  if (!resolvedAppApi) {
    return null;
  }

  return updateRuntimeHealth(resolvedAppApi, { storage: normalizedStatus || null });
}

export function recordContentFoundationHealth(appApi, summary) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  const normalizedSummary = resolvedAppApi === appApi ? summary : appApi;
  if (!resolvedAppApi) {
    return null;
  }

  return updateRuntimeHealth(resolvedAppApi, { contentFoundation: normalizedSummary || null });
}

export function setupRuntimeHealth(appApi) {
  const resolvedAppApi = resolveAppApi(this, appApi);
  if (!resolvedAppApi) {
    return null;
  }

  if (resolvedAppApi.runtimeHealthSubscriptions) {
    return resolvedAppApi.runtimeHealth;
  }

  resolvedAppApi.runtimeHealth = createDefaultRuntimeHealth();
  resolvedAppApi.runtimeHealthSubscriptions = [];

  const handleLog = (event) => {
    const currentLogs = resolvedAppApi.runtimeHealth?.logs || { warnCount: 0, errorCount: 0, lastLevel: 'info', lastMessage: '' };
    updateRuntimeHealth(resolvedAppApi, {
      logs: buildLogHealth(event, currentLogs)
    });
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('azkar:log', handleLog);
    resolvedAppApi.runtimeHealthSubscriptions.push(() => window.removeEventListener?.('azkar:log', handleLog));
  }

  resolvedAppApi.runtimeHealthSubscriptions.push(
    appEventBus.on('app:day-cycle', (summary) => {
      updateRuntimeHealth(resolvedAppApi, { dayCycle: summary || null });
    })
  );

  resolvedAppApi.runtimeHealthSubscriptions.push(
    appEventBus.on('app:content-foundation', (summary) => {
      updateRuntimeHealth(resolvedAppApi, { contentFoundation: summary || null });
    })
  );

  resolvedAppApi.runtimeHealthSubscriptions.push(
    appEventBus.on('app:startup', (summary) => {
      updateRuntimeHealth(resolvedAppApi, { startup: summary || null });
    })
  );

  resolvedAppApi.runtimeHealthSubscriptions.push(
    appEventBus.on('app:section-boot', (payload = {}) => {
      const currentFeatures = resolvedAppApi.runtimeHealth?.features || createDefaultRuntimeHealth().features;
      updateRuntimeHealth(resolvedAppApi, {
        features: {
          ...currentFeatures,
          bootedIds: dedupeIds([...(currentFeatures.bootedIds || []), payload.sectionId]),
          lastBootedId: payload.sectionId || currentFeatures.lastBootedId,
          failedIds: (currentFeatures.failedIds || []).filter((featureId) => featureId !== payload.sectionId)
        }
      });
    })
  );

  resolvedAppApi.runtimeHealthSubscriptions.push(
    appEventBus.on('app:section-boot-failure', (payload = {}) => {
      const currentFeatures = resolvedAppApi.runtimeHealth?.features || createDefaultRuntimeHealth().features;
      updateRuntimeHealth(resolvedAppApi, {
        features: {
          ...currentFeatures,
          lastFailureId: payload.sectionId || currentFeatures.lastFailureId,
          failedIds: dedupeIds([...(currentFeatures.failedIds || []), payload.sectionId])
        }
      });
    })
  );

  renderRuntimeHealth(resolvedAppApi);
  return resolvedAppApi.runtimeHealth;
}

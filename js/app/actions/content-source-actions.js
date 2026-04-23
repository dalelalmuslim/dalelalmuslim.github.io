import { getFeatureCapabilities } from '../../features/index.js';
import { getCurrentSection } from '../ui/ui-state.js';
import { appLogger } from '../../shared/logging/app-logger.js';

function refreshVisibleSection(appApi) {
    const currentSectionId = getCurrentSection();

    if (!currentSectionId || currentSectionId === 'home') {
        getFeatureCapabilities('home')?.refreshDailyContent?.();
        getFeatureCapabilities('home')?.refreshSurface?.();
        return;
    }

    if (currentSectionId === 'settings') {
        appApi.renderContentSourceObservability?.();
        appApi.renderRuntimeHealth?.();
        appApi.renderRuntimeDiagnostics?.();
        return;
    }

    appApi.runSectionLifecycle?.(currentSectionId, {
        reason: 'content-refresh',
        previousSectionId: currentSectionId
    });
}

export async function refreshPublicContent(appApi) {
    if (this !== appApi && appApi && typeof appApi.getElement === 'function') {
        return refreshPublicContent.call(appApi, appApi);
    }

    const resolvedAppApi = this && typeof this.getElement === 'function' ? this : appApi;
    if (!resolvedAppApi?.content?.refreshPublicContentFoundation) {
        return null;
    }

    if (resolvedAppApi.contentRefreshInFlight) {
        resolvedAppApi.showToast?.('مزامنة المحتوى تعمل بالفعل الآن.', 'info');
        return resolvedAppApi.contentRefreshInFlight;
    }

    resolvedAppApi.showToast?.('جاري مزامنة المحتوى من المصدر العام...', 'info');

    const task = Promise.resolve(resolvedAppApi.content.refreshPublicContentFoundation())
        .then((summary) => {
            refreshVisibleSection(resolvedAppApi);
            resolvedAppApi.renderContentSourceObservability?.();
            resolvedAppApi.renderRuntimeHealth?.();
            resolvedAppApi.renderRuntimeDiagnostics?.();

            const snapshot = resolvedAppApi.content.getPublicContentSourceSnapshot?.();
            const staleCount = Number(snapshot?.summary?.counts?.stale || 0);
            const hasWarnings = Boolean(summary?.failedCount || summary?.remoteFallbackCount || staleCount || snapshot?.summary?.tone === 'warning');

            resolvedAppApi.showToast?.(
                hasWarnings
                    ? 'تمت مزامنة المحتوى مع بقاء بعض الأقسام بحاجة إلى refresh إضافي.'
                    : 'تمت مزامنة المحتوى بنجاح.',
                hasWarnings ? 'warning' : 'success'
            );

            return summary;
        })
        .catch((error) => {
            appLogger.error('[App] Manual content refresh failed.', error);
            resolvedAppApi.renderContentSourceObservability?.();
            resolvedAppApi.renderRuntimeHealth?.();
            resolvedAppApi.renderRuntimeDiagnostics?.();
            resolvedAppApi.showToast?.('تعذر مزامنة المحتوى الآن. راجع حالة المصادر في الإعدادات.', 'error');
            throw error;
        })
        .finally(() => {
            resolvedAppApi.contentRefreshInFlight = null;
        });

    resolvedAppApi.contentRefreshInFlight = task;
    return task;
}

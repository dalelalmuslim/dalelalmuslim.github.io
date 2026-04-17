import { appLogger } from '../shared/logging/app-logger.js';
import { appEventBus } from '../app/events/app-event-bus.js';
import { getFeatureStartupPlan } from '../features/feature-startup-plan.js';
import { getSectionDefinition, listSectionIds } from './section-registry.js';

function createSectionContext(sectionId, appApi, runtime, meta = {}) {
    const previousSectionId = meta.previousSectionId ?? runtime.activeSectionId ?? null;

    return Object.freeze({
        sectionId,
        previousSectionId,
        reason: meta.reason || 'navigation',
        app: appApi,
        runtime,
        bootState: runtime.bootState,
        isReentry: previousSectionId === sectionId
    });
}

function reportSectionLifecycleError(appApi, sectionId, phase, error) {
    appLogger.error(`[SectionRuntime] Failed during ${phase} for section "${sectionId}".`, error);
    appEventBus.emit('app:section-boot-failure', { sectionId, phase, error: error?.message || String(error || 'Unknown section lifecycle failure') });
    appApi?.showToast?.('حدث خطأ أثناء فتح القسم. حاول مرة أخرى.', 'error');
}

function runSectionPhase(section, phase, context, appApi) {
    const handler = section?.[phase];
    if (typeof handler !== 'function') {
        return true;
    }

    try {
        const result = handler(context);
        return result !== false;
    } catch (error) {
        reportSectionLifecycleError(appApi, context.sectionId, phase, error);
        return false;
    }
}

function ensureSectionBooted(sectionId, nextSection, appApi, runtime, meta = {}) {
    if (runtime.bootState[sectionId]) {
        return true;
    }

    const plan = getFeatureStartupPlan(sectionId);
    const dependencies = plan?.dependsOn || [];
    for (const dependencyId of dependencies) {
        const dependencySection = getSectionDefinition(dependencyId);
        if (!dependencySection) {
            appEventBus.emit('app:section-boot-failure', { sectionId, reason: `Unknown dependency: ${dependencyId}` });
            return false;
        }

        const dependencyBooted = ensureSectionBooted(dependencyId, dependencySection, appApi, runtime, {
            ...meta,
            reason: meta.reason || 'dependency-boot',
            previousSectionId: meta.previousSectionId ?? runtime.activeSectionId
        });

        if (!dependencyBooted) {
            appEventBus.emit('app:section-boot-failure', { sectionId, reason: `Blocked by dependency: ${dependencyId}` });
            return false;
        }
    }

    const context = createSectionContext(sectionId, appApi, runtime, {
        ...meta,
        previousSectionId: meta.previousSectionId ?? runtime.activeSectionId
    });

    const initialized = runSectionPhase(nextSection, 'init', context, appApi);
    if (!initialized) {
        appEventBus.emit('app:section-boot-failure', { sectionId, reason: 'init-failed' });
        return false;
    }

    runtime.bootState[sectionId] = true;
    appEventBus.emit('app:section-boot', { sectionId, dependsOn: dependencies, bootMode: plan?.bootMode || 'route-lazy' });
    return true;
}

export function createSectionRuntime() {
    return {
        activeSectionId: null,
        bootState: Object.fromEntries(
            listSectionIds().map(sectionId => [sectionId, Boolean(getSectionDefinition(sectionId)?.booted)])
        )
    };
}

export function runSectionLifecycle(sectionId, appApi, runtime, meta = {}) {
    const nextSection = getSectionDefinition(sectionId);
    if (!nextSection || !runtime) return false;

    const previousSectionId = runtime.activeSectionId;
    const previousSection = getSectionDefinition(previousSectionId);

    if (previousSection && previousSectionId !== sectionId) {
        const leftPrevious = runSectionPhase(
            previousSection,
            'leave',
            createSectionContext(previousSectionId, appApi, runtime, {
                ...meta,
                previousSectionId
            }),
            appApi
        );

        if (!leftPrevious) {
            return false;
        }
    }

    const booted = ensureSectionBooted(sectionId, nextSection, appApi, runtime, {
        ...meta,
        previousSectionId
    });
    if (!booted) {
        return false;
    }

    const phase = previousSectionId === sectionId
        ? (nextSection.refresh ? 'refresh' : 'enter')
        : 'enter';

    const transitioned = runSectionPhase(
        nextSection,
        phase,
        createSectionContext(sectionId, appApi, runtime, {
            ...meta,
            previousSectionId
        }),
        appApi
    );

    if (!transitioned) {
        return false;
    }

    runtime.activeSectionId = sectionId;
    return true;
}

export function disposeSection(sectionId, appApi, runtime, meta = {}) {
    const section = getSectionDefinition(sectionId);
    if (!section || !runtime?.bootState?.[sectionId]) return false;

    const disposed = runSectionPhase(
        section,
        'dispose',
        createSectionContext(sectionId, appApi, runtime, {
            ...meta,
            previousSectionId: runtime.activeSectionId
        }),
        appApi
    );

    if (!disposed) {
        return false;
    }

    runtime.bootState[sectionId] = false;
    if (runtime.activeSectionId === sectionId) {
        runtime.activeSectionId = null;
    }

    return true;
}

export function disposeAllSections(appApi, runtime, meta = {}) {
    return listSectionIds().map(sectionId => disposeSection(sectionId, appApi, runtime, meta));
}

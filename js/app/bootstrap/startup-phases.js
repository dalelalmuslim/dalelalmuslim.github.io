import { appLogger } from '../../shared/logging/app-logger.js';
import { appEventBus } from '../events/app-event-bus.js';

function createPhaseError(phaseId, message) {
  return new Error(`[StartupPhases] ${phaseId}: ${message}`);
}

function assertValidPhaseDefinition(phase) {
  if (!phase || typeof phase !== 'object') {
    throw createPhaseError('unknown', 'Each startup phase must be an object.');
  }

  if (!phase.id || typeof phase.id !== 'string') {
    throw createPhaseError('unknown', 'Each startup phase must declare a stable id.');
  }

  if (typeof phase.run !== 'function') {
    throw createPhaseError(phase.id, 'Each startup phase must provide a run(appApi) function.');
  }

  if (phase.dependsOn && !Array.isArray(phase.dependsOn)) {
    throw createPhaseError(phase.id, 'dependsOn must be an array when provided.');
  }
}

export function validateStartupPhases(phases = []) {
  const ids = new Set();
  const phaseMap = new Map();

  phases.forEach((phase) => {
    assertValidPhaseDefinition(phase);
    if (ids.has(phase.id)) {
      throw createPhaseError(phase.id, 'Duplicate startup phase id detected.');
    }

    ids.add(phase.id);
    phaseMap.set(phase.id, phase);
  });

  phases.forEach((phase) => {
    const dependencies = phase.dependsOn || [];
    dependencies.forEach((dependencyId) => {
      if (!phaseMap.has(dependencyId)) {
        throw createPhaseError(phase.id, `Unknown dependency "${dependencyId}".`);
      }

      if (dependencyId === phase.id) {
        throw createPhaseError(phase.id, 'A startup phase cannot depend on itself.');
      }
    });
  });

  const visiting = new Set();
  const visited = new Set();

  function visit(phaseId, trail = []) {
    if (visited.has(phaseId)) {
      return;
    }

    if (visiting.has(phaseId)) {
      throw createPhaseError(phaseId, `Circular dependency detected: ${[...trail, phaseId].join(' -> ')}`);
    }

    visiting.add(phaseId);
    const phase = phaseMap.get(phaseId);
    const dependencies = phase?.dependsOn || [];
    dependencies.forEach((dependencyId) => visit(dependencyId, [...trail, phaseId]));
    visiting.delete(phaseId);
    visited.add(phaseId);
  }

  phases.forEach((phase) => visit(phase.id));
  return Object.freeze(phases.map((phase) => Object.freeze({ ...phase, dependsOn: Object.freeze([...(phase.dependsOn || [])]) })));
}

async function runPhase(phase, appApi) {
  const startedAt = new Date().toISOString();

  try {
    const result = await phase.run(appApi);
    return {
      id: phase.id,
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      dependsOn: [...(phase.dependsOn || [])],
      result: result ?? null
    };
  } catch (error) {
    appLogger.error(`[Startup] Phase failed: ${phase.id}`, error);
    return {
      id: phase.id,
      ok: false,
      startedAt,
      completedAt: new Date().toISOString(),
      dependsOn: [...(phase.dependsOn || [])],
      error: error?.message || String(error || 'Unknown startup failure')
    };
  }
}

export async function runStartupPhases(appApi, phases = []) {
  const normalizedPhases = validateStartupPhases(phases);
  const results = [];
  const failures = [];

  for (const phase of normalizedPhases) {
    const blockedDependency = (phase.dependsOn || []).find((dependencyId) => results.some((entry) => entry.id === dependencyId && entry.ok === false));
    if (blockedDependency) {
      const blockedResult = {
        id: phase.id,
        ok: false,
        skipped: true,
        dependsOn: [...(phase.dependsOn || [])],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: `Blocked by failed dependency: ${blockedDependency}`
      };
      results.push(blockedResult);
      failures.push(blockedResult);
      continue;
    }

    const result = await runPhase(phase, appApi);
    results.push(result);
    if (!result.ok) {
      failures.push(result);
    }
  }

  const summary = {
    ok: failures.length === 0,
    phases: results,
    failures,
    completedAt: new Date().toISOString()
  };

  appApi.bootstrapStatus = {
    ...(appApi.bootstrapStatus || {}),
    startup: summary
  };

  appEventBus.emit('app:startup', summary);
  return summary;
}

export const STARTUP_PHASES = validateStartupPhases([
  {
    id: 'register-shell',
    run(appApi) {
      appApi.registerShell?.();
      return { registered: true };
    }
  },
  {
    id: 'app-init',
    dependsOn: ['register-shell'],
    run(appApi) {
      appApi.init();
      return { initialized: Boolean(appApi.initialized) };
    }
  },
  {
    id: 'content-foundation',
    dependsOn: ['app-init'],
    async run(appApi) {
      const summary = await appApi.syncContentFoundation?.();
      const resolvedSummary = summary || { ok: true, sections: [] };
      appApi.recordContentFoundationHealth?.(resolvedSummary);
      appEventBus.emit('app:content-foundation', resolvedSummary);
      return resolvedSummary;
    }
  },
  {
    id: 'background-services',
    dependsOn: ['app-init'],
    run(appApi) {
      appApi.startBackgroundServices?.();
      return { started: true };
    }
  },
  {
    id: 'pwa-init',
    dependsOn: ['app-init'],
    run(appApi) {
      appApi.initPwa?.();
      return { started: true };
    }
  }
]);

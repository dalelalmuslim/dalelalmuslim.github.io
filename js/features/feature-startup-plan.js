import { APP_CONFIG } from '../app/app-config.js';

const ALLOWED_BOOT_MODES = Object.freeze(['startup-route', 'route-lazy', 'background']);
const STARTUP_PHASE_IDS = new Set(['register-shell', 'app-init', 'content-foundation', 'background-services', 'pwa-init']);

const FEATURE_CATALOG = Object.freeze([
  { id: 'home', title: APP_CONFIG.APP_NAME_AR },
  { id: 'masbaha', title: 'المسبحة الذكية' },
  { id: 'azkar', title: 'الأذكار اليومية' },
  { id: 'duas', title: 'الأدعية' },
  { id: 'quran', title: 'القرآن الكريم' },
  { id: 'tasks', title: 'المهام اليومية' },
  { id: 'stats', title: 'الإحصائيات والمتابعة' },
  { id: 'names', title: 'أسماء الله الحسنى' },
  { id: 'stories', title: 'قصص وعبر' },
  { id: 'settings', title: 'حسابي' }
]);

const FEATURE_STARTUP_OVERRIDES = Object.freeze({
  home: { bootMode: 'startup-route', startupPhase: 'app-init', dependsOn: [] },
  masbaha: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  azkar: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  duas: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  quran: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  tasks: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  stats: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  names: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  stories: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] },
  settings: { bootMode: 'route-lazy', startupPhase: 'app-init', dependsOn: [] }
});

function createFeaturePlanError(featureId, message) {
  return new Error(`[FeatureStartupPlan] ${featureId}: ${message}`);
}

function buildFeatureStartupPlans() {
  return FEATURE_CATALOG.map((feature) => {
    const override = FEATURE_STARTUP_OVERRIDES[feature.id] || {};
    return {
      id: feature.id,
      title: feature.title,
      bootMode: override.bootMode || 'route-lazy',
      startupPhase: override.startupPhase || 'app-init',
      dependsOn: [...(override.dependsOn || [])],
      critical: Boolean(override.critical)
    };
  });
}

export function validateFeatureStartupPlans(plans = []) {
  const featureIds = new Set(FEATURE_CATALOG.map((feature) => feature.id));
  const planMap = new Map();

  plans.forEach((plan) => {
    if (!plan || typeof plan !== 'object') {
      throw createFeaturePlanError('unknown', 'Each feature startup plan must be an object.');
    }

    if (!plan.id || typeof plan.id !== 'string') {
      throw createFeaturePlanError('unknown', 'Each feature startup plan must declare a stable id.');
    }

    if (!featureIds.has(plan.id)) {
      throw createFeaturePlanError(plan.id, 'Unknown feature id.');
    }

    if (planMap.has(plan.id)) {
      throw createFeaturePlanError(plan.id, 'Duplicate feature startup plan id detected.');
    }

    if (!ALLOWED_BOOT_MODES.includes(plan.bootMode)) {
      throw createFeaturePlanError(plan.id, `Unsupported boot mode "${plan.bootMode}".`);
    }

    if (!STARTUP_PHASE_IDS.has(plan.startupPhase)) {
      throw createFeaturePlanError(plan.id, `Unknown startup phase "${plan.startupPhase}".`);
    }

    if (!Array.isArray(plan.dependsOn)) {
      throw createFeaturePlanError(plan.id, 'dependsOn must be an array.');
    }

    planMap.set(plan.id, {
      id: plan.id,
      title: plan.title || FEATURE_CATALOG.find((feature) => feature.id === plan.id)?.title || plan.id,
      bootMode: plan.bootMode,
      startupPhase: plan.startupPhase,
      dependsOn: [...plan.dependsOn],
      critical: Boolean(plan.critical)
    });
  });

  FEATURE_CATALOG.forEach((feature) => {
    if (!planMap.has(feature.id)) {
      throw createFeaturePlanError(feature.id, 'Missing feature startup plan.');
    }
  });

  planMap.forEach((plan) => {
    plan.dependsOn.forEach((dependencyId) => {
      if (!planMap.has(dependencyId)) {
        throw createFeaturePlanError(plan.id, `Unknown feature dependency "${dependencyId}".`);
      }

      if (dependencyId === plan.id) {
        throw createFeaturePlanError(plan.id, 'A feature cannot depend on itself.');
      }
    });
  });

  const visiting = new Set();
  const visited = new Set();

  function visit(featureId, trail = []) {
    if (visited.has(featureId)) {
      return;
    }

    if (visiting.has(featureId)) {
      throw createFeaturePlanError(featureId, `Circular dependency detected: ${[...trail, featureId].join(' -> ')}`);
    }

    visiting.add(featureId);
    const plan = planMap.get(featureId);
    (plan?.dependsOn || []).forEach((dependencyId) => visit(dependencyId, [...trail, featureId]));
    visiting.delete(featureId);
    visited.add(featureId);
  }

  planMap.forEach((_plan, featureId) => visit(featureId));

  return Object.freeze(
    [...planMap.values()].map((plan) => Object.freeze({ ...plan, dependsOn: Object.freeze([...plan.dependsOn]) }))
  );
}

export const FEATURE_STARTUP_PLANS = validateFeatureStartupPlans(buildFeatureStartupPlans());
const FEATURE_STARTUP_PLAN_MAP = Object.freeze(Object.fromEntries(FEATURE_STARTUP_PLANS.map((plan) => [plan.id, plan])));

export function getFeatureStartupPlan(featureId) {
  return FEATURE_STARTUP_PLAN_MAP[featureId] || null;
}

export function listFeatureStartupPlans() {
  return FEATURE_STARTUP_PLANS.slice();
}

export function listFeatureStartupPlanIds() {
  return FEATURE_STARTUP_PLANS.map((plan) => plan.id);
}

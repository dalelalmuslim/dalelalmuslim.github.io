import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const startupPlanUrl = pathToFileURL(path.join(ROOT, 'js', 'features', 'feature-startup-plan.js')).href;
const featuresIndexPath = path.join(ROOT, 'js', 'features', 'index.js');

async function main() {
  const { FEATURE_STARTUP_PLANS, validateFeatureStartupPlans } = await import(startupPlanUrl);
  const plans = validateFeatureStartupPlans(FEATURE_STARTUP_PLANS);
  const featuresIndex = await import('node:fs/promises').then(({ readFile }) => readFile(featuresIndexPath, 'utf8'));
  const exportedFeatureIds = [...featuresIndex.matchAll(/\b([a-z]+)Feature\b/g)].map((match) => match[1]).filter((value) => value !== 'define').filter((value, index, array) => array.indexOf(value) === index);
  const missingPlans = exportedFeatureIds.filter((featureId) => !plans.some((plan) => plan.id === featureId));
  if (missingPlans.length > 0) {
    throw new Error(`Missing startup plans for features: ${missingPlans.join(', ')}`);
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    featureCount: plans.length,
    ids: plans.map((plan) => plan.id),
    bootModes: Object.fromEntries(plans.reduce((acc, plan) => {
      acc.set(plan.bootMode, (acc.get(plan.bootMode) || 0) + 1);
      return acc;
    }, new Map())),
    startupPhases: [...new Set(plans.map((plan) => plan.startupPhase))],
    dependencyPairs: plans.flatMap((plan) => plan.dependsOn.map((dependencyId) => ({ from: plan.id, to: dependencyId })))
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

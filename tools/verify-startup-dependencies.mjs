import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const startupPhasesUrl = pathToFileURL(path.join(ROOT, 'js', 'app', 'bootstrap', 'startup-phases.js')).href;

async function main() {
  const { STARTUP_PHASES, validateStartupPhases } = await import(startupPhasesUrl);
  const phases = validateStartupPhases(STARTUP_PHASES);
  const ids = phases.map((phase) => phase.id);
  const dependencyPairs = phases.flatMap((phase) => (phase.dependsOn || []).map((dependencyId) => ({ from: phase.id, to: dependencyId })));

  process.stdout.write(JSON.stringify({
    ok: true,
    phaseCount: phases.length,
    ids,
    dependencyPairs
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

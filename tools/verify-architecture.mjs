import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const JS_ROOT = path.join(ROOT, 'js');
const STATE_ROOT = path.join(JS_ROOT, 'state');
const GENERATED_SW_MANIFEST = path.join(ROOT, 'sw-manifest.js');
const GENERATED_INDEX = path.join(ROOT, 'index.html');
const GENERATED_APP_CSS = path.join(ROOT, 'css', 'app.css');
const KNOWN_ENTRYPOINTS = new Set(['js/main.js']);
const LEGACY_IMPORT_PATTERNS = [
  '/content.js',
  '/tasks.js',
  '/quran.js',
  '/masbaha.js',
  '/storage.js',
  '/notifications.js',
  '/achievements.js',
  '/rewards.js',
  '/ads.js',
  '/firebase-core.js',
  '/app.js',
  'js/ui-state.js'
];

async function walk(dir, matcher = () => true) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(full, matcher));
    } else if (matcher(full)) {
      out.push(full);
    }
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function isExampleFile(file) {
  return rel(file).includes('.example.');
}

function extractImports(code) {
  const imports = [];
  const regex = /(?:import\s+(?:[^'"`]+?\s+from\s+)?|export\s+(?:[^'"`]+?\s+from\s+))['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;
  for (const match of code.matchAll(regex)) {
    imports.push(match[1] || match[2]);
  }
  return imports;
}

function resolveImport(fromFile, spec) {
  let resolved = path.resolve(path.dirname(fromFile), spec);
  if (!path.extname(resolved)) {
    resolved += '.js';
  }
  return resolved;
}

async function runNodeCheck(file) {
  return await new Promise((resolve) => {
    const child = spawn('node', ['--check', file], { stdio: 'pipe' });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, stderr });
    });
  });
}

async function runCommand(command, args) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function collectLegacyFiles() {
  const legacyDirs = [path.join(JS_ROOT, 'tasks')];
  const found = [];

  for (const dir of legacyDirs) {
    try {
      const files = await walk(dir, () => true);
      found.push(...files.map((file) => rel(file)));
    } catch {
      // directory absent is the desired state
    }
  }

  return found.sort();
}

async function collectStateFiles() {
  try {
    const files = await walk(STATE_ROOT, () => true);
    return files.map((file) => rel(file)).sort();
  } catch {
    return [];
  }
}

function getFeatureIdFromPath(file) {
  const parts = rel(file).split('/');
  const featureIndex = parts.indexOf('features');
  if (featureIndex < 0) return null;
  const candidate = parts[featureIndex + 1] || null;
  const afterCandidate = parts[featureIndex + 2] || null;
  if (!candidate || !afterCandidate) return null;
  return candidate;
}

async function main() {
  const jsFiles = await walk(JS_ROOT, (f) => f.endsWith('.js'));
  const extraFiles = [path.join(ROOT, 'sw.js')];
  const filesToCheck = [...jsFiles, ...extraFiles];

  const syntaxErrors = [];
  for (const file of filesToCheck) {
    const result = await runNodeCheck(file);
    if (result.code !== 0) {
      syntaxErrors.push({ file: rel(file), error: result.stderr.trim() });
    }
  }

  const missingLocalImports = [];
  const legacyRuntimeImports = [];
  const stateLayerImports = [];
  const crossFeatureImports = [];
  const inboundCounts = new Map(filesToCheck.map((file) => [rel(file), 0]));

  for (const file of jsFiles) {
    const code = await fs.readFile(file, 'utf8');
    for (const spec of extractImports(code)) {
      if (!spec.startsWith('.')) continue;
      const target = resolveImport(file, spec);
      const targetRel = rel(target);
      inboundCounts.set(targetRel, (inboundCounts.get(targetRel) || 0) + 1);
      try {
        await fs.access(target);
      } catch {
        missingLocalImports.push({ from: rel(file), spec, target: targetRel });
      }
      if (LEGACY_IMPORT_PATTERNS.some((pattern) => targetRel.endsWith(pattern))) {
        legacyRuntimeImports.push({ from: rel(file), target: targetRel });
      }

      if (targetRel.startsWith('js/state/')) {
        stateLayerImports.push({ from: rel(file), target: targetRel });
      }

      const fromFeature = getFeatureIdFromPath(file);
      const toFeature = getFeatureIdFromPath(target);
      if (fromFeature && toFeature && fromFeature !== toFeature) {
        crossFeatureImports.push({ from: rel(file), target: targetRel, fromFeature, toFeature });
      }
    }
  }

  const legacyFiles = await collectLegacyFiles();
  const stateFiles = await collectStateFiles();

  const swManifestExists = await fs.access(GENERATED_SW_MANIFEST).then(() => true).catch(() => false);
  const indexExists = await fs.access(GENERATED_INDEX).then(() => true).catch(() => false);
  const appCssExists = await fs.access(GENERATED_APP_CSS).then(() => true).catch(() => false);
  const appCssCheck = await runCommand('node', ['tools/build-app-css.mjs', '--check']);
  const indexCheck = await runCommand('node', ['tools/build-index.mjs', '--check']);
  const swManifestCheck = await runCommand('node', ['tools/build-sw-manifest.mjs', '--check']);
  const domSafetyCheck = await runCommand('node', ['tools/verify-dom-safety.mjs']);
  const externalBoundariesCheck = await runCommand('node', ['tools/verify-external-boundaries.mjs']);
  const browserModuleGraphCheck = await runCommand('node', ['tools/verify-browser-module-graph.mjs']);
  const startupDependenciesCheck = await runCommand('node', ['tools/verify-startup-dependencies.mjs']);
  const featureStartupPlanCheck = await runCommand('node', ['tools/verify-feature-startup-plan.mjs']);
  const staleGeneratedAppCss = appCssCheck.code !== 0;
  const staleGeneratedIndex = indexCheck.code !== 0;
  const staleGeneratedSwManifest = swManifestCheck.code !== 0;

  const swUrlRegex = /\.\/[^'"`\s)]+/g;
  const swFiles = [path.join(ROOT, 'sw.js')];
  if (swManifestExists) {
    swFiles.push(GENERATED_SW_MANIFEST);
  }
  const swUrls = [];
  for (const swFile of swFiles) {
    const swCode = await fs.readFile(swFile, 'utf8');
    for (const match of swCode.matchAll(swUrlRegex)) {
      swUrls.push(match[0]);
    }
  }
  const uniqueSwUrls = [...new Set(swUrls)].sort();
  const missingSwUrls = [];
  for (const url of uniqueSwUrls) {
    if (url === './') continue;
    const file = path.join(ROOT, url.replace(/^\.\//, ''));
    try {
      await fs.access(file);
    } catch {
      missingSwUrls.push(url.replace(/^\.\//, ''));
    }
  }

  const html = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const inlineHandlers = [...html.matchAll(/\son[a-z]+\s*=/gi)].map((match) => match[0].trim());
  const inlineStyleMatches = [...html.matchAll(/\sstyle\s*=/gi)];

  const zeroInboundJsFiles = [...inboundCounts.entries()]
    .filter(([file, count]) => file.startsWith('js/') && count === 0)
    .map(([file]) => file)
    .filter((file) => !KNOWN_ENTRYPOINTS.has(file))
    .filter((file) => !file.includes('.example.'))
    .sort();

  const results = {
    syntaxCheckedFiles: filesToCheck.length,
    syntaxErrors,
    missingLocalImports,
    legacyRuntimeImports,
    stateLayerImports,
    crossFeatureImports,
    swManifestExists,
    indexExists,
    appCssExists,
    staleGeneratedAppCss,
    staleGeneratedIndex,
    staleGeneratedSwManifest,
    appCssCheckMessage: appCssCheck.stderr || appCssCheck.stdout,
    indexCheckMessage: indexCheck.stderr || indexCheck.stdout,
    swManifestCheckMessage: swManifestCheck.stderr || swManifestCheck.stdout,
    domSafetyCheckMessage: domSafetyCheck.stderr || domSafetyCheck.stdout,
    externalBoundariesCheckMessage: externalBoundariesCheck.stderr || externalBoundariesCheck.stdout,
    browserModuleGraphCheckMessage: browserModuleGraphCheck.stderr || browserModuleGraphCheck.stdout,
    startupDependenciesCheckMessage: startupDependenciesCheck.stderr || startupDependenciesCheck.stdout,
    featureStartupPlanCheckMessage: featureStartupPlanCheck.stderr || featureStartupPlanCheck.stdout,
    missingSwUrls,
    legacyFiles,
    stateFiles,
    inlineHandlersCount: inlineHandlers.length,
    inlineStylesCount: inlineStyleMatches.length,
    zeroInboundJsFiles
  };

  console.log(JSON.stringify(results, null, 2));

  const hasFailures = syntaxErrors.length
    || missingLocalImports.length
    || legacyRuntimeImports.length
    || stateLayerImports.length
    || missingSwUrls.length
    || crossFeatureImports.length
    || inlineHandlers.length
    || legacyFiles.length
    || stateFiles.length
    || !swManifestExists
    || staleGeneratedAppCss
    || staleGeneratedIndex
    || staleGeneratedSwManifest
    || domSafetyCheck.code !== 0
    || externalBoundariesCheck.code !== 0
    || browserModuleGraphCheck.code !== 0
    || startupDependenciesCheck.code !== 0
    || featureStartupPlanCheck.code !== 0;
  process.exitCode = hasFailures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

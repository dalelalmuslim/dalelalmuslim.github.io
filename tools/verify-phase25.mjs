import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const JS_ROOT = path.join(ROOT, 'js');
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
  '/ui-state.js'
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

function extractImports(code) {
  const imports = [];
  const regex = /import\s+(?:[^'"`]+?\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;
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
    }
  }

  const swCode = await fs.readFile(path.join(ROOT, 'sw.js'), 'utf8');
  const swUrlRegex = /'\.\/([^']+)'/g;
  const swUrls = [];
  for (const match of swCode.matchAll(swUrlRegex)) {
    swUrls.push(match[1]);
  }
  const uniqueSwUrls = [...new Set(swUrls)];
  const missingSwUrls = [];
  for (const url of uniqueSwUrls) {
    const file = path.join(ROOT, url);
    try {
      await fs.access(file);
    } catch {
      missingSwUrls.push(url);
    }
  }

  const results = {
    syntaxCheckedFiles: filesToCheck.length,
    syntaxErrors,
    missingLocalImports,
    legacyRuntimeImports,
    missingSwUrls,
    zeroInboundJsFiles: [...inboundCounts.entries()]
      .filter(([file, count]) => file.startsWith('js/') && count === 0)
      .map(([file]) => file)
      .sort()
  };

  console.log(JSON.stringify(results, null, 2));

  const hasFailures = syntaxErrors.length || missingLocalImports.length || legacyRuntimeImports.length || missingSwUrls.length;
  process.exitCode = hasFailures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

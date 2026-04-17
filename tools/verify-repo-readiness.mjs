import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_FILES = Object.freeze([
  'package.json',
  '.gitignore',
  '.gitattributes',
  '.nvmrc',
  'README.md',
  'wrangler.toml',
  'manifest.json',
  'functions/api/health.js',
  'functions/api/public/versions.js',
  'docs/setup/repo-and-deploy-sequence.md'
]);

function exists(filePath) {
  return fs.existsSync(path.resolve(process.cwd(), filePath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
}

function normalizeNodeVersion(raw) {
  return String(raw || '').trim();
}

function checkScripts(packageJson) {
  const scripts = packageJson?.scripts || {};
  return {
    hasCheck: typeof scripts.check === 'string',
    hasBuildShellCheck: typeof scripts['build:shell:check'] === 'string',
    hasRepoReadiness: typeof scripts['verify:repo-readiness'] === 'string',
    hasLocalReady: typeof scripts['ready:local'] === 'string'
  };
}

function main() {
  const missingFiles = REQUIRED_FILES.filter((filePath) => !exists(filePath));
  const packageJson = exists('package.json') ? readJson('package.json') : null;
  const wranglerToml = exists('wrangler.toml') ? readText('wrangler.toml') : '';
  const nvmrc = exists('.nvmrc') ? normalizeNodeVersion(readText('.nvmrc')) : '';
  const hasGitDirectory = exists('.git');
  const scripts = packageJson ? checkScripts(packageJson) : {};
  const hasPagesBuildDir = /pages_build_output_dir\s*=\s*['\"].+['\"]/m.test(wranglerToml);
  const report = {
    ok: missingFiles.length === 0
      && Boolean(packageJson)
      && scripts.hasCheck
      && scripts.hasBuildShellCheck
      && scripts.hasRepoReadiness
      && scripts.hasLocalReady
      && Boolean(nvmrc)
      && hasPagesBuildDir,
    missingFiles,
    scripts,
    nodeVersion: nvmrc || null,
    hasGitDirectory,
    hasPagesBuildDir,
    guidance: {
      githubReady: missingFiles.length === 0 && Boolean(packageJson) && Boolean(nvmrc),
      cloudflareReady: missingFiles.length === 0 && Boolean(packageJson) && Boolean(nvmrc) && hasPagesBuildDir
    }
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();

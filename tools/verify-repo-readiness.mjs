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
  'functions/api/public/content/app-config.js',
  'functions/api/public/content/azkar.js',
  'functions/api/public/content/duas.js',
  'functions/api/public/content/stories.js',
  'functions/api/public/content/daily-content.js',
  'tools/verify-pages-functions.mjs',
  'tools/verify-content-client-remote.mjs',
  'tools/verify-content-observability.mjs',
  'tools/verify-content-refresh.mjs',
  'tools/verify-d1-foundation.mjs',
  'tools/generate-d1-public-content-seed.mjs',
  'd1/migrations/0001_public_content_schema.sql',
  'd1/seed/public-content.seed.json',
  'd1/seed/0001_public_content_seed.sql',
  'docs/cloudflare/d1-public-content-foundation.md',
  'docs/setup/repo-and-deploy-sequence.md',
  'docs/deploy/manual-cloudflare-direct-upload.md',
  'docs/deploy/deploy-targets.md',
  'tools/build-dist.mjs',
  'tools/verify-dist-package.mjs',
  'tools/create-release-archive.mjs',
  'tools/run-typecheck.mjs'
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
    hasLocalReady: typeof scripts['ready:local'] === 'string',
    hasBuildDist: typeof scripts['build:dist'] === 'string',
    hasVerifyDist: typeof scripts['verify:dist'] === 'string',
    hasReleaseZip: typeof scripts['release:zip'] === 'string',
    hasManualCloudflareRelease: typeof scripts['release:manual-cloudflare'] === 'string',
    hasVerifyPagesFunctions: typeof scripts['verify:pages-functions'] === 'string',
    hasVerifyContentClient: typeof scripts['verify:content-client'] === 'string',
    hasVerifyContentObservability: typeof scripts['verify:content-observability'] === 'string',
    hasVerifyContentRefresh: typeof scripts['verify:content-refresh'] === 'string',
    hasVerifyD1Foundation: typeof scripts['verify:d1-foundation'] === 'string',
    hasGenerateD1Seed: typeof scripts['generate:d1-seed'] === 'string'
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
      && scripts.hasBuildDist
      && scripts.hasVerifyDist
      && scripts.hasReleaseZip
      && scripts.hasManualCloudflareRelease
      && scripts.hasVerifyPagesFunctions
      && scripts.hasVerifyContentClient
      && scripts.hasVerifyContentObservability
      && scripts.hasVerifyContentRefresh
      && scripts.hasVerifyD1Foundation
      && scripts.hasGenerateD1Seed
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

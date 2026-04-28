import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DIST_DIR_ENTRIES, DIST_FILE_ENTRIES } from './release-manifest.mjs';

const ROOT = process.cwd();

async function read(relativePath) {
  return await fs.readFile(path.join(ROOT, relativePath), 'utf8');
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function nodeCheck(relativePath) {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--check', relativePath], {
      cwd: ROOT,
      stdio: 'pipe'
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => resolve({ code, stderr: stderr.trim() }));
  });
}

function assertNoInlineUnsafeHtml(html) {
  const inlineHandlers = html.match(/\son[a-z]+\s*=/gi) || [];
  const inlineStyles = html.match(/\sstyle\s*=/gi) || [];
  assert.equal(inlineHandlers.length, 0, 'admin.html must not use inline event handlers');
  assert.equal(inlineStyles.length, 0, 'admin.html must not use inline style attributes');
}

async function main() {
  const requiredFiles = [
    '_headers',
    'admin.html',
    'admin/admin.css',
    'admin/admin.js',
    'tools/verify-admin-content-ui.mjs'
  ];

  for (const file of requiredFiles) {
    assert.equal(await exists(file), true, `${file} should exist`);
  }

  const adminHtml = await read('admin.html');
  const adminJs = await read('admin/admin.js');
  const headers = await read('_headers');
  const swRoutes = await read('sw-routes.js');
  const robots = await read('robots.txt');

  assertNoInlineUnsafeHtml(adminHtml);

  assert.match(adminHtml, /<meta[^>]+Content-Security-Policy/i, 'admin.html should declare CSP meta tag');
  assert.match(adminHtml, /frame-ancestors 'none'/, 'admin CSP should deny framing');
  assert.match(adminHtml, /<script type="module" src="admin\/admin\.js"><\/script>/, 'admin.html should load admin module');
  assert.doesNotMatch(adminHtml, /https?:\/\//i, 'admin.html should not load third-party resources');
  assert.doesNotMatch(adminHtml, /manifest\.json|serviceWorker|sw\.js/i, 'admin shell must not register or reference PWA assets');

  const jsCheck = await nodeCheck('admin/admin.js');
  assert.equal(jsCheck.code, 0, jsCheck.stderr || 'admin/admin.js should pass node --check');

  assert.match(adminJs, /credentials:\s*'same-origin'/, 'admin API calls should include same-origin credentials');
  assert.match(adminJs, /cache:\s*'no-store'/, 'admin API calls should use no-store');
  assert.match(adminJs, /\/api\/admin\/whoami/, 'admin UI should verify identity via whoami');
  assert.match(adminJs, /\/api\/admin\/public-content\/preview/, 'admin UI should call preview endpoint');
  assert.match(adminJs, /\/api\/admin\/public-content\/publish/, 'admin UI should call publish endpoint');
  assert.doesNotMatch(adminJs, /innerHTML\s*=/, 'admin UI must not assign innerHTML');
  assert.doesNotMatch(adminJs, /\.style\s*[.=]/, 'admin UI must not mutate inline styles under strict CSP');
  assert.doesNotMatch(adminJs, /localStorage|sessionStorage/, 'admin UI must not persist admin payloads in browser storage');

  assert.match(headers, /\/admin\n[\s\S]*Cache-Control:\s*no-store/i, '_headers should no-store /admin clean route');
  assert.match(headers, /\/admin\n[\s\S]*Content-Security-Policy:/i, '_headers should set CSP for /admin clean route');
  assert.match(headers, /\/admin\.html[\s\S]*Cache-Control:\s*no-store/i, '_headers should no-store admin.html');
  assert.match(headers, /\/admin\/\*[\s\S]*Content-Security-Policy:/i, '_headers should set CSP for admin assets');
  assert.match(headers, /\/api\/admin\/\*[\s\S]*Cache-Control:\s*no-store/i, '_headers should no-store admin API responses');

  assert.match(swRoutes, /function swIsAdminRequest/, 'service worker routes should define admin bypass matcher');
  assert.match(swRoutes, /swIsAdminRequest\(url\)[\s\S]*fetch\(request, \{ cache: 'no-store' \}\)/, 'service worker should network-bypass admin requests');

  assert.equal(DIST_FILE_ENTRIES.includes('_headers'), true, 'dist manifest should include _headers');
  assert.equal(DIST_FILE_ENTRIES.includes('admin.html'), true, 'dist manifest should include admin.html');
  assert.equal(DIST_DIR_ENTRIES.includes('admin'), true, 'dist manifest should include admin directory');

  assert.match(robots, /Disallow:\s*\/admin\n/, 'robots.txt should disallow admin clean route');
  assert.match(robots, /Disallow:\s*\/admin\.html/, 'robots.txt should disallow admin.html');
  assert.match(robots, /Disallow:\s*\/admin\//, 'robots.txt should disallow admin directory');

  console.log(JSON.stringify({
    ok: true,
    checked: [
      'admin shell exists',
      'admin CSP/no third-party assets',
      'admin no inline handlers/styles',
      'admin no runtime inline style mutation',
      'admin API credentials/no-store',
      'preview and publish endpoints wired',
      'no browser storage for admin payloads',
      'service worker admin bypass',
      'Cloudflare _headers no-store and noindex',
      'dist manifest includes admin assets'
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error('[verify-admin-content-ui] Verification failed.');
  console.error(error);
  process.exitCode = 1;
});

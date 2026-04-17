import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'sw-manifest.js');
const DOCUMENT_CANDIDATES = [
  './',
  './index.html',
  './about.html',
  './contact.html',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './robots.txt',
  './sitemap.xml'
];
const PRECACHE_DATA_CANDIDATES = [
  './data/home/home-ayahs.json',
  './data/home/home-messages-data.js',
  './data/azkar/azkar-legacy-catalog.js',
  './data/azkar/categories/manifest.js',
  './data/duas/duas-data.js',
  './data/names/names-data.js',
  './data/stories/manifest.js',
  './data/stories/stories-data.js'
];
const DEFERRED_DATA_CANDIDATES = [
  './data/quran/quran-legacy-data.js'
];
const WARM_DATA_CANDIDATES = [
  './data/azkar/categories/azkar-morning.js',
  './data/quran/surahs/001.json'
];
const SHELL_SCAN_DIRS = [
  'css',
  'js',
  'assets'
];
const EXTERNAL_SHELL_URLS = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
];
const EXCLUDED_FILE_PARTS = [
  '.example.',
  '/__tests__/',
  '/.DS_Store'
];
const INCLUDED_EXTENSIONS = new Set([
  '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.mp3', '.wav', '.ogg', '.woff', '.woff2', '.ttf'
]);

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function toPublicUrl(file) {
  const relativePath = toPosix(path.relative(ROOT, file));
  return `./${relativePath}`;
}

function shouldExclude(file) {
  const publicUrl = toPublicUrl(file);
  return EXCLUDED_FILE_PARTS.some((part) => publicUrl.includes(part));
}

function isEligibleShellAsset(file) {
  if (shouldExclude(file)) return false;
  const ext = path.extname(file).toLowerCase();
  return INCLUDED_EXTENSIONS.has(ext);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(fullPath));
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

async function collectExistingUrls(candidates) {
  const urls = [];
  for (const candidate of candidates) {
    const absolutePath = path.join(ROOT, candidate.replace(/^\.\//, ''));
    if (candidate === './' || await exists(absolutePath)) {
      urls.push(candidate);
    }
  }
  return urls;
}


async function collectExistingFiles(candidates) {
  const files = [];
  for (const candidate of candidates) {
    if (candidate === './') continue;
    const absolutePath = path.join(ROOT, candidate.replace(/^\.\//, ''));
    if (await exists(absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
}

async function sumFileSizesFromUrls(urls) {
  let totalBytes = 0;
  for (const url of urls) {
    if (url === './' || /^https?:\/\//.test(url)) continue;
    const absolutePath = path.join(ROOT, url.replace(/^\.\//, ''));
    if (!await exists(absolutePath)) continue;
    const stat = await fs.stat(absolutePath);
    totalBytes += stat.size;
  }
  return totalBytes;
}

function bytesToKb(bytes) {
  return Number((bytes / 1024).toFixed(1));
}

async function collectShellUrls() {
  const urls = [];
  for (const dir of SHELL_SCAN_DIRS) {
    const absoluteDir = path.join(ROOT, dir);
    if (!await exists(absoluteDir)) continue;
    const files = await walk(absoluteDir);
    urls.push(
      ...files
        .filter(isEligibleShellAsset)
        .map(toPublicUrl)
    );
  }

  return [...new Set([...urls, ...EXTERNAL_SHELL_URLS])].sort();
}

async function collectPrecacheDataUrls() {
  const urls = await collectExistingUrls(PRECACHE_DATA_CANDIDATES);

  const categoriesDir = path.join(ROOT, 'data/azkar/categories');
  if (await exists(categoriesDir)) {
    const categoryFiles = await walk(categoriesDir);
    urls.push(
      ...categoryFiles
        .filter((file) => file.endsWith('.js') && !shouldExclude(file))
        .map(toPublicUrl)
    );
  }

  return [...new Set(urls)].sort();
}

async function collectWarmDataUrls() {
  return [...new Set(await collectExistingUrls(WARM_DATA_CANDIDATES))].sort();
}

async function collectDeferredDataUrls() {
  return [...new Set(await collectExistingUrls(DEFERRED_DATA_CANDIDATES))].sort();
}

async function collectManifest() {
  const documentUrls = [...new Set(await collectExistingUrls(DOCUMENT_CANDIDATES))].sort();
  const shellUrls = await collectShellUrls();
  const essentialDataUrls = await collectPrecacheDataUrls();
  const deferredDataUrls = await collectDeferredDataUrls();
  const warmDataUrls = await collectWarmDataUrls();

  const precacheStats = {
    documentsKb: bytesToKb(await sumFileSizesFromUrls(documentUrls)),
    shellKb: bytesToKb(await sumFileSizesFromUrls(shellUrls)),
    dataKb: bytesToKb(await sumFileSizesFromUrls(essentialDataUrls)),
    deferredDataKb: bytesToKb(await sumFileSizesFromUrls(deferredDataUrls)),
    warmDataKb: bytesToKb(await sumFileSizesFromUrls(warmDataUrls))
  };

  return {
    documentUrls,
    shellUrls,
    essentialDataUrls,
    deferredDataUrls,
    warmDataUrls,
    precacheStats,
    precache: {
      documents: documentUrls,
      shell: shellUrls,
      data: essentialDataUrls
    },
    routing: {
      documentFallback: './index.html'
    }
  };
}

async function buildVersionHash(urls) {
  const hash = createHash('sha256');
  hash.update('phase22-names-closed-validated-v2');

  const filesForHash = [path.join(ROOT, 'sw.js')];
  for (const url of urls) {
    if (url === './' || /^https?:\/\//.test(url)) continue;
    filesForHash.push(path.join(ROOT, url.replace(/^\.\//, '')));
  }

  const uniqueFiles = [...new Set(filesForHash.map((file) => path.normalize(file)))].sort();
  for (const file of uniqueFiles) {
    const relativePath = toPosix(path.relative(ROOT, file));
    const content = await fs.readFile(file);
    hash.update(relativePath);
    hash.update(content);
  }

  return hash.digest('hex').slice(0, 12);
}

function renderManifestFile(manifest) {
  return `self.__SW_MANIFEST__ = Object.freeze(${JSON.stringify(manifest, null, 2)});\n`;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const manifest = await collectManifest();
  const allUrls = [
    ...manifest.documentUrls,
    ...manifest.shellUrls,
    ...manifest.essentialDataUrls,
    ...manifest.warmDataUrls
  ];
  manifest.cacheVersion = `azkar-v26-phase22-${await buildVersionHash(allUrls)}`;

  const output = renderManifestFile(manifest);

  if (checkOnly) {
    const current = await fs.readFile(OUTPUT_FILE, 'utf8').catch(() => null);
    if (current !== output) {
      console.error('[SW Manifest] sw-manifest.js is stale. Run: node tools/build-sw-manifest.mjs');
      process.exit(1);
    }
    console.log('[SW Manifest] sw-manifest.js is up to date.');
    return;
  }

  await fs.writeFile(OUTPUT_FILE, output, 'utf8');
  console.log(`[SW Manifest] Wrote ${manifest.cacheVersion} with ${manifest.shellUrls.length} shell assets, ${manifest.essentialDataUrls.length} precache data files (${manifest.precacheStats.dataKb} KB), ${manifest.deferredDataUrls.length} deferred data files (${manifest.precacheStats.deferredDataKb} KB), ${manifest.warmDataUrls.length} warm data files, ${manifest.documentUrls.length} documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src', 'index-fragments');
const OUT_FILE = path.join(ROOT, 'index.html');
const CHECK_ONLY = process.argv.includes('--check');

const FRAGMENT_ORDER = [
  'head.html',
  'shell-start.html',
  path.join('content', 'primary-content.html'),
  path.join('content', 'reading-content.html'),
  path.join('content', 'learning-content.html'),
  'dialogs.html',
  'templates.html',
  'shell-end.html'
];

async function readFragment(relPath) {
  const file = path.join(SRC_ROOT, relPath);
  return await fs.readFile(file, 'utf8');
}

function normalizeHtml(html) {
  return html.trimEnd() + '\n';
}

async function buildIndexHtml() {
  const parts = await Promise.all(FRAGMENT_ORDER.map(readFragment));
  const [head, shellStart, primary, reading, learning, dialogs, templates, shellEnd] = parts;

  return normalizeHtml(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
${head.trim()}
</head>
<body>
${shellStart.trim()}

${primary.trim()}

${reading.trim()}

${learning.trim()}

${dialogs.trim()}

${templates.trim()}

${shellEnd.trim()}
</body>
</html>`);
}

async function main() {
  const generated = await buildIndexHtml();
  const existing = await fs.readFile(OUT_FILE, 'utf8').catch(() => null);
  const isFresh = existing === generated;

  if (CHECK_ONLY) {
    if (!isFresh) {
      console.error('index.html is stale. Run: node tools/build-index.mjs');
      process.exit(1);
    }
    console.log('index.html is up to date.');
    return;
  }

  if (!isFresh) {
    await fs.writeFile(OUT_FILE, generated, 'utf8');
    console.log('Built index.html from src/index-fragments');
    return;
  }

  console.log('index.html already up to date.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

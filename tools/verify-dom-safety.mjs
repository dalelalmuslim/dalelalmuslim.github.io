import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const JS_ROOT = path.join(ROOT, 'js');
const HTML_FILES = [
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'about.html'),
  path.join(ROOT, 'privacy.html'),
  path.join(ROOT, 'terms.html'),
  path.join(ROOT, 'contact.html')
];

const RAW_HTML_ALLOWLIST = new Set([
  'js/shared/dom/dom-helpers.js'
]);

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

async function main() {
  const jsFiles = await walk(JS_ROOT, (file) => file.endsWith('.js'));
  const inlineStyleAttributes = [];
  const styleMutations = [];
  const rawHtmlWrites = [];
  const rawHtmlWritesOutsideAllowlist = [];

  for (const file of [...jsFiles, ...HTML_FILES]) {
    const code = await fs.readFile(file, 'utf8');
    const relative = rel(file);

    if (/\sstyle\s*=\s*["']/.test(code)) {
      inlineStyleAttributes.push(relative);
    }

    if (/\.style\.[a-zA-Z]+\s*=|setAttribute\(\s*['"]style['"]/.test(code)) {
      styleMutations.push(relative);
    }

    if (/\binnerHTML\s*=|insertAdjacentHTML\s*\(/.test(code)) {
      rawHtmlWrites.push(relative);
      if (!RAW_HTML_ALLOWLIST.has(relative)) {
        rawHtmlWritesOutsideAllowlist.push(relative);
      }
    }
  }

  const results = {
    inlineStyleAttributes,
    styleMutations,
    rawHtmlWrites,
    rawHtmlWritesOutsideAllowlist
  };

  console.log(JSON.stringify(results, null, 2));

  const hasFailures = inlineStyleAttributes.length
    || styleMutations.length
    || rawHtmlWritesOutsideAllowlist.length;

  process.exitCode = hasFailures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

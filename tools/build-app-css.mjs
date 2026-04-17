import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'css', 'app-fragments');
const OUT_FILE = path.join(ROOT, 'css', 'app.css');
const CHECK_ONLY = process.argv.includes('--check');

const ORDER = [
  '01-base.css',
  '02-typography.css',
  '03-a11y.css',
  '04-controls.css',
  '05-feedback.css',
  '06-surfaces.css',
  '07-utilities.css',
  '08-banners-empty-motion.css'
];

async function buildAppCss() {
  const chunks = await Promise.all(
    ORDER.map(async (name) => {
      const file = path.join(SRC_ROOT, name);
      return (await fs.readFile(file, 'utf8')).trim();
    })
  );

  return chunks.join('\n\n') + '\n';
}

async function main() {
  const generated = await buildAppCss();
  const existing = await fs.readFile(OUT_FILE, 'utf8').catch(() => null);
  const isFresh = existing === generated;

  if (CHECK_ONLY) {
    if (!isFresh) {
      console.error('css/app.css is stale. Run: node tools/build-app-css.mjs');
      process.exit(1);
    }
    console.log('css/app.css is up to date.');
    return;
  }

  if (!isFresh) {
    await fs.writeFile(OUT_FILE, generated, 'utf8');
    console.log('Built css/app.css from css/app-fragments');
    return;
  }

  console.log('css/app.css already up to date.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DIST_DIR_ENTRIES,
  DIST_DIR_NAME,
  DIST_FILE_ENTRIES
} from './release-manifest.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, DIST_DIR_NAME);

async function ensureExists(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  await fs.access(absolutePath);
  return absolutePath;
}

async function copyEntry(relativePath) {
  const sourcePath = await ensureExists(relativePath);
  const targetPath = path.join(distDir, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(sourcePath, targetPath, { recursive: true, force: true, preserveTimestamps: true });
}

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  for (const relativeFile of DIST_FILE_ENTRIES) {
    await copyEntry(relativeFile);
  }

  for (const relativeDir of DIST_DIR_ENTRIES) {
    await copyEntry(relativeDir);
  }

  const topLevelEntries = await fs.readdir(distDir);
  const summary = {
    distDir: DIST_DIR_NAME,
    copiedFiles: DIST_FILE_ENTRIES,
    copiedDirectories: DIST_DIR_ENTRIES,
    topLevelEntries: topLevelEntries.sort()
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[build-dist] Failed to prepare deployable dist package.');
  console.error(error);
  process.exitCode = 1;
});

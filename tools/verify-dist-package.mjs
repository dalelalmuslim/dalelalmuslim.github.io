import fs from 'node:fs';
import path from 'node:path';
import {
  DIST_DIR_ENTRIES,
  DIST_DIR_NAME,
  DIST_DISALLOWED_TOP_LEVEL_ENTRIES,
  DIST_FILE_ENTRIES
} from './release-manifest.mjs';

const rootDir = process.cwd();
const distDir = path.join(rootDir, DIST_DIR_NAME);

function exists(relativePath) {
  return fs.existsSync(path.join(distDir, relativePath));
}

function main() {
  const hasDistDir = fs.existsSync(distDir);
  const missingFiles = hasDistDir ? DIST_FILE_ENTRIES.filter((entry) => !exists(entry)) : [...DIST_FILE_ENTRIES];
  const missingDirectories = hasDistDir ? DIST_DIR_ENTRIES.filter((entry) => !exists(entry)) : [...DIST_DIR_ENTRIES];
  const presentDisallowedEntries = hasDistDir
    ? DIST_DISALLOWED_TOP_LEVEL_ENTRIES.filter((entry) => exists(entry))
    : [];
  const topLevelEntries = hasDistDir ? fs.readdirSync(distDir).sort() : [];
  const report = {
    ok: hasDistDir && missingFiles.length === 0 && missingDirectories.length === 0 && presentDisallowedEntries.length === 0,
    hasDistDir,
    missingFiles,
    missingDirectories,
    presentDisallowedEntries,
    topLevelEntries
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();

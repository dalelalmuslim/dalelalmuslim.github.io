import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DIST_DIR_NAME, RELEASE_ZIP_NAME } from './release-manifest.mjs';

const rootDir = process.cwd();
const distDir = path.join(rootDir, DIST_DIR_NAME);
const archivePath = path.join(rootDir, RELEASE_ZIP_NAME);

function runZipCommand() {
  return spawnSync('zip', ['-qr', archivePath, '.'], {
    cwd: distDir,
    stdio: 'inherit'
  });
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error(`[create-release-archive] Missing ${DIST_DIR_NAME}/. Run npm run build:dist first.`);
    process.exit(1);
  }

  fs.rmSync(archivePath, { force: true });

  const result = runZipCommand();
  if (result.error) {
    console.error('[create-release-archive] Failed to invoke zip command. Install zip first, then retry.');
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[create-release-archive] zip exited with status ${result.status}.`);
    process.exit(result.status ?? 1);
  }

  const archiveStats = fs.statSync(archivePath);
  console.log(JSON.stringify({
    archive: RELEASE_ZIP_NAME,
    bytes: archiveStats.size,
    distDir: DIST_DIR_NAME
  }, null, 2));
}

main();

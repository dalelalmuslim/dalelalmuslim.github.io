import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const compilerCandidates = [
  path.join(rootDir, 'node_modules', 'typescript', 'lib', 'tsc.js'),
  path.join(rootDir, 'node_modules', 'typescript', 'lib', '_tsc.js')
];

const compilerPath = compilerCandidates.find((candidate) => fs.existsSync(candidate));
const globalCompiler = 'tsc';
const command = compilerPath ? process.execPath : globalCompiler;
const args = compilerPath ? [compilerPath, '-p', 'tsconfig.json'] : ['-p', 'tsconfig.json'];

if (!compilerPath) {
  console.warn('[typecheck] Local TypeScript compiler not found, using global tsc fallback.');
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  cwd: rootDir
});

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  console.error('[typecheck] Failed to execute TypeScript compiler.');
  console.error(result.error.message);
  process.exit(1);
}

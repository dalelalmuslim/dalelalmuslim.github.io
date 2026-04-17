import { spawn } from 'node:child_process';

const CHECK_ONLY = process.argv.includes('--check');
const commands = [
  ['node', ['tools/build-app-css.mjs', ...(CHECK_ONLY ? ['--check'] : [])]],
  ['node', ['tools/build-index.mjs', ...(CHECK_ONLY ? ['--check'] : [])]],
  ['node', ['tools/build-sw-manifest.mjs', ...(CHECK_ONLY ? ['--check'] : [])]]
];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => resolve(code));
  });
}

for (const [command, args] of commands) {
  const code = await run(command, args);
  if (code !== 0) {
    process.exit(code);
  }
}

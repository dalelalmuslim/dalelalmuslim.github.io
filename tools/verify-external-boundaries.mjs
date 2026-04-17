import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const checks = [
  {
    file: 'index.html',
    banned: [
      'https://cdn.jsdelivr.net',
      "'unsafe-inline'",
      'https://*.googleapis.com'
    ]
  },
  {
    file: 'src/index-fragments/head.html',
    banned: [
      'https://cdn.jsdelivr.net',
      "'unsafe-inline'",
      'https://*.googleapis.com'
    ]
  },
  {
    file: 'about.html',
    banned: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net',
      "'unsafe-inline'"
    ]
  },
  {
    file: 'privacy.html',
    banned: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net',
      "'unsafe-inline'"
    ]
  },
  {
    file: 'terms.html',
    banned: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net',
      "'unsafe-inline'"
    ]
  },
  {
    file: 'contact.html',
    banned: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net',
      'fa-',
      "'unsafe-inline'"
    ]
  }
];

const violations = [];

for (const check of checks) {
  const absoluteFile = path.join(ROOT, check.file);
  const code = await fs.readFile(absoluteFile, 'utf8');
  for (const token of check.banned) {
    if (code.includes(token)) {
      violations.push({ file: check.file, token });
    }
  }
}

const result = {
  checkedFiles: checks.map((check) => check.file),
  violations
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = violations.length ? 1 : 0;

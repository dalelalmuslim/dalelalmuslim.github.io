export const DIST_DIR_NAME = 'dist';
export const RELEASE_ZIP_NAME = 'dalil-almuslim-dist.zip';

export const DIST_FILE_ENTRIES = Object.freeze([
  '_headers',
  'index.html',
  'admin.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
  'sw-manifest.js',
  'sw-routes.js',
  'sw-strategies.js'
]);

export const DIST_DIR_ENTRIES = Object.freeze([
  'admin',
  'assets',
  'css',
  'data',
  'js'
]);

export const DIST_DISALLOWED_TOP_LEVEL_ENTRIES = Object.freeze([
  '.git',
  '.github',
  'docs',
  'functions',
  'node_modules',
  'scaffolds',
  'src',
  'tools'
]);

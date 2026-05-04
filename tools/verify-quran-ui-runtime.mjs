import { readFile } from 'node:fs/promises';

const files = {
  templates: 'src/index-fragments/templates.html',
  quranDom: 'js/features/quran/quran-dom.js',
  quranIndex: 'js/features/quran/index.js',
  quranRenderers: 'js/features/quran/quran-renderers.js',
  quranCss: 'css/features/quran.css'
};

async function readProjectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

function includesAll(source, needles) {
  return needles.every(needle => source.includes(needle));
}

const [templates, quranDom, quranIndex, quranRenderers, quranCss] = await Promise.all([
  readProjectFile(files.templates),
  readProjectFile(files.quranDom),
  readProjectFile(files.quranIndex),
  readProjectFile(files.quranRenderers),
  readProjectFile(files.quranCss)
]);

const checks = [
  {
    name: 'obsolete surah template is removed',
    pass: !templates.includes('tpl-surah-btn')
  },
  {
    name: 'quran DOM cache has no obsolete template reference',
    pass: !quranDom.includes('surahBtnTemplate') && !quranDom.includes('tpl-surah-btn')
  },
  {
    name: 'quran surface refresh rerenders the surah list on enter/refresh',
    pass: includesAll(quranIndex, [
      'await quran.ensureDataLoaded?.()',
      "quran.renderSurahList?.(quran.getDom?.('searchInput')?.value || '')",
      'quran.checkBookmark?.()'
    ])
  },
  {
    name: 'surah rows are rendered with explicit DOM nodes',
    pass: includesAll(quranRenderers, [
      "document.createElement('button')",
      "numberEl.textContent = String(surahNum)",
      'nameEl.textContent = surahName',
      'metaEl.textContent = verseCountLabel',
      "chevronEl.textContent = '‹'"
    ])
  },
  {
    name: 'surah rows are not rendered through raw HTML or template cloning',
    pass: !/innerHTML\s*=/.test(quranRenderers)
      && !/insertAdjacentHTML\s*\(/.test(quranRenderers)
      && !quranRenderers.includes('tpl-surah-btn')
      && !quranRenderers.includes('cloneNode')
  },
  {
    name: 'surah row labels include Arabic ayah counts',
    pass: quranRenderers.includes('getSurahVerseCountLabel')
  },
  {
    name: 'quran visual selectors for rendered rows exist',
    pass: includesAll(quranCss, [
      '.section--quran .quran-surah-row',
      '.section--quran .quran-surah-row__num',
      '.section--quran .quran-surah-row__body',
      '.section--quran .quran-surah-row__name',
      '.section--quran .quran-surah-row__meta',
      '.section--quran .quran-surah-row__chevron'
    ])
  }
];

const failed = checks.filter(check => !check.pass);
console.log(JSON.stringify({
  ok: failed.length === 0,
  checkedFiles: files,
  checks,
  failed: failed.map(check => check.name)
}, null, 2));

if (failed.length) {
  process.exit(1);
}

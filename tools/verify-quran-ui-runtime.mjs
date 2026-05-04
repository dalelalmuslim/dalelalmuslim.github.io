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
  },
  {
    name: 'quran layout constrains index and reader widths',
    pass: includesAll(quranCss, [
      '--quran-index-max-width',
      '--quran-reader-max-width',
      '.section--quran > .cardx',
      '.section--quran #surahReader',
      'max-width: var(--quran-index-max-width)',
      'max-width: var(--quran-reader-max-width)'
    ])
  },
  {
    name: 'quran bottom spacing accounts for bottom navigation and safe area',
    pass: includesAll(quranCss, [
      '--quran-bottom-safe-space',
      'env(safe-area-inset-bottom, 0px)',
      'padding-bottom: var(--quran-bottom-safe-space)'
    ])
  },
  {
    name: 'quran ayah typography uses responsive bounds',
    pass: includesAll(quranCss, [
      'font-size: clamp(1.3rem, 4.2vw, 1.62rem)',
      '@media (min-width: 768px)',
      'font-size: clamp(1.52rem, 2.4vw, 1.78rem)'
    ])
  },
  {
    name: 'quran copy pill is centered without RTL inset ambiguity',
    pass: includesAll(quranCss, [
      'left: 50%',
      'right: auto',
      'transform: translateX(-50%)',
      'width: min(calc(100vw - 32px), 360px)'
    ]) && !quranCss.includes('inset-inline: 50%')
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

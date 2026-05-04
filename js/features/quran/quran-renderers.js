import { getSurahName, getSurahVerseCountLabel, normalizeArabic } from './quran-metadata.js';

function createStateMessage(text, className = 'quran__empty-state') {
    const message = document.createElement('p');
    message.className = `muted cardx--center ${className}`.trim();
    message.textContent = text;
    return message;
}

function resolveAyahVerseNumber(ayah, fallbackIndex = 1) {
    return Number(ayah?.verse || ayah?.numberInSurah || ayah?.verse_number || fallbackIndex);
}

function resolveAyahText(ayah) {
    return String(ayah?.text || '').trim();
}

function createAyahAnchorId(surahNum, verseNum) {
    const normalizedSurahNum = Number(surahNum);
    const normalizedVerseNum = Number(verseNum);

    if (!Number.isInteger(normalizedSurahNum) || normalizedSurahNum <= 0) {
        return '';
    }

    if (!Number.isInteger(normalizedVerseNum) || normalizedVerseNum <= 0) {
        return '';
    }

    return `ayah-${normalizedSurahNum}-${normalizedVerseNum}`;
}

export function createSurahButton({ onOpenSurah }, surahNum) {
    const surahName = getSurahName(surahNum);
    const verseCountLabel = getSurahVerseCountLabel(surahNum);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quran-surah-row';
    button.setAttribute('aria-label', `افتح سورة ${surahName}${verseCountLabel ? `، ${verseCountLabel}` : ''}`);
    button.addEventListener('click', () => onOpenSurah(surahNum));

    const numberEl = document.createElement('span');
    numberEl.className = 'quran-surah-row__num';
    numberEl.textContent = String(surahNum);

    const bodyEl = document.createElement('span');
    bodyEl.className = 'quran-surah-row__body';

    const nameEl = document.createElement('span');
    nameEl.className = 'amiri-text quran-surah-row__name';
    nameEl.textContent = surahName;

    const metaEl = document.createElement('span');
    metaEl.className = 'quran-surah-row__meta';
    metaEl.textContent = verseCountLabel;

    const chevronEl = document.createElement('span');
    chevronEl.className = 'quran-surah-row__chevron';
    chevronEl.setAttribute('aria-hidden', 'true');
    chevronEl.textContent = '‹';

    bodyEl.append(nameEl, metaEl);
    button.append(numberEl, bodyEl, chevronEl);
    return button;
}

export function renderSurahList({ getDom, getSurahNumbers, onOpenSurah }, searchTerm = '') {
    const list = getDom('surahList');
    if (!list) return;

    const surahNumbers = getSurahNumbers();
    if (surahNumbers.length === 0) {
        list.replaceChildren(createStateMessage('تعذر تحميل فهرس السور.'));
        return;
    }

    const normalizedSearch = normalizeArabic(searchTerm);
    const searchValue = String(searchTerm || '').trim();
    const fragment = document.createDocumentFragment();

    surahNumbers.forEach(surahNum => {
        const surahName = getSurahName(surahNum);
        const matchName = normalizeArabic(surahName).includes(normalizedSearch);
        const matchNumber = String(surahNum).includes(searchValue);

        if (normalizedSearch && !matchName && !matchNumber) return;

        fragment.appendChild(createSurahButton({ onOpenSurah }, surahNum));
    });

    if (!fragment.childNodes.length) {
        list.replaceChildren(createStateMessage('لا توجد سورة بهذا البحث.'));
        return;
    }

    list.replaceChildren(fragment);
}

export function buildAyahLine(ayah, fallbackIndex = 1) {
    const verseNum = resolveAyahVerseNumber(ayah, fallbackIndex);
    const text = resolveAyahText(ayah);
    return `${text} ﴿${verseNum}﴾`;
}

export function createAyahNode(ayah, { surahNum, fallbackIndex = 1 } = {}) {
    const verseNum = resolveAyahVerseNumber(ayah, fallbackIndex);
    const text = resolveAyahText(ayah);
    const anchorId = createAyahAnchorId(surahNum, verseNum);

    if (!text) {
        return null;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quran__ayah';
    if (anchorId) {
        button.id = anchorId;
    }
    button.dataset.quranAyah = 'true';
    button.dataset.surahNum = String(Number(surahNum) || 0);
    button.dataset.verseNum = String(verseNum);
    button.dataset.ayahText = text;
    button.setAttribute('aria-label', `الآية ${verseNum}`);

    const textSpan = document.createElement('span');
    textSpan.className = 'quran__ayah-text';
    textSpan.textContent = text;

    const numSpan = document.createElement('span');
    numSpan.className = 'quran__ayah-num';
    numSpan.textContent = `﴿${verseNum}﴾`;
    numSpan.setAttribute('aria-hidden', 'true');

    button.append(textSpan, ' ', numSpan);
    return button;
}

export function renderAyahNodes({ ayahs = [], surahNum } = {}) {
    const fragment = document.createDocumentFragment();

    ayahs.forEach((ayah, index) => {
        const ayahNode = createAyahNode(ayah, {
            surahNum,
            fallbackIndex: index + 1
        });

        if (ayahNode) {
            fragment.appendChild(ayahNode);
            fragment.append(' ');
        }
    });

    return fragment;
}

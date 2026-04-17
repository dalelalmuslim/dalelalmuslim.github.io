import { getSurahName, normalizeArabic } from './quran-metadata.js';

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

export function createSurahButton({ getDom, onOpenSurah }, surahNum) {
    const template = getDom('surahBtnTemplate');
    if (!template) return null;

    const clone = template.content.cloneNode(true);
    const btn = clone.querySelector('.surah-item');
    const nameEl = clone.querySelector('.surah-name');
    const numEl = clone.querySelector('.surah-num');

    if (nameEl) nameEl.textContent = getSurahName(surahNum);
    if (numEl) numEl.textContent = surahNum;
    if (btn) btn.addEventListener('click', () => onOpenSurah(surahNum));

    return clone;
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

        const btnNode = createSurahButton({ getDom, onOpenSurah }, surahNum);
        if (btnNode) {
            fragment.appendChild(btnNode);
        }
    });

    if (!fragment.childNodes.length) {
        list.replaceChildren(createStateMessage('لا توجد نتائج مطابقة.'));
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

    if (!text) {
        return null;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quran__ayah';
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

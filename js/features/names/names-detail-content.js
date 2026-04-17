import { ALLAH_NAMES } from '../../../data/names/names-data.js';

function normalizeArabicEntry(entry, index) {
    if (!entry || typeof entry !== 'object') {
        return {
            index,
            name: '',
            desc: ''
        };
    }

    return {
        index,
        name: typeof entry.name === 'string' ? entry.name.trim() : '',
        desc: typeof entry.desc === 'string' ? entry.desc.trim() : ''
    };
}

function normalizeEnglishEntry(index) {
    const entry = Array.isArray(ALLAH_NAMES?.en) ? ALLAH_NAMES.en[index] : null;
    if (!entry || typeof entry !== 'object') {
        return {
            transliteration: '',
            summary: ''
        };
    }

    return {
        transliteration: typeof entry.name === 'string' ? entry.name.trim() : '',
        summary: typeof entry.desc === 'string' ? entry.desc.trim() : ''
    };
}

function buildReflectionPrompt(arabicEntry) {
    if (!arabicEntry?.name || !arabicEntry?.desc) {
        return 'استحضر معنى هذا الاسم في دعائك اليوم، ثم اربطه بموقف واحد تعيشه الآن.';
    }

    return `استحضر معنى اسم «${arabicEntry.name}» في دعائك اليوم: ${arabicEntry.desc}`;
}

function buildPracticeCue(arabicEntry) {
    if (!arabicEntry?.name) {
        return 'كرر الاسم بهدوء، ثم قف لحظة لتربطه بدعاء قصير ومعنى حاضر في قلبك.';
    }

    return `كرر «${arabicEntry.name}» بهدوء، ثم قف لحظة لتربطه بدعاء قصير ومعنى حاضر في قلبك.`;
}

export function getNameDetailContent(index, namesSource = []) {
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= namesSource.length) {
        return null;
    }

    const arabicEntry = normalizeArabicEntry(namesSource[safeIndex], safeIndex);
    const englishEntry = normalizeEnglishEntry(safeIndex);

    return {
        index: safeIndex,
        name: arabicEntry.name,
        desc: arabicEntry.desc,
        transliteration: englishEntry.transliteration,
        englishSummary: englishEntry.summary,
        reflectionPrompt: buildReflectionPrompt(arabicEntry),
        practiceCue: buildPracticeCue(arabicEntry)
    };
}

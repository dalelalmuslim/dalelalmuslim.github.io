import { getNameDetailContent } from './names-detail-content.js';

function buildPromptLabel(mode) {
    return mode === 'meaning-to-name' ? 'اقرأ المعنى ثم حاول تذكر الاسم' : 'اقرأ الاسم ثم حاول تذكر المعنى';
}

function buildAnswerLabel(mode) {
    return mode === 'meaning-to-name' ? 'الاسم الصحيح' : 'المعنى الصحيح';
}

export function buildNamesQuizCard(index, namesSource, mode = 'name-to-meaning') {
    const detail = getNameDetailContent(index, namesSource);
    if (!detail) {
        return null;
    }

    if (mode === 'meaning-to-name') {
        return {
            index: detail.index,
            promptLabel: buildPromptLabel(mode),
            promptText: detail.englishSummary || detail.desc || 'لا يتوفر معنى إضافي حاليًا.',
            answerLabel: buildAnswerLabel(mode),
            answerText: detail.name || '',
            answerHint: detail.transliteration ? `Transliteration: ${detail.transliteration}` : 'استحضر نطق الاسم ثم افتح البطاقة للتثبيت.'
        };
    }

    return {
        index: detail.index,
        promptLabel: buildPromptLabel(mode),
        promptText: detail.name || '',
        answerLabel: buildAnswerLabel(mode),
        answerText: detail.englishSummary || detail.desc || 'لا يتوفر معنى إضافي حاليًا.',
        answerHint: detail.reflectionPrompt || 'اربط المعنى بدعاء قصير لتثبيته في القلب.'
    };
}

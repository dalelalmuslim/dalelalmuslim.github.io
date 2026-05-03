function isValidAyahContext(context) {
    return Boolean(context?.surahNum && context?.verseNum && context?.text);
}

function buildReflectionPrompt(context) {
    if (!isValidAyahContext(context)) {
        return '';
    }

    return [
        'اقرأ الآية بتأنٍ ثم أعد قراءتها مرة ثانية قبل الانتقال لما بعدها.',
        'راجع ما قبلها وما بعدها داخل السورة حتى لا تُفهم بمعزل عن السياق.',
        'دوّن المعنى أو الأثر الذي لمسته من الآية ثم ارجع إليه لاحقًا.'
    ].join(' ');
}

export async function getAyahStudyContent(context) {
    if (!isValidAyahContext(context)) {
        return {
            status: 'invalid',
            summary: 'لا توجد بيانات صالحة لعرض محتوى الدراسة.',
            reflection: {
                status: 'invalid',
                title: 'مفتاح التدبر',
                body: ''
            }
        };
    }

    return {
        status: 'ready',
        summary: 'اختر معنى واحدًا من الآية وتوقف معه قبل الانتقال لما بعدها.',
        reflection: {
            status: 'ready',
            title: 'مفتاح التدبر',
            body: buildReflectionPrompt(context)
        }
    };
}

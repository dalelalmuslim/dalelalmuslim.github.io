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
            translation: {
                status: 'invalid',
                title: 'الترجمة',
                body: ''
            },
            tafsir: {
                status: 'invalid',
                title: 'التفسير المختصر',
                body: ''
            },
            reflection: {
                status: 'invalid',
                title: 'مفتاح التدبر',
                body: ''
            }
        };
    }

    return {
        status: 'partial',
        summary: 'النص متاح الآن. الترجمة والتفسير سيُربطان لاحقًا من مصدر موثوق داخل التطبيق.',
        translation: {
            status: 'unavailable',
            title: 'الترجمة',
            body: 'الترجمة غير متاحة في هذه المرحلة. سيتم ربط ترجمة موثوقة لاحقًا بدل إدخال محتوى ناقص أو غير منضبط.'
        },
        tafsir: {
            status: 'unavailable',
            title: 'التفسير المختصر',
            body: 'التفسير المختصر غير متاح بعد. سيتم ربطه لاحقًا بمصدر موثوق مع توضيح المرجع داخل اللوحة.'
        },
        reflection: {
            status: 'ready',
            title: 'مفتاح التدبر',
            body: buildReflectionPrompt(context)
        }
    };
}

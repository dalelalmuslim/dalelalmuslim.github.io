function createDomMap() {
    return {
        searchInput: document.getElementById('searchSurah'),
        surahList: document.getElementById('surahList'),
        surahListContainer: document.getElementById('surahListContainer'),
        surahReader: document.getElementById('surahReader'),
        currentSurahTitle: document.getElementById('currentSurahTitle'),
        ayahsContainer: document.getElementById('ayahsContainer'),
        resumeReadingCard: document.getElementById('resumeReadingCard'),
        lastReadSurahName: document.getElementById('lastReadSurahName'),
        lastReadResumeMeta: document.getElementById('lastReadResumeMeta'),
        saveQuranBookmarkBtn: document.getElementById('saveQuranBookmarkBtn'),
        quranReviewSummary: document.getElementById('quranReviewSummary'),
        quranReviewSummaryCount: document.getElementById('quranReviewSummaryCount'),
        quranReviewSummaryHint: document.getElementById('quranReviewSummaryHint'),
        quranReviewNextBtn: document.getElementById('quranReviewNextBtn'),
        quranReviewMemorizedCount: document.getElementById('quranReviewMemorizedCount'),
        quranAddReviewBtn: document.getElementById('quranAddReviewBtn'),
        quranMarkMemorizedBtn: document.getElementById('quranMarkMemorizedBtn'),
        surahBtnTemplate: document.getElementById('tpl-surah-btn'),
        quranStudyPanel: document.getElementById('quranStudyPanel'),
        quranStudyPanelTitle: document.getElementById('quranStudyPanelTitle'),
        quranStudyPanelMeta: document.getElementById('quranStudyPanelMeta'),
        quranStudyPanelStatus: document.getElementById('quranStudyPanelStatus'),
        quranStudyAudioStatus: document.getElementById('quranStudyAudioStatus'),
        quranStudyPanelText: document.getElementById('quranStudyPanelText'),
        quranStudyTranslation: document.getElementById('quranStudyTranslation'),
        quranStudyTafsir: document.getElementById('quranStudyTafsir'),
        quranStudyReflection: document.getElementById('quranStudyReflection'),
        quranRepeatAyahBtn: document.getElementById('quranRepeatAyahBtn')
    };
}

export function createQuranDomCache() {
    const dom = {};

    function cacheDom() {
        Object.assign(dom, createDomMap());
        return dom;
    }

    function getDom(name) {
        if (!dom[name]) {
            cacheDom();
        }
        return dom[name] || null;
    }

    return {
        dom,
        cacheDom,
        getDom
    };
}

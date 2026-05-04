function createDomMap() {
    return {
        appHeaderTitle: document.getElementById('headerTitle'),
        appBackButton: document.getElementById('backBtn'),
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
        quranStudyPanel: document.getElementById('quranStudyPanel'),
        quranStudyPanelTitle: document.getElementById('quranStudyPanelTitle'),
        quranStudyPanelMeta: document.getElementById('quranStudyPanelMeta'),
        quranStudyPanelText: document.getElementById('quranStudyPanelText'),
        quranCopyAyahBtn: document.getElementById('quranCopyAyahBtn')
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

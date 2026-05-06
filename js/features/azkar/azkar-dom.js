export function cacheAzkarDom() {
    return {
        mainView: document.getElementById('azkarMainView'),
        listView: document.getElementById('azkarListView'),
        categoriesGrid: document.getElementById('azkarCategoriesGrid'),
        primaryAction: document.getElementById('azkarPrimaryAction'),
        listTitle: document.getElementById('azkarListTitle'),
        listHeader: document.querySelector('#azkarListView .azkar-session-header'),
        listContainer: document.getElementById('azkarList'),
        resumeMini: document.getElementById('azkarResumeMini'),
        resumeMiniText: document.getElementById('azkarResumeMiniText')
    };
}

export function resolveAzkarElement(dom, key, fallbackId) {
    return dom?.[key] || document.getElementById(fallbackId);
}

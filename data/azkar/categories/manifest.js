// @ts-nocheck
const createManifestEntry = (entry) => Object.freeze(entry);

export const AZKAR_CATEGORIES_MANIFEST = Object.freeze([
    createManifestEntry({
        slug: 'azkar-morning',
        title: 'أذكار الصباح',
        description: 'بداية هادئة ونشيطة لليوم',
        icon: 'fa-sun',
        period: 'morning',
        sortOrder: 10,
        estimatedMinutes: 4,
        accentTone: 'morning',
        reminderDefault: 'morning',
        isDaily: true,
        modulePath: '../../../data/azkar/categories/azkar-morning.js'
    }),
    createManifestEntry({
        slug: 'azkar-evening',
        title: 'أذكار المساء',
        description: 'ورد خفيف لختم اليوم بطمأنينة',
        icon: 'fa-moon',
        period: 'evening',
        sortOrder: 20,
        estimatedMinutes: 4,
        accentTone: 'evening',
        reminderDefault: 'evening',
        isDaily: true,
        modulePath: '../../../data/azkar/categories/azkar-evening.js'
    }),
    createManifestEntry({
        slug: 'azkar-after-prayer',
        title: 'أذكار بعد الصلاة',
        description: 'ورد قصير يتكرر بعد الصلوات',
        icon: 'fa-mosque',
        period: 'prayer',
        sortOrder: 30,
        estimatedMinutes: 3,
        accentTone: 'prayer',
        reminderDefault: 'prayer',
        isDaily: true,
        modulePath: '../../../data/azkar/categories/azkar-after-prayer.js'
    })
]);

export function normalizeAzkarFallbackSlug(value = '') {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w؀-ۿ-]/g, '')
        .replace(/-+/g, '-');
}

export function getAzkarManifestEntryBySlug(slug) {
    return AZKAR_CATEGORIES_MANIFEST.find(entry => entry.slug === slug) ?? null;
}

export function getAzkarManifestEntryByTitle(title) {
    return AZKAR_CATEGORIES_MANIFEST.find(entry => entry.title === title) ?? null;
}

export function getAzkarManifestEntryByKey(key) {
    if (!key) return null;

    if (typeof key === 'object') {
        return getAzkarManifestEntryBySlug(key.slug) ?? getAzkarManifestEntryByTitle(key.title);
    }

    return getAzkarManifestEntryBySlug(key) ?? getAzkarManifestEntryByTitle(key);
}

export function resolveAzkarSlug(key) {
    const entry = getAzkarManifestEntryByKey(key);
    if (entry) return entry.slug;

    if (typeof key === 'object') {
        return normalizeAzkarFallbackSlug(key.slug || key.title || '');
    }

    return normalizeAzkarFallbackSlug(key);
}

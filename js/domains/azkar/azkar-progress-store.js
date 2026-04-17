import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getAzkarManifestEntryByKey, resolveAzkarSlug } from '../../../data/azkar/categories/manifest.js';

function getAzkarProgressMap() {
    const state = getStorageState();
    if (!state) return {};

    if (!state.azkarProgress || typeof state.azkarProgress !== 'object') {
        state.azkarProgress = {};
    }

    return state.azkarProgress;
}

function resolveProgressKey(categoryKey) {
    const entry = getAzkarManifestEntryByKey(categoryKey);
    if (entry) return entry.slug;
    return resolveAzkarSlug(categoryKey);
}

function getLegacyTitleKey(categoryKey) {
    const entry = getAzkarManifestEntryByKey(categoryKey);
    return entry?.title ?? '';
}

function ensureCategoryProgressBucket(progressMap, categoryKey) {
    const progressKey = resolveProgressKey(categoryKey);
    if (!progressKey) return { progressKey: '', bucket: {} };

    const legacyTitleKey = getLegacyTitleKey(categoryKey);
    const legacyBucket = legacyTitleKey && progressMap[legacyTitleKey] && typeof progressMap[legacyTitleKey] === 'object'
        ? progressMap[legacyTitleKey]
        : null;

    if (!progressMap[progressKey] || typeof progressMap[progressKey] !== 'object') {
        progressMap[progressKey] = {};
    }

    if (legacyBucket) {
        Object.entries(legacyBucket).forEach(([indexKey, value]) => {
            const safeValue = Number(value) || 0;
            const current = Number(progressMap[progressKey][indexKey]) || 0;
            progressMap[progressKey][indexKey] = Math.max(current, safeValue);
        });
        delete progressMap[legacyTitleKey];
    }

    return {
        progressKey,
        bucket: progressMap[progressKey]
    };
}

export const azkarProgressStore = {
    getMap() {
        return getAzkarProgressMap();
    },

    getAzkarProgressForCategory(categoryKey) {
        const progressMap = this.getMap();
        if (!categoryKey) return {};

        const { bucket } = ensureCategoryProgressBucket(progressMap, categoryKey);
        return bucket;
    },

    incrementAzkarProgress(categoryKey, index, target) {
        if (!categoryKey) return null;

        return updateStorageState((state) => {
            if (!state.azkarProgress || typeof state.azkarProgress !== 'object') {
                state.azkarProgress = {};
            }

            const { bucket } = ensureCategoryProgressBucket(state.azkarProgress, categoryKey);
            const safeIndex = Number(index);
            const safeTarget = Math.max(0, Number(target) || 0);
            const current = Number(bucket[safeIndex]) || 0;

            if (safeTarget > 0 && current >= safeTarget) {
                return current;
            }

            const nextValue = current + 1;
            bucket[safeIndex] = nextValue;
            return nextValue;
        });
    }
};

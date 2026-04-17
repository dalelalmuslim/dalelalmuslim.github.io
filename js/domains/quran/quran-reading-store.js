import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { normalizeQuranReadingPoint, normalizeQuranReadingState } from '../../services/storage/storage-normalizers.js';

export const quranReadingStore = {
    getState() {
        return normalizeQuranReadingState(getStorageState()?.quranReading);
    },

    getLastRead() {
        return this.getState().lastRead;
    },

    getBookmark() {
        return this.getState().bookmark;
    },

    saveLastRead(point) {
        const normalized = normalizeQuranReadingPoint(point);

        const saved = updateStorageState((state) => {
            state.quranReading = normalizeQuranReadingState(state.quranReading);
            state.quranReading.lastRead = normalized;
            return state.quranReading;
        });

        return normalizeQuranReadingState(saved).lastRead;
    },

    saveBookmark(point) {
        const normalized = normalizeQuranReadingPoint(point);

        const saved = updateStorageState((state) => {
            state.quranReading = normalizeQuranReadingState(state.quranReading);
            state.quranReading.bookmark = normalized;
            return state.quranReading;
        });

        return normalizeQuranReadingState(saved).bookmark;
    },

    clearBookmark() {
        return Boolean(updateStorageState((state) => {
            state.quranReading = normalizeQuranReadingState(state.quranReading);
            state.quranReading.bookmark = null;
            return true;
        }));
    }
};

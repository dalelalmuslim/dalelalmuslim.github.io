import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { normalizeQuranHifzEntry, normalizeQuranHifzState } from '../../services/storage/storage-normalizers.js';

function nowIso() {
    return new Date().toISOString();
}

function sortEntries(entries = []) {
    return [...entries].sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || a.addedAt || '') || 0;
        const bTime = Date.parse(b.updatedAt || b.addedAt || '') || 0;
        return bTime - aTime;
    });
}

function upsertEntry(entries, nextEntry) {
    const normalizedNext = normalizeQuranHifzEntry(nextEntry);
    if (!normalizedNext) {
        return sortEntries(entries);
    }

    const filtered = entries.filter(entry => entry.key !== normalizedNext.key);
    filtered.unshift(normalizedNext);
    return sortEntries(filtered);
}

export const quranHifzStore = {
    getState() {
        return normalizeQuranHifzState(getStorageState()?.quranHifz);
    },

    getEntries() {
        return this.getState().entries;
    },

    getEntry(key) {
        if (!key) return null;
        return this.getEntries().find(entry => entry.key === key) || null;
    },

    saveEntry(entry) {
        const normalized = normalizeQuranHifzEntry(entry);
        if (!normalized) {
            return null;
        }

        const saved = updateStorageState(state => {
            state.quranHifz = normalizeQuranHifzState(state.quranHifz);
            state.quranHifz.entries = upsertEntry(state.quranHifz.entries, normalized);
            return state.quranHifz;
        });

        return normalizeQuranHifzState(saved).entries.find(item => item.key === normalized.key) || null;
    },

    addToReview(entry) {
        const existing = this.getEntry(entry?.key);
        const timestamp = nowIso();

        return this.saveEntry({
            ...existing,
            ...entry,
            status: 'review',
            addedAt: existing?.addedAt || timestamp,
            updatedAt: timestamp,
            memorizedAt: '',
            reviewCount: Number(existing?.reviewCount || 0) + 1
        });
    },

    markMemorized(entry) {
        const existing = this.getEntry(entry?.key);
        const timestamp = nowIso();

        return this.saveEntry({
            ...existing,
            ...entry,
            status: 'memorized',
            addedAt: existing?.addedAt || timestamp,
            updatedAt: timestamp,
            memorizedAt: timestamp,
            reviewCount: Number(existing?.reviewCount || 0)
        });
    },

    setLastReviewKey(key) {
        const safeKey = typeof key === 'string' ? key : '';
        return Boolean(updateStorageState(state => {
            state.quranHifz = normalizeQuranHifzState(state.quranHifz);
            state.quranHifz.lastReviewKey = safeKey;
            return true;
        }));
    }
};

import { APP_CONFIG } from '../../app/app-config.js';
import { getStorageDateKey, getStorageState, updateStorageState } from '../../services/storage/storage-access.js';

function sanitizeRecentIds(ids) {
    return Array.isArray(ids)
        ? ids.map((id) => Number(id)).filter(Number.isFinite).slice(-APP_CONFIG.DAILY_AYAH.NO_REPEAT_DAYS)
        : [];
}

export const homeFeedStore = {
    getDailyAyahSelectionContext() {
        const state = getStorageState() || {};
        return {
            today: getStorageDateKey(),
            storageState: {
                dailyAyahId: Number.isFinite(Number(state.dailyAyahId)) ? Number(state.dailyAyahId) : null,
                dailyAyahDate: typeof state.dailyAyahDate === 'string' ? state.dailyAyahDate : '',
                recentDailyAyahIds: sanitizeRecentIds(state.recentDailyAyahIds)
            }
        };
    },

    saveDailyAyahSelection({ selectedAyahId = null, today = '', nextRecentIds = [] } = {}) {
        return updateStorageState((state) => {
            state.dailyAyahId = Number.isFinite(Number(selectedAyahId)) ? Number(selectedAyahId) : null;
            state.dailyAyahDate = typeof today === 'string' ? today : '';
            state.recentDailyAyahIds = sanitizeRecentIds(nextRecentIds);

            return {
                dailyAyahId: state.dailyAyahId,
                dailyAyahDate: state.dailyAyahDate,
                recentDailyAyahIds: state.recentDailyAyahIds.slice()
            };
        });
    }
};



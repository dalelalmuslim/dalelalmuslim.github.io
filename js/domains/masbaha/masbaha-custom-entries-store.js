import { APP_CONFIG } from '../../app/app-config.js';
import { getJSONStorageItem, setJSONStorageItem } from '../../services/platform/browser-storage.js';

const MAX_CUSTOM_ZIKR_LENGTH = 200;

function normalizeCustomAzkar(customAzkar) {
    return Array.isArray(customAzkar)
        ? Array.from(new Set(
            customAzkar
                .filter((item) => typeof item === 'string' && item.trim())
                .map((item) => item.trim().slice(0, MAX_CUSTOM_ZIKR_LENGTH))
                .filter(Boolean)
        ))
        : [];
}

export const masbahaCustomEntriesStore = {
    normalize(customAzkar) {
        return normalizeCustomAzkar(customAzkar);
    },

    getList() {
        try {
            return normalizeCustomAzkar(
                getJSONStorageItem(APP_CONFIG.LOCAL_STORAGE_KEYS.CUSTOM_AZKAR_LIST, []) || []
            );
        } catch {
            return [];
        }
    },

    setList(customAzkar) {
        return setJSONStorageItem(
            APP_CONFIG.LOCAL_STORAGE_KEYS.CUSTOM_AZKAR_LIST,
            normalizeCustomAzkar(customAzkar)
        );
    }
};

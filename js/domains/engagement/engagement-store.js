import { getStorageState, persistStorageState, updateStorageState } from '../../services/storage/storage-access.js';

function sanitizeAchievementIds(ids) {
    return Array.isArray(ids)
        ? ids.filter((id) => typeof id === 'string' && id.trim())
        : [];
}

function sanitizeNonNegativeNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
}

export const engagementStore = {
    ensureInitialized() {
        const state = getStorageState();
        if (!state) return false;

        let changed = false;

        const safeAchievements = sanitizeAchievementIds(state.achievements);
        if (safeAchievements.length !== (Array.isArray(state.achievements) ? state.achievements.length : 0)) {
            state.achievements = safeAchievements;
            changed = true;
        } else if (!Array.isArray(state.achievements)) {
            state.achievements = safeAchievements;
            changed = true;
        }

        const safeTasksCompleted = sanitizeNonNegativeNumber(state.tasksCompleted, 0);
        if (safeTasksCompleted !== state.tasksCompleted) {
            state.tasksCompleted = safeTasksCompleted;
            changed = true;
        }

        if (changed) {
            this.persist();
        }

        return true;
    },

    persist() {
        persistStorageState();
    },

    getMetricsSnapshot() {
        const state = getStorageState() || {};
        return {
            totalTasbeeh: sanitizeNonNegativeNumber(state.totalTasbeeh, 0),
            tasksCompleted: sanitizeNonNegativeNumber(state.tasksCompleted, 0),
            streakCount: sanitizeNonNegativeNumber(state.streakCount, 0)
        };
    },

    getUnlockedAchievementIds() {
        this.ensureInitialized();
        return sanitizeAchievementIds(getStorageState()?.achievements).slice();
    },

    isAchievementUnlocked(achievementId) {
        return this.getUnlockedAchievementIds().includes(achievementId);
    },

    unlockAchievement(achievementId, { save = true } = {}) {
        if (!achievementId || !this.ensureInitialized()) return false;

        const result = updateStorageState((state) => {
            if (state.achievements.includes(achievementId)) {
                return false;
            }

            state.achievements.push(achievementId);
            return true;
        }, { save });

        return Boolean(result);
    }
};

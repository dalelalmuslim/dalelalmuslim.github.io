import { appLogger } from '../../shared/logging/app-logger.js';
import { showToast } from '../../app/shell/app-shell.js';
import { engagementStore } from '../../domains/engagement/engagement-store.js';
import { ACHIEVEMENT_DEFINITIONS } from './achievements-catalog.js';

export const achievementsService = {
    list: ACHIEVEMENT_DEFINITIONS,

    ensureStateShape() {
        return engagementStore.ensureInitialized();
    },

    checkAchievements() {
        if (!this.ensureStateShape()) return;

        const state = engagementStore.getMetricsSnapshot();
        const unlockedIds = new Set(engagementStore.getUnlockedAchievementIds());
        let unlockedAny = false;

        this.list.forEach(achievement => {
            if (unlockedIds.has(achievement.id)) return;

            let conditionMet = false;
            try {
                conditionMet = achievement.check(state);
            } catch (error) {
                appLogger.warn(`[Achievements] Error checking ${achievement.id}:`, error);
                return;
            }

            if (!conditionMet) return;

            const unlocked = engagementStore.unlockAchievement(achievement.id, { save: false });
            if (!unlocked) return;

            unlockedIds.add(achievement.id);
            unlockedAny = true;
            showToast(`🏆 إنجاز جديد: ${achievement.title}`, 'success');
        });

        if (unlockedAny) {
            engagementStore.persist();
        }
    },

    getUnlocked() {
        if (!this.ensureStateShape()) return [];

        const unlockedIds = engagementStore.getUnlockedAchievementIds();
        return this.list.filter(item => unlockedIds.includes(item.id));
    },

    getLocked() {
        if (!this.ensureStateShape()) return [];

        const unlockedIds = engagementStore.getUnlockedAchievementIds();
        return this.list.filter(item => !unlockedIds.includes(item.id));
    }
};

export const achievements = achievementsService;

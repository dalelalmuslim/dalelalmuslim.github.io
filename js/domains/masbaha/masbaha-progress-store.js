import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { masbahaCustomEntriesStore } from './masbaha-custom-entries-store.js';
import { masbahaPreferencesBridge } from './masbaha-preferences-bridge.js';

const masbahaCountersStore = {
    getState() {
        return getStorageState();
    },

    getDailyTasbeeh() {
        return Number(this.getState()?.dailyTasbeeh) || 0;
    },

    getMonthlyTasbeeh() {
        return Number(this.getState()?.monthlyTasbeeh) || 0;
    },

    getTotalTasbeeh() {
        return Number(this.getState()?.totalTasbeeh) || 0;
    },

    getCurrentSessionTasbeeh() {
        return Number(this.getState()?.currentSessionTasbeeh) || 0;
    },

    getStreakCount() {
        return Number(this.getState()?.streakCount) || 0;
    },

    incrementTasbeeh(step = 1) {
        const amount = Math.max(1, Number(step) || 1);

        return updateStorageState((state) => {
            state.currentSessionTasbeeh = (Number(state.currentSessionTasbeeh) || 0) + amount;
            state.totalTasbeeh = (Number(state.totalTasbeeh) || 0) + amount;
            state.dailyTasbeeh = (Number(state.dailyTasbeeh) || 0) + amount;
            state.monthlyTasbeeh = (Number(state.monthlyTasbeeh) || 0) + amount;

            return {
                currentSessionTasbeeh: state.currentSessionTasbeeh,
                totalTasbeeh: state.totalTasbeeh,
                dailyTasbeeh: state.dailyTasbeeh,
                monthlyTasbeeh: state.monthlyTasbeeh
            };
        });
    },

    resetCurrentSession() {
        return Boolean(updateStorageState((state) => {
            state.currentSessionTasbeeh = 0;
            return true;
        }));
    }
};

export const masbahaProgressStore = {
    getState() {
        return masbahaCountersStore.getState();
    },

    getDailyTasbeeh() {
        return masbahaCountersStore.getDailyTasbeeh();
    },

    getMonthlyTasbeeh() {
        return masbahaCountersStore.getMonthlyTasbeeh();
    },

    getTotalTasbeeh() {
        return masbahaCountersStore.getTotalTasbeeh();
    },

    getCurrentSessionTasbeeh() {
        return masbahaCountersStore.getCurrentSessionTasbeeh();
    },

    getStreakCount() {
        return masbahaCountersStore.getStreakCount();
    },

    getDailyTasbeehTarget() {
        return masbahaPreferencesBridge.getDailyTasbeehTarget();
    },

    getMasbahaTarget(defaultTarget) {
        return masbahaPreferencesBridge.getMasbahaTarget(defaultTarget);
    },

    setMasbahaTarget(currentTarget) {
        return masbahaPreferencesBridge.setMasbahaTarget(currentTarget);
    },

    isSilentMode() {
        return masbahaPreferencesBridge.isSilentMode();
    },

    setSilentMode(isSilent) {
        return masbahaPreferencesBridge.setSilentMode(isSilent);
    },

    incrementTasbeeh(step = 1) {
        return masbahaCountersStore.incrementTasbeeh(step);
    },

    resetCurrentSession() {
        return masbahaCountersStore.resetCurrentSession();
    },

    getCustomAzkarList() {
        return masbahaCustomEntriesStore.getList();
    },

    setCustomAzkarList(customAzkar) {
        return masbahaCustomEntriesStore.setList(customAzkar);
    }
};

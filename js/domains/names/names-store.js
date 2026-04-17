import { getStorageDateKey, getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { normalizeNamesState } from '../../services/storage/storage-normalizers.js';

function normalizeIndex(index) {
    const safeIndex = Number(index);
    return Number.isInteger(safeIndex) && safeIndex >= 0 ? safeIndex : null;
}

function normalizeFilter(filter) {
    return filter === 'favorites' || filter === 'wird' ? filter : 'all';
}

function normalizeQuizMode(mode) {
    return mode === 'meaning-to-name' ? 'meaning-to-name' : 'name-to-meaning';
}

function createTimestamp() {
    return new Date().toISOString();
}

function ensureNamesState(state) {
    state.namesState = normalizeNamesState(state.namesState);
    return state.namesState;
}

function markViewedInState(namesState, safeIndex) {
    const viewed = new Set(namesState.learningProgress.viewedIndices);
    viewed.add(safeIndex);
    namesState.learningProgress.viewedIndices = Array.from(viewed).sort((a, b) => a - b);
    namesState.learningProgress.lastViewedIndex = safeIndex;
    namesState.learningProgress.lastViewedAt = createTimestamp();
    namesState.view.activeNameIndex = safeIndex;
}

function buildQuizQueue(totalNames, sourceIndices = null) {
    const total = Number(totalNames);
    const base = Array.isArray(sourceIndices)
        ? sourceIndices
            .map(value => normalizeIndex(value))
            .filter(index => Number.isInteger(index) && index >= 0 && index < total)
        : Array.from({ length: Number.isInteger(total) && total > 0 ? total : 0 }, (_, index) => index);

    const queue = Array.from(new Set(base));
    for (let index = queue.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
    }
    return queue;
}

export const namesStore = {
    getState() {
        return normalizeNamesState(getStorageState()?.namesState);
    },

    getTodayKey() {
        return getStorageDateKey() || '';
    },

    setFilter(filter) {
        const nextFilter = normalizeFilter(filter);
        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            namesState.view.activeFilter = nextFilter;
            return namesState;
        });

        return normalizeNamesState(saved).view.activeFilter;
    },

    setActiveNameIndex(index) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return null;

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            namesState.view.activeNameIndex = safeIndex;
            return namesState;
        });

        return normalizeNamesState(saved).view.activeNameIndex;
    },

    markViewed(index) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return null;

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            markViewedInState(namesState, safeIndex);
            return namesState;
        });

        return normalizeNamesState(saved).learningProgress.lastViewedIndex;
    },

    toggleFavorite(index) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return null;

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            const favorites = new Set(namesState.favorites);
            if (favorites.has(safeIndex)) {
                favorites.delete(safeIndex);
            } else {
                favorites.add(safeIndex);
            }
            namesState.favorites = Array.from(favorites).sort((a, b) => a - b);
            return namesState;
        });

        return normalizeNamesState(saved).favorites.includes(safeIndex);
    },

    toggleWird(index) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return null;

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            const wird = new Set(namesState.wird.indices);
            if (wird.has(safeIndex)) {
                wird.delete(safeIndex);
            } else {
                wird.add(safeIndex);
            }
            const indices = Array.from(wird).sort((a, b) => a - b);
            namesState.wird.indices = indices;
            if (!indices.includes(namesState.wird.lastOpenedIndex)) {
                namesState.wird.lastOpenedIndex = indices[0] ?? null;
            }
            if (namesState.view.activeFilter === 'wird' && !indices.length) {
                namesState.view.activeFilter = 'all';
            }
            return namesState;
        });

        return normalizeNamesState(saved).wird.indices.includes(safeIndex);
    },

    markWirdOpened(index) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return null;

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            if (!namesState.wird.indices.includes(safeIndex)) {
                return namesState;
            }
            namesState.wird.lastOpenedIndex = safeIndex;
            return namesState;
        });

        return normalizeNamesState(saved).wird.lastOpenedIndex;
    },

    saveDailyName(index, date = this.getTodayKey()) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return null;

        const safeDate = typeof date === 'string' ? date : '';
        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            namesState.dailyName.index = safeIndex;
            namesState.dailyName.date = safeDate;
            return namesState;
        });

        return normalizeNamesState(saved).dailyName;
    },

    markDailyCompleted(index, date = this.getTodayKey()) {
        const safeIndex = normalizeIndex(index);
        if (safeIndex === null) return { completed: false, alreadyCompleted: false };

        const safeDate = typeof date === 'string' ? date : '';
        let alreadyCompleted = false;

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            alreadyCompleted = namesState.dailyPractice.completedDate === safeDate;
            namesState.dailyPractice.lastCompletedIndex = safeIndex;
            if (!alreadyCompleted) {
                namesState.dailyPractice.completedDate = safeDate;
                namesState.dailyPractice.totalCompletedDays += 1;
            }
            return namesState;
        });

        return {
            completed: normalizeNamesState(saved).dailyPractice.completedDate === safeDate,
            alreadyCompleted
        };
    },

    setQuizMode(mode) {
        const safeMode = normalizeQuizMode(mode);
        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            namesState.quiz.mode = safeMode;
            return namesState;
        });

        return normalizeNamesState(saved).quiz.mode;
    },

    startQuiz(totalNames, { source = 'all', sourceIndices = null } = {}) {
        const queueIndices = buildQuizQueue(totalNames, source === 'weak' ? sourceIndices : null);

        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            namesState.quiz.queueIndices = queueIndices;
            namesState.quiz.position = 0;
            namesState.quiz.revealed = false;
            namesState.quiz.correctCount = 0;
            namesState.quiz.attemptCount = 0;
            namesState.quiz.lastStudiedIndex = null;
            namesState.quiz.lastCompletedAt = '';
            return namesState;
        });

        return normalizeNamesState(saved).quiz;
    },

    ensureQuizQueue(totalNames) {
        const state = this.getState();
        if (state.quiz.queueIndices.length > 0) {
            return state.quiz;
        }

        return this.startQuiz(totalNames);
    },

    revealQuizAnswer() {
        const saved = updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            const currentIndex = namesState.quiz.queueIndices[namesState.quiz.position];
            if (!Number.isInteger(currentIndex)) {
                return namesState;
            }
            namesState.quiz.revealed = true;
            return namesState;
        });

        return normalizeNamesState(saved).quiz;
    },

    answerCurrentQuiz({ known }) {
        let payload = {
            advanced: false,
            completed: false,
            currentIndex: null,
            nextIndex: null,
            known: Boolean(known)
        };

        updateStorageState((state) => {
            const namesState = ensureNamesState(state);
            const currentIndex = namesState.quiz.queueIndices[namesState.quiz.position];
            if (!Number.isInteger(currentIndex)) {
                return namesState;
            }

            const weak = new Set(namesState.quiz.weakIndices);
            if (known) {
                weak.delete(currentIndex);
                namesState.quiz.correctCount += 1;
            } else {
                weak.add(currentIndex);
            }

            namesState.quiz.weakIndices = Array.from(weak).sort((a, b) => a - b);
            namesState.quiz.attemptCount += 1;
            namesState.quiz.lastStudiedIndex = currentIndex;
            namesState.quiz.position += 1;
            namesState.quiz.revealed = false;
            if (namesState.quiz.position >= namesState.quiz.queueIndices.length) {
                namesState.quiz.lastCompletedAt = createTimestamp();
            }

            markViewedInState(namesState, currentIndex);

            payload = {
                advanced: true,
                completed: namesState.quiz.position >= namesState.quiz.queueIndices.length,
                currentIndex,
                nextIndex: namesState.quiz.queueIndices[namesState.quiz.position] ?? null,
                known: Boolean(known)
            };

            return namesState;
        });

        return payload;
    }
};

import { namesStore } from './names-store.js';

function normalizeNamesArray(namesArray) {
    return Array.isArray(namesArray) ? namesArray : [];
}

function getEntryByIndex(namesArray, index) {
    const safeNames = normalizeNamesArray(namesArray);
    return Number.isInteger(index) && index >= 0 && index < safeNames.length
        ? { index, ...safeNames[index] }
        : null;
}

function hashDateKey(value) {
    return String(value || '').split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
}

export function getNamesState() {
    return namesStore.getState();
}

export function getFavoriteIndices() {
    return getNamesState().favorites;
}

export function getFavoriteCount() {
    return getFavoriteIndices().length;
}

export function isFavoriteIndex(index) {
    return getFavoriteIndices().includes(Number(index));
}

export function getWirdIndices() {
    return getNamesState().wird.indices;
}

export function getWirdCount() {
    return getWirdIndices().length;
}

export function isWirdIndex(index) {
    return getWirdIndices().includes(Number(index));
}

export function getActiveFilter() {
    return getNamesState().view.activeFilter;
}

export function getActiveNameIndex() {
    return getNamesState().view.activeNameIndex;
}

export function getViewedCount() {
    return getNamesState().learningProgress.viewedIndices.length;
}

export function getResumeNameEntry(namesArray) {
    return getEntryByIndex(namesArray, getNamesState().learningProgress.lastViewedIndex);
}

export function getActiveNameEntry(namesArray) {
    return getEntryByIndex(namesArray, getActiveNameIndex());
}

export function resolveDailyNameEntry(namesArray) {
    const safeNames = normalizeNamesArray(namesArray);
    if (safeNames.length === 0) return null;

    const state = getNamesState();
    const todayKey = namesStore.getTodayKey();
    const storedIndex = state.dailyName.index;

    if (state.dailyName.date === todayKey && Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < safeNames.length) {
        return getEntryByIndex(safeNames, storedIndex);
    }

    const resolvedIndex = Math.abs(hashDateKey(todayKey)) % safeNames.length;
    namesStore.saveDailyName(resolvedIndex, todayKey);
    return getEntryByIndex(safeNames, resolvedIndex);
}

export function getDailyPracticeState(namesArray) {
    const state = getNamesState();
    const todayKey = namesStore.getTodayKey();
    const dailyEntry = resolveDailyNameEntry(namesArray);
    return {
        completedDate: state.dailyPractice.completedDate,
        lastCompletedIndex: state.dailyPractice.lastCompletedIndex,
        totalCompletedDays: state.dailyPractice.totalCompletedDays,
        isCompletedToday: Boolean(todayKey && state.dailyPractice.completedDate === todayKey),
        isDailyEntryCompleted: Boolean(dailyEntry && state.dailyPractice.completedDate === todayKey && state.dailyPractice.lastCompletedIndex === dailyEntry.index),
        dailyEntry
    };
}

export function getWirdEntries(namesArray) {
    const safeNames = normalizeNamesArray(namesArray);
    const wird = new Set(getWirdIndices());
    return safeNames
        .map((item, index) => ({
            index,
            ...item,
            isFavorite: isFavoriteIndex(index),
            isWird: wird.has(index),
            isActive: getActiveNameIndex() === index
        }))
        .filter(item => item.isWird);
}

export function getWirdPreviewEntries(namesArray, limit = 4) {
    return getWirdEntries(namesArray).slice(0, Math.max(0, Number(limit) || 0));
}

export function getNextWirdEntry(namesArray) {
    const entries = getWirdEntries(namesArray);
    if (!entries.length) return null;

    const lastOpenedIndex = getNamesState().wird.lastOpenedIndex;
    const currentPosition = entries.findIndex(entry => entry.index === lastOpenedIndex);
    if (currentPosition === -1) {
        return entries[0];
    }

    return entries[(currentPosition + 1) % entries.length] || entries[0];
}

export function getVisibleNamesEntries(namesArray) {
    const safeNames = normalizeNamesArray(namesArray);
    const filter = getActiveFilter();
    const favorites = new Set(getFavoriteIndices());
    const wird = new Set(getWirdIndices());

    return safeNames
        .map((item, index) => ({
            index,
            ...item,
            isFavorite: favorites.has(index),
            isWird: wird.has(index),
            isActive: getActiveNameIndex() === index
        }))
        .filter(item => {
            if (filter === 'favorites') return item.isFavorite;
            if (filter === 'wird') return item.isWird;
            return true;
        });
}

export function getQuizState() {
    return getNamesState().quiz;
}

export function getQuizMode() {
    return getQuizState().mode;
}

export function getQuizModeLabel(mode = getQuizMode()) {
    return mode === 'meaning-to-name' ? 'المعنى → الاسم' : 'الاسم → المعنى';
}

export function getCurrentQuizIndex() {
    const quiz = getQuizState();
    return quiz.queueIndices[quiz.position] ?? null;
}

export function getCurrentQuizEntry(namesArray) {
    return getEntryByIndex(namesArray, getCurrentQuizIndex());
}

export function getWeakQuizEntries(namesArray, limit = 5) {
    const safeNames = normalizeNamesArray(namesArray);
    const weak = new Set(getQuizState().weakIndices);
    return safeNames
        .map((item, index) => ({ index, ...item }))
        .filter(item => weak.has(item.index))
        .slice(0, Math.max(0, Number(limit) || 0));
}

export function getQuizProgress(namesArray) {
    const safeNames = normalizeNamesArray(namesArray);
    const quiz = getQuizState();
    const total = quiz.queueIndices.length;
    const position = Math.min(quiz.position, total);
    const currentIndex = quiz.queueIndices[position] ?? null;
    const currentEntry = getEntryByIndex(safeNames, currentIndex);

    return {
        mode: quiz.mode,
        modeLabel: getQuizModeLabel(quiz.mode),
        total,
        position,
        stepNumber: total ? Math.min(position + 1, total) : 0,
        remaining: Math.max(total - position, 0),
        revealed: quiz.revealed,
        correctCount: quiz.correctCount,
        attemptCount: quiz.attemptCount,
        weakCount: quiz.weakIndices.length,
        currentIndex,
        currentEntry,
        completed: total > 0 && position >= total,
        isReady: total > 0,
        weakEntries: getWeakQuizEntries(safeNames),
        lastCompletedAt: quiz.lastCompletedAt
    };
}

export function getNamesSummary(namesArray) {
    const safeNames = normalizeNamesArray(namesArray);
    const dailyPractice = getDailyPracticeState(namesArray);
    const quiz = getQuizProgress(namesArray);
    return {
        total: safeNames.length,
        favorites: getFavoriteCount(),
        wird: getWirdCount(),
        viewed: getViewedCount(),
        activeFilter: getActiveFilter(),
        dailyCompleted: dailyPractice.isCompletedToday,
        dailyCompletedDays: dailyPractice.totalCompletedDays,
        quizWeak: quiz.weakCount,
        quizAttempts: quiz.attemptCount,
        quizCorrect: quiz.correctCount
    };
}

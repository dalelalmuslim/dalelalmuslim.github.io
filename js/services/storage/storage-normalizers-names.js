import { isPlainObject, toSafeNumber } from './storage-normalizers-core.js';

export function createDefaultNamesState() {
    return {
        favorites: [],
        wird: {
            indices: [],
            lastOpenedIndex: null
        },
        dailyName: {
            index: null,
            date: ''
        },
        dailyPractice: {
            completedDate: '',
            lastCompletedIndex: null,
            totalCompletedDays: 0
        },
        learningProgress: {
            viewedIndices: [],
            lastViewedIndex: null,
            lastViewedAt: ''
        },
        quiz: {
            mode: 'name-to-meaning',
            queueIndices: [],
            position: 0,
            revealed: false,
            weakIndices: [],
            correctCount: 0,
            attemptCount: 0,
            lastStudiedIndex: null,
            lastCompletedAt: ''
        },
        view: {
            activeFilter: 'all',
            activeNameIndex: null
        }
    };
}

function normalizeNameIndex(value) {
    const safeIndex = toSafeNumber(value, NaN, { min: 0 });
    return Number.isFinite(safeIndex) ? Math.trunc(safeIndex) : null;
}

function normalizeNameIndices(values) {
    if (!Array.isArray(values)) return [];

    const seen = new Set();
    return values
        .map(value => normalizeNameIndex(value))
        .filter(index => {
            if (!Number.isInteger(index) || index < 0) return false;
            if (seen.has(index)) return false;
            seen.add(index);
            return true;
        });
}

function normalizeDateKey(value) {
    return typeof value === 'string' ? value : '';
}

function normalizeNamesFilter(value, fallback = 'all') {
    return value === 'favorites' || value === 'wird' ? value : fallback;
}

function normalizeNamesQuizMode(value, fallback = 'name-to-meaning') {
    return value === 'meaning-to-name' ? 'meaning-to-name' : fallback;
}

export function normalizeNamesState(value) {
    const defaults = createDefaultNamesState();
    const source = isPlainObject(value) ? value : {};
    const wirdSource = isPlainObject(source.wird) ? source.wird : {};
    const dailySource = isPlainObject(source.dailyName) ? source.dailyName : {};
    const dailyPracticeSource = isPlainObject(source.dailyPractice) ? source.dailyPractice : {};
    const learningSource = isPlainObject(source.learningProgress) ? source.learningProgress : {};
    const quizSource = isPlainObject(source.quiz) ? source.quiz : {};
    const viewSource = isPlainObject(source.view) ? source.view : {};
    const wirdIndices = normalizeNameIndices(wirdSource.indices);
    const lastOpenedIndex = normalizeNameIndex(wirdSource.lastOpenedIndex);
    const quizQueueIndices = normalizeNameIndices(quizSource.queueIndices);
    const quizWeakIndices = normalizeNameIndices(quizSource.weakIndices);
    const quizPosition = Math.min(
        Math.trunc(toSafeNumber(quizSource.position, defaults.quiz.position, { min: 0 })),
        quizQueueIndices.length
    );
    const quizAttemptCount = Math.trunc(toSafeNumber(quizSource.attemptCount, defaults.quiz.attemptCount, { min: 0 }));
    const quizCorrectCount = Math.min(
        Math.trunc(toSafeNumber(quizSource.correctCount, defaults.quiz.correctCount, { min: 0 })),
        quizAttemptCount
    );

    return {
        favorites: normalizeNameIndices(source.favorites),
        wird: {
            indices: wirdIndices,
            lastOpenedIndex: wirdIndices.includes(lastOpenedIndex) ? lastOpenedIndex : null
        },
        dailyName: {
            index: normalizeNameIndex(dailySource.index),
            date: normalizeDateKey(dailySource.date)
        },
        dailyPractice: {
            completedDate: normalizeDateKey(dailyPracticeSource.completedDate),
            lastCompletedIndex: normalizeNameIndex(dailyPracticeSource.lastCompletedIndex),
            totalCompletedDays: toSafeNumber(dailyPracticeSource.totalCompletedDays, 0, { min: 0 })
        },
        learningProgress: {
            viewedIndices: normalizeNameIndices(learningSource.viewedIndices),
            lastViewedIndex: normalizeNameIndex(learningSource.lastViewedIndex),
            lastViewedAt: typeof learningSource.lastViewedAt === 'string' ? learningSource.lastViewedAt : ''
        },
        quiz: {
            mode: normalizeNamesQuizMode(quizSource.mode, defaults.quiz.mode),
            queueIndices: quizQueueIndices,
            position: quizPosition,
            revealed: Boolean(quizSource.revealed) && quizPosition < quizQueueIndices.length,
            weakIndices: quizWeakIndices,
            correctCount: quizCorrectCount,
            attemptCount: quizAttemptCount,
            lastStudiedIndex: normalizeNameIndex(quizSource.lastStudiedIndex),
            lastCompletedAt: typeof quizSource.lastCompletedAt === 'string' ? quizSource.lastCompletedAt : ''
        },
        view: {
            activeFilter: normalizeNamesFilter(viewSource.activeFilter, defaults.view.activeFilter),
            activeNameIndex: normalizeNameIndex(viewSource.activeNameIndex)
        }
    };
}

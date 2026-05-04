import { APP_CONFIG } from '../../app/app-config.js';
import { createBaseStorageState } from './storage-schema.js';
import {
    toSafeNumber,
    normalizeTasks,
    normalizeBookmark,
    normalizeQuranReadingState,
    normalizeAchievements,
    normalizeCompletedTasks,
    normalizeAzkarProgress,
    normalizeAzkarSession,
    normalizeAzkarPreferences,
    normalizeAzkarHistory,
    normalizeDuasSession,
    normalizeDuasPreferences,
    normalizeDuasHistory,
    normalizeStoriesSession,
    normalizeStoriesPreferences,
    normalizeStoriesHistory,
    normalizeNamesState,
    normalizeSettings
} from './storage-normalizers.js';

function getKnownStorageStateSnapshot(savedState) {
    if (!savedState || typeof savedState !== 'object' || Array.isArray(savedState)) {
        return {};
    }

    const baseState = createBaseStorageState();
    const knownState = {};

    Object.keys(baseState).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(savedState, key)) {
            knownState[key] = savedState[key];
        }
    });

    return knownState;
}

export function migrateStorageState(savedState = {}, schemaVersion) {
    const merged = {
        ...createBaseStorageState(),
        ...getKnownStorageStateSnapshot(savedState)
    };

    merged.schemaVersion = schemaVersion;
    merged.dailyTasbeeh = toSafeNumber(merged.dailyTasbeeh, 0, { min: 0 });
    merged.monthlyTasbeeh = toSafeNumber(merged.monthlyTasbeeh, 0, { min: 0 });
    merged.totalTasbeeh = toSafeNumber(merged.totalTasbeeh, 0, { min: 0 });
    merged.streakCount = toSafeNumber(merged.streakCount, 0, { min: 0 });
    merged.tasksCompleted = toSafeNumber(merged.tasksCompleted, 0, { min: 0 });
    merged.currentSessionTasbeeh = toSafeNumber(merged.currentSessionTasbeeh, 0, { min: 0 });
    merged.achievements = normalizeAchievements(merged.achievements);
    merged.lastDate = typeof merged.lastDate === 'string' ? merged.lastDate : '';
    merged.lastMonthKey = typeof merged.lastMonthKey === 'string' ? merged.lastMonthKey : '';
    merged.tasks = normalizeTasks(merged.tasks);
    merged.completedTasks = normalizeCompletedTasks(merged.completedTasks, merged.tasks);
    merged.azkarProgress = normalizeAzkarProgress(merged.azkarProgress);
    merged.azkarSession = normalizeAzkarSession(merged.azkarSession);
    merged.azkarPreferences = normalizeAzkarPreferences(merged.azkarPreferences);
    merged.azkarHistory = normalizeAzkarHistory(merged.azkarHistory);
    merged.duasSession = normalizeDuasSession(merged.duasSession);
    merged.duasPreferences = normalizeDuasPreferences(merged.duasPreferences);
    merged.duasHistory = normalizeDuasHistory(merged.duasHistory);
    merged.storiesSession = normalizeStoriesSession(merged.storiesSession);
    merged.storiesPreferences = normalizeStoriesPreferences(merged.storiesPreferences);
    merged.storiesHistory = normalizeStoriesHistory(merged.storiesHistory);
    merged.namesState = normalizeNamesState(merged.namesState);
    merged.quranReading = normalizeQuranReadingState(merged.quranReading);

    const savedSchemaVersion = toSafeNumber(savedState?.schemaVersion, 0, { min: 0 });
    const shouldBackfillQuranReadingFromLegacyBookmark = savedSchemaVersion > 0 && savedSchemaVersion < 8;
    const legacyQuranBookmark = normalizeBookmark(savedState?.quranBookmark);

    if (shouldBackfillQuranReadingFromLegacyBookmark && !merged.quranReading.lastRead && legacyQuranBookmark) {
        merged.quranReading.lastRead = {
            ...legacyQuranBookmark,
            updatedAt: ''
        };
    }

    if (shouldBackfillQuranReadingFromLegacyBookmark && !merged.quranReading.bookmark && legacyQuranBookmark) {
        merged.quranReading.bookmark = {
            ...legacyQuranBookmark,
            updatedAt: ''
        };
    }

    merged.dailyAyahId = Number.isFinite(Number(merged.dailyAyahId)) ? Number(merged.dailyAyahId) : null;
    merged.dailyAyahDate = typeof merged.dailyAyahDate === 'string' ? merged.dailyAyahDate : '';
    merged.recentDailyAyahIds = Array.isArray(merged.recentDailyAyahIds)
        ? merged.recentDailyAyahIds.map(id => Number(id)).filter(Number.isFinite).slice(-APP_CONFIG.DAILY_AYAH.NO_REPEAT_DAYS)
        : [];
    merged.settings = normalizeSettings(merged.settings);

    return merged;
}

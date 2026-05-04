import { APP_CONFIG, getDefaultSettings } from '../../app/app-config.js';
import {
    createDefaultAzkarSession,
    createDefaultAzkarPreferences,
    createDefaultAzkarHistory,
    createDefaultDuasSession,
    createDefaultDuasPreferences,
    createDefaultDuasHistory,
    createDefaultStoriesSession,
    createDefaultStoriesPreferences,
    createDefaultStoriesHistory,
    createDefaultNamesState
} from './storage-normalizers.js';

export function createBaseStorageState() {
    return {
        schemaVersion: APP_CONFIG.SCHEMA_VERSION,
        dailyTasbeeh: 0,
        monthlyTasbeeh: 0,
        totalTasbeeh: 0,
        streakCount: 0,
        tasksCompleted: 0,
        achievements: [],
        lastDate: '',
        lastMonthKey: '',
        tasks: [],
        completedTasks: [],
        azkarProgress: {},
        azkarSession: createDefaultAzkarSession(),
        azkarPreferences: createDefaultAzkarPreferences(),
        azkarHistory: createDefaultAzkarHistory(),
        duasSession: createDefaultDuasSession(),
        duasPreferences: createDefaultDuasPreferences(),
        duasHistory: createDefaultDuasHistory(),
        storiesSession: createDefaultStoriesSession(),
        storiesPreferences: createDefaultStoriesPreferences(),
        storiesHistory: createDefaultStoriesHistory(),
        namesState: createDefaultNamesState(),
        quranReading: {
            lastRead: null,
            bookmark: null
        },
        currentSessionTasbeeh: 0,
        dailyAyahId: null,
        dailyAyahDate: '',
        recentDailyAyahIds: [],
        settings: getDefaultSettings()
    };
}

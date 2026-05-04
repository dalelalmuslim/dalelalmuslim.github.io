import { appLogger } from '../../shared/logging/app-logger.js';
import { APP_CONFIG, getDefaultSettings } from '../../app/app-config.js';
import { getStorageAvailability, getStorageItem, removeStorageItem } from '../platform/browser-storage.js';
import { createBaseStorageState } from './storage-schema.js';
import { getLocalDateKey, getLocalMonthKey, getDayDifference } from './storage-dates.js';
import {
    toSafeNumber,
    isPlainObject,
    createTaskId,
    normalizeTasks,
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
import { migrateStorageState } from './storage-migrations.js';
import {
    bindStoragePersistenceLifecycle,
    cancelPendingStorageQuickSave,
    flushPendingStorageQuickSave,
    reportStoragePersistenceFailure,
    scheduleStorageQuickSave,
    writeSerializedStorageState
} from './storage-persistence.js';
import { applyDateBoundaryResets } from './storage-reset-policy.js';

export const storage = {
    STORAGE_KEY: APP_CONFIG.STORAGE_KEY,
    SCHEMA_VERSION: APP_CONFIG.SCHEMA_VERSION,
    state: createBaseStorageState(),
    pendingQuickSaveTimerId: null,
    pendingQuickSaveIdleId: null,
    pendingQuickSaveDirty: false,
    persistenceLifecycleBound: false,
    lastLoadRecovered: false,
    lastLoadMeta: null,

    init() {
        this.bindPersistenceLifecycle();

        const availability = getStorageAvailability();
        const status = {
            ok: true,
            fatal: false,
            persistent: Boolean(availability?.persistent),
            recovered: false,
            stateChanged: false,
            reason: availability?.reason || 'ready',
            error: availability?.error || null,
            migration: {
                sourceKey: '',
                usedLegacyKey: false,
                promotedToPrimary: false,
                parseRecovered: false,
                schemaChanged: false,
                hadExistingState: false
            }
        };

        if (!availability?.available) {
            this.lastLoadMeta = { ...status.migration };
            this.state = this.migrateState(this.state);
            this.validateState();
            this.syncDerivedState();
            return status;
        }

        try {
            const loadStatus = this.load();
            const stateChangedForNewDay = this.checkNewDay();
            this.syncDerivedState();

            status.stateChanged = Boolean(loadStatus.stateChanged || stateChangedForNewDay);
            status.recovered = Boolean(this.lastLoadRecovered);
            status.migration = {
                ...status.migration,
                ...(loadStatus.migration || {})
            };

            if (status.stateChanged) {
                this.save();
            }

            return status;
        } catch (error) {
            return {
                ...status,
                ok: false,
                fatal: true,
                error,
                reason: 'storage_init_failed'
            };
        }
    },

    toSafeNumber,
    isPlainObject,
    createTaskId,
    getLocalDateKey,
    getLocalMonthKey,
    getDayDifference,
    normalizeSettings,

    bindPersistenceLifecycle() {
        bindStoragePersistenceLifecycle(this);
    },

    cancelPendingQuickSave() {
        cancelPendingStorageQuickSave(this);
    },

    writeSerializedState(serialized, options) {
        return writeSerializedStorageState(this, serialized, options);
    },

    flushPendingQuickSave() {
        return flushPendingStorageQuickSave(this);
    },

    scheduleQuickSave() {
        return scheduleStorageQuickSave(this);
    },

    syncDerivedState() {
        if (!Array.isArray(this.state.tasks)) {
            this.state.tasks = [];
        }

        if (!Array.isArray(this.state.achievements)) {
            this.state.achievements = [];
        }

        if (!Number.isFinite(Number(this.state.tasksCompleted))) {
            this.state.tasksCompleted = 0;
        }

        this.state.completedTasks = this.state.tasks
            .filter(task => task.completed)
            .map(task => task.id);
    },

    validateState() {
        const numericFields = [
            'dailyTasbeeh', 'monthlyTasbeeh', 'totalTasbeeh',
            'streakCount', 'tasksCompleted', 'currentSessionTasbeeh'
        ];

        numericFields.forEach(field => {
            if (typeof this.state[field] !== 'number' || this.state[field] < 0) {
                this.state[field] = 0;
            }
        });

        if (!Array.isArray(this.state.achievements)) this.state.achievements = [];
        if (!Array.isArray(this.state.tasks)) this.state.tasks = [];
        if (!Array.isArray(this.state.completedTasks)) this.state.completedTasks = [];
        if (!Array.isArray(this.state.recentDailyAyahIds)) this.state.recentDailyAyahIds = [];

        if (!this.isPlainObject(this.state.azkarProgress)) this.state.azkarProgress = {};
        if (!this.isPlainObject(this.state.azkarSession)) this.state.azkarSession = createBaseStorageState().azkarSession;
        if (!this.isPlainObject(this.state.azkarPreferences)) this.state.azkarPreferences = createBaseStorageState().azkarPreferences;
        if (!this.isPlainObject(this.state.azkarHistory)) this.state.azkarHistory = createBaseStorageState().azkarHistory;
        if (!this.isPlainObject(this.state.duasSession)) this.state.duasSession = createBaseStorageState().duasSession;
        if (!this.isPlainObject(this.state.duasPreferences)) this.state.duasPreferences = createBaseStorageState().duasPreferences;
        if (!this.isPlainObject(this.state.duasHistory)) this.state.duasHistory = createBaseStorageState().duasHistory;
        if (!this.isPlainObject(this.state.storiesSession)) this.state.storiesSession = createBaseStorageState().storiesSession;
        if (!this.isPlainObject(this.state.storiesPreferences)) this.state.storiesPreferences = createBaseStorageState().storiesPreferences;
        if (!this.isPlainObject(this.state.storiesHistory)) this.state.storiesHistory = createBaseStorageState().storiesHistory;
        if (!this.isPlainObject(this.state.settings)) this.state.settings = getDefaultSettings();
        if (!this.isPlainObject(this.state.namesState)) this.state.namesState = createBaseStorageState().namesState;

        if (!this.isPlainObject(this.state.quranReading)) {
            this.state.quranReading = createBaseStorageState().quranReading;
        }

        if (
            this.state.dailyAyahId !== null &&
            (!Number.isFinite(Number(this.state.dailyAyahId)) || Number(this.state.dailyAyahId) <= 0)
        ) {
            this.state.dailyAyahId = null;
        }

        if (typeof this.state.dailyAyahDate !== 'string') {
            this.state.dailyAyahDate = '';
        }

        this.state.recentDailyAyahIds = this.state.recentDailyAyahIds
            .map(id => Number(id))
            .filter(Number.isFinite)
            .slice(-APP_CONFIG.DAILY_AYAH.NO_REPEAT_DAYS);

        this.state.azkarProgress = normalizeAzkarProgress(this.state.azkarProgress);
        this.state.azkarSession = normalizeAzkarSession(this.state.azkarSession);
        this.state.azkarPreferences = normalizeAzkarPreferences(this.state.azkarPreferences);
        this.state.azkarHistory = normalizeAzkarHistory(this.state.azkarHistory);
        this.state.duasSession = normalizeDuasSession(this.state.duasSession);
        this.state.duasPreferences = normalizeDuasPreferences(this.state.duasPreferences);
        this.state.duasHistory = normalizeDuasHistory(this.state.duasHistory);
        this.state.storiesSession = normalizeStoriesSession(this.state.storiesSession);
        this.state.storiesPreferences = normalizeStoriesPreferences(this.state.storiesPreferences);
        this.state.storiesHistory = normalizeStoriesHistory(this.state.storiesHistory);
        this.state.tasks = normalizeTasks(this.state.tasks);
        this.state.achievements = normalizeAchievements(this.state.achievements);
        this.state.completedTasks = normalizeCompletedTasks(this.state.completedTasks, this.state.tasks);
        this.state.namesState = normalizeNamesState(this.state.namesState);
        this.state.quranReading = normalizeQuranReadingState(this.state.quranReading);
        this.state.settings = this.normalizeSettings(this.state.settings);
    },

    migrateState(savedState = {}) {
        return migrateStorageState(savedState, this.SCHEMA_VERSION);
    },

    load() {
        this.lastLoadRecovered = false;
        this.lastLoadMeta = {
            sourceKey: '',
            usedLegacyKey: false,
            promotedToPrimary: false,
            parseRecovered: false,
            schemaChanged: false,
            hadExistingState: false
        };

        try {
            const storageKeys = [this.STORAGE_KEY, ...(APP_CONFIG.STORAGE_KEY_ALIASES || [])];
            let saved = null;
            let loadedFromKey = '';

            for (const key of storageKeys) {
                const candidate = getStorageItem(key);
                if (candidate) {
                    saved = candidate;
                    loadedFromKey = key;
                    break;
                }
            }

            if (!saved) {
                this.state = this.migrateState(this.state);
                this.validateState();
                this.syncDerivedState();
                return {
                    stateChanged: true,
                    migration: { ...this.lastLoadMeta }
                };
            }

            const parsed = JSON.parse(saved);
            const previousSchemaVersion = Number(parsed?.schemaVersion);
            this.state = this.migrateState(parsed);
            this.validateState();
            this.syncDerivedState();

            const stateChanged = JSON.stringify(this.state) !== saved || loadedFromKey !== this.STORAGE_KEY;
            this.lastLoadMeta = {
                sourceKey: loadedFromKey,
                usedLegacyKey: loadedFromKey !== this.STORAGE_KEY,
                promotedToPrimary: loadedFromKey !== this.STORAGE_KEY,
                parseRecovered: false,
                schemaChanged: Number.isFinite(previousSchemaVersion) ? previousSchemaVersion !== this.SCHEMA_VERSION : false,
                hadExistingState: true
            };

            return {
                stateChanged,
                migration: { ...this.lastLoadMeta }
            };
        } catch (error) {
            this.lastLoadRecovered = true;
            appLogger.error('[Storage Error] بيانات تالفة، سيتم إعادة التهيئة.', error);
            removeStorageItem(this.STORAGE_KEY);
            this.state = this.migrateState(this.state);
            this.validateState();
            this.syncDerivedState();
            this.lastLoadMeta = {
                sourceKey: this.STORAGE_KEY,
                usedLegacyKey: false,
                promotedToPrimary: false,
                parseRecovered: true,
                schemaChanged: false,
                hadExistingState: true
            };
            return {
                stateChanged: true,
                migration: { ...this.lastLoadMeta }
            };
        }
    },

    save() {
        try {
            this.cancelPendingQuickSave();
            this.pendingQuickSaveDirty = false;

            this.state = this.migrateState(this.state);
            this.validateState();
            this.syncDerivedState();

            delete this.state.quranBookmark;
            delete this.state.quranHifz;

            const serialized = JSON.stringify(this.state);
            this.writeSerializedState(serialized);
        } catch (error) {
            reportStoragePersistenceFailure(error);
        }
    },

    quickSave({ immediate = false } = {}) {
        if (immediate) {
            this.pendingQuickSaveDirty = true;
            return this.flushPendingQuickSave();
        }

        return this.scheduleQuickSave();
    },

    checkNewDay() {
        return applyDateBoundaryResets(this);
    }
};

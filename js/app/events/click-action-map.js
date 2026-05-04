import { notifications } from '../../services/notifications/index.js';
import { getFeatureCapabilities } from '../../features/index.js';
import { getSectionTitle } from '../../router/section-registry.js';

export function resolveClickTarget(event) {
    return {
        backBtn: event.target.closest('#backBtn') || event.target.closest('[data-back-button="true"]'),
        navBtn: event.target.closest('[data-nav-section]'),
        masbahaAction: event.target.closest('[data-masbaha-action]'),
        azkarAction: event.target.closest('[data-azkar-action]'),
        duasAction: event.target.closest('[data-duas-action]'),
        namesAction: event.target.closest('[data-names-action]'),
        quranAction: event.target.closest('[data-quran-action]'),
        storiesAction: event.target.closest('[data-stories-action]'),
        tasksAction: event.target.closest('[data-tasks-action]'),
        appModalAction: event.target.closest('[data-app-modal-action]'),
        themeBtn: event.target.closest('[data-theme-btn]'),
        appAction: event.target.closest('[data-app-action]'),
        modalOverlay: event.target.classList?.contains('modal-overlay') ? event.target : null,
        applyUpdateBtn: event.target.closest('#applyUpdateBtn')
    };
}

export function createClickActionMap(appApi, event, target) {
    const masbahaCapabilities = getFeatureCapabilities('masbaha');
    const azkarCapabilities = getFeatureCapabilities('azkar');
    const duasCapabilities = getFeatureCapabilities('duas');
    const quranCapabilities = getFeatureCapabilities('quran');
    const namesCapabilities = getFeatureCapabilities('names');
    const storiesCapabilities = getFeatureCapabilities('stories');
    const tasksCapabilities = getFeatureCapabilities('tasks');

    return {
        backBtn: () => appApi.handleBackNavigation(),
        navBtn: () => {
            const section = target.dataset.navSection;
            const title = target.dataset.navTitle || getSectionTitle(section);
            const resumeQuranOnOpen = section === 'quran' && target.dataset.navQuranResume === 'true';
            const resumeAzkarOnOpen = section === 'azkar' && target.dataset.navAzkarResume === 'true';
            const azkarResumeSlug = typeof target.dataset.navAzkarResumeSlug === 'string'
                ? target.dataset.navAzkarResumeSlug.trim()
                : '';

            appApi.openSection(section, title);

            if (resumeQuranOnOpen) {
                queueMicrotask(() => {
                    getFeatureCapabilities('quran')?.resumeReading?.();
                });
            }

            if (resumeAzkarOnOpen && azkarResumeSlug) {
                queueMicrotask(() => {
                    getFeatureCapabilities('azkar')?.openCategory?.(azkarResumeSlug);
                });
            }
        },
        masbahaAction: () => {
            const action = target.dataset.mashabaAction ?? target.dataset.masbahaAction;
            const actions = {
                'toggle-silent':            () => masbahaCapabilities?.toggleSilent?.(),
                increment:                  () => masbahaCapabilities?.increment?.(),
                reset:                      () => masbahaCapabilities?.reset?.(),
                'open-zikr-sheet':          () => masbahaCapabilities?.openZikrSheet?.(),
                'close-zikr-sheet':         () => masbahaCapabilities?.closeZikrSheet?.(),
                'save-custom-entry':        () => masbahaCapabilities?.saveCustomEntry?.(),
                'confirm-delete-entry':     () => masbahaCapabilities?.confirmDeleteEntry?.(),
                'close-delete-entry-modal': () => masbahaCapabilities?.closeDeleteEntryModal?.(),
                'confirm-reset':            () => masbahaCapabilities?.confirmReset?.(),
                'close-reset-modal':        () => masbahaCapabilities?.closeResetModal?.(),
                // Legacy shims — kept so any cached HTML still works
                'open-custom-entries-modal':  () => masbahaCapabilities?.openZikrSheet?.(),
                'close-custom-entries-modal': () => masbahaCapabilities?.closeZikrSheet?.(),
            };
            actions[action]?.();
        },
        azkarAction: () => {
            const action = target.dataset.azkarAction;
            const value = target.dataset.azkarValue;
            const actions = {
                'close-category': () => azkarCapabilities?.closeCategory?.(),
                'resume-category': () => azkarCapabilities?.resumeCategory?.(),
                'set-filter': () => azkarCapabilities?.setFilter?.(value),
                'toggle-focus-mode': () => azkarCapabilities?.toggleFocusMode?.(),
                'toggle-large-text': () => azkarCapabilities?.toggleLargeText?.(),
                'toggle-vibration': () => azkarCapabilities?.toggleVibration?.(),
                'toggle-favorite': () => azkarCapabilities?.toggleFavorite?.(),
                'cycle-reminder-window': () => azkarCapabilities?.cycleReminderWindow?.(),
                'toggle-smart-ordering': () => azkarCapabilities?.toggleSmartOrdering?.()
            };
            actions[action]?.();
        },
        duasAction: () => {
            duasCapabilities?.handleActionTarget?.(target);
        },
        namesAction: () => {
            const action = target.dataset.namesAction;
            const index = Number(target.dataset.nameIndex);
            const filter = target.dataset.nameFilter;
            const actions = {
                'toggle-favorite': () => namesCapabilities?.toggleFavorite?.(index),
                'toggle-wird': () => namesCapabilities?.toggleWird?.(index),
                'set-filter': () => namesCapabilities?.setFilter?.(filter),
                'select-name': () => namesCapabilities?.selectName?.(index),
                'open-daily-name': () => namesCapabilities?.openDailyName?.(),
                'mark-daily-complete': () => namesCapabilities?.markDailyComplete?.(index),
                'open-next-wird': () => namesCapabilities?.openNextWird?.(),
                'resume-name': () => namesCapabilities?.resumeName?.(),
                'copy-detail': () => namesCapabilities?.copyDetail?.(),
                'set-quiz-mode': () => namesCapabilities?.setQuizMode?.(target.dataset.nameQuizMode),
                'reveal-quiz-answer': () => namesCapabilities?.revealQuizAnswer?.(),
                'mark-quiz-known': () => namesCapabilities?.markQuizKnown?.(),
                'mark-quiz-review': () => namesCapabilities?.markQuizReview?.(),
                'restart-quiz': () => namesCapabilities?.restartQuiz?.(),
                'review-weak-quiz': () => namesCapabilities?.reviewWeakQuiz?.()
            };
            actions[action]?.();
        },
        quranAction: () => {
            const action = target.dataset.quranAction;
            const actions = {
                'resume-reading': () => quranCapabilities?.resumeReading?.(),
                'save-bookmark': () => quranCapabilities?.saveBookmark?.(),
                'close-surah': () => quranCapabilities?.closeSurah?.(),
                'close-study-panel': () => quranCapabilities?.closeStudyPanel?.(),
                'copy-ayah': () => quranCapabilities?.copyActiveAyah?.()
            };
            actions[action]?.();
        },
        storiesAction: () => {
            storiesCapabilities?.handleActionTarget?.(target);
        },
        tasksAction: () => {
            const action = target.dataset.tasksAction;
            const actions = {
                'restore-defaults': () => tasksCapabilities?.openRestoreDefaultsModal?.(),
                'add-task': () => tasksCapabilities?.addTask?.(),
                'confirm-delete-task': () => tasksCapabilities?.confirmDelete?.(),
                'close-delete-task-modal': () => tasksCapabilities?.closeDeleteTaskModal?.(),
                'confirm-restore': () => tasksCapabilities?.confirmRestoreDefaults?.(),
                'close-restore-modal': () => tasksCapabilities?.closeRestoreDefaultsModal?.()
            };
            actions[action]?.();
        },
        appModalAction: () => {
            const action = target.dataset.appModalAction;
            const actions = {
                'close-update': () => appApi.closeUpdateModal(),
                'apply-update': () => appApi.applyUpdate()
            };
            actions[action]?.();
        },
        themeBtn: () => appApi.setTheme(target.dataset.themeBtn),
        appAction: () => {
            const action = target.dataset.appAction;
            if (action === 'share') appApi.shareApp();
            else if (action === 'updates') appApi.checkForUpdates();
            else if (action === 'refresh-content') appApi.refreshPublicContent?.();
            else if (action === 'go-back') appApi.handleBackNavigation();
            else if (action === 'copy-diagnostics') appApi.copyRuntimeDiagnostics?.();
            else if (action === 'copy-support-bundle') appApi.copyRuntimeDiagnostics?.();
            else if (action === 'download-support-bundle') appApi.downloadSupportBundle?.();
        },
        modalOverlay: () => {
            const modalClosers = {
                updateModal:              () => appApi.closeUpdateModal(),
                // Legacy shim — masbahaCustomEntriesModal no longer exists in DOM
                // but may still fire on cached SW pages.
                masbahaCustomEntriesModal: () => masbahaCapabilities?.closeZikrSheet?.(),
                masbahaDeleteEntryModal:   () => masbahaCapabilities?.closeDeleteEntryModal?.(),
                resetMasbahaModal:         () => masbahaCapabilities?.closeResetModal?.(),
                deleteTaskModal:           () => tasksCapabilities?.closeDeleteTaskModal?.(),
                restoreTasksModal:         () => tasksCapabilities?.closeRestoreDefaultsModal?.(),
            };
            modalClosers[event.target.id]?.();
        },
        applyUpdateBtn: () => appApi.applyUpdate()
    };
}

export function refreshGlobalAppEffects(appApi) {
    appApi.checkForNewDay();
    notifications?.checkTimeAndNotify?.();
}

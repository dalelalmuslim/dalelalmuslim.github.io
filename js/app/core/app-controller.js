import { appRouter } from '../../router/app-router.js';
import { createSectionRuntime, runSectionLifecycle } from '../../router/section-runtime.js';
import { registerAppShell } from '../shell/app-shell.js';
import { startBackgroundServices } from '../bootstrap/start-background-services.js';
import { pwa } from '../../pwa.js';

import { bindGlobalEvents, bindUIEvents } from '../events/bind-app-events.js';
import { getOrCreateToast, showToast } from '../actions/toast-actions.js';
import {
    resetSubviews,
    setActiveTab,
    updateHeader,
    showSectionInternal,
    showHomeInternal,
    openSection,
    goHome,
    handleBackNavigation,
    handleBackButton
} from '../actions/navigation-actions.js';
import { initTheme, setTheme, loadUserProfile, saveUserProfile } from '../actions/settings-actions.js';
import {
    updateOnlineStatus,
    setupServiceWorkerUpdates,
    showUpdateBanner,
    hideUpdateBanner,
    showUpdateModal,
    closeUpdateModal,
    setupSmartUpdates,
    checkForUpdates,
    applyUpdate,
    setUpdateStatus,
    recordCacheUpdate
} from '../actions/update-actions.js';
import { shareApp, shareText, copyToClipboard } from '../actions/share-actions.js';
import { getLocalDateKey, setupDayWatcher, checkForNewDay } from '../lifecycle/day-cycle.js';
import {
    getElement,
    getHeaderTitle,
    getBackButton,
    getSectionElement,
    hideElement,
    showElement,
    safeInit
} from './app-dom.js';
import { initializeApp } from './app-startup.js';
import { setupRuntimeHealth, updateRuntimeHealth, renderRuntimeHealth, recordStartupHealth, recordStorageHealth, recordContentFoundationHealth } from '../health/runtime-health.js';
import { setupRuntimeDiagnostics, updateRuntimeDiagnostics, renderRuntimeDiagnostics, copyRuntimeDiagnostics, buildRuntimeDiagnosticsReport, buildSupportBundle, downloadSupportBundle } from '../health/runtime-diagnostics.js';
import * as authService from '../../services/auth/index.js';
import * as contentClient from '../../services/content/content-client.js';
import * as sectionCache from '../../services/cache/section-cache.js';
import * as sectionVersions from '../../services/versions/section-version-store.js';

export const app = {
    newWorker: null,
    initialized: false,
    toastTimeout: null,
    toastRemoveTimeout: null,
    dayWatcherInterval: null,
    lastKnownDateKey: '',
    updateStatus: {
        state: 'idle',
        message: 'جاهز للتحقق من التحديثات.',
        detail: 'آخر فحص: لم يتم بعد',
        lastCheckedAt: null,
        checking: false
    },
    updatedCacheCategories: [],
    sectionRuntime: createSectionRuntime(),
    runtimeHealth: null,
    runtimeHealthSubscriptions: null,
    runtimeDiagnostics: null,
    runtimeDiagnosticsSubscriptions: null,
    auth: authService,
    content: contentClient,
    sectionCache,
    sectionVersions,
    toastMeta: {
        success: { icon: 'fa-circle-check', label: 'نجاح' },
        error: { icon: 'fa-circle-exclamation', label: 'خطأ' },
        warning: { icon: 'fa-triangle-exclamation', label: 'تنبيه' },
        info: { icon: 'fa-circle-info', label: 'معلومة' }
    },

    init() {
        initializeApp(this);
    },

    registerShell() {
        registerAppShell(this);
    },

    startBackgroundServices() {
        startBackgroundServices(this);
    },

    initPwa() {
        pwa.init();
    },

    restoreRouteFromHash() {
        appRouter.restore(this);
    },

    runSectionLifecycle(id, meta = {}) {
        runSectionLifecycle(id, this, this.sectionRuntime, meta);
    },

    ensureAuthLoaded() {
        return authService.ensureAuthLoaded();
    },

    ensureFirebaseAuthLoaded() {
        return this.ensureAuthLoaded();
    },

    ensureFirebaseCoreLoaded() {
        return this.ensureAuthLoaded();
    },

    syncContentFoundation() {
        return Promise.resolve(contentClient.primePublicContentFoundation()).then((summary) => {
            this.contentFoundationStatus = summary || null;
            return summary;
        });
    },

    getElement,
    getHeaderTitle,
    getBackButton,
    getSectionElement,
    hideElement,
    showElement,
    safeInit,

    setupRuntimeHealth,
    updateRuntimeHealth,
    renderRuntimeHealth,
    recordStartupHealth,
    recordStorageHealth,
    recordContentFoundationHealth,
    setupRuntimeDiagnostics,
    updateRuntimeDiagnostics,
    renderRuntimeDiagnostics,
    copyRuntimeDiagnostics,
    buildRuntimeDiagnosticsReport,
    buildSupportBundle,
    downloadSupportBundle,

    bindGlobalEvents,
    bindUIEvents,

    getOrCreateToast,
    showToast,

    resetSubviews,
    setActiveTab,
    updateHeader,
    showSectionInternal,
    showHomeInternal,
    openSection,
    goHome,
    handleBackNavigation,
    handleBackButton,

    initTheme,
    setTheme,
    loadUserProfile,
    saveUserProfile,

    updateOnlineStatus,
    setupServiceWorkerUpdates,
    showUpdateBanner,
    hideUpdateBanner,
    showUpdateModal,
    closeUpdateModal,
    setupSmartUpdates,
    checkForUpdates,
    applyUpdate,
    setUpdateStatus,
    recordCacheUpdate,

    shareApp,
    shareText,
    copyToClipboard,

    getLocalDateKey,
    setupDayWatcher,
    checkForNewDay
};

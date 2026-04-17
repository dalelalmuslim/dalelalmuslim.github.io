import { appLogger } from '../../shared/logging/app-logger.js';
import { closeModal, openModal } from '../ui/modal-manager.js';
import { setElementHiddenState } from '../ui/visibility.js';
import {
    bindControllerRefresh,
    formatLocalTimestamp,
    inspectWaitingServiceWorker,
    requestManualUpdateCheck
} from './update-runtime-actions.js';

const UPDATE_BADGE_META = Object.freeze({
    idle: { label: 'جاهز', className: 'settings__status-badge--idle' },
    checking: { label: 'جاري الفحص', className: 'settings__status-badge--checking' },
    ready: { label: 'تحديث جديد', className: 'settings__status-badge--ready' },
    refreshed: { label: 'تم التحديث', className: 'settings__status-badge--refreshed' },
    offline: { label: 'بدون إنترنت', className: 'settings__status-badge--offline' },
    applying: { label: 'جاري التطبيق', className: 'settings__status-badge--applying' },
    error: { label: 'مشكلة', className: 'settings__status-badge--error' }
});

const CACHE_CATEGORY_LABELS = Object.freeze({
    documents: 'الصفحات',
    static: 'ملفات الواجهة',
    data: 'البيانات',
    runtime: 'الملفات المؤقتة',
    quran: 'القرآن',
    azkar: 'الأذكار'
});

function resolveUpdateBadgeMeta(state) {
    return UPDATE_BADGE_META[state] || UPDATE_BADGE_META.idle;
}

function setButtonBusy(button, busy, labels = {}) {
    if (!button) return;

    const idleLabel = labels.idle || button.dataset.idleLabel || button.textContent.trim();
    const busyLabel = labels.busy || button.dataset.busyLabel || 'جاري التنفيذ...';

    button.dataset.idleLabel = idleLabel;
    button.dataset.busyLabel = busyLabel;
    button.disabled = Boolean(busy);
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    button.textContent = busy ? busyLabel : idleLabel;
}

function updateUpdateBannerText(context, message) {
    const bannerText = context.getElement('updateBannerText');
    if (bannerText && typeof message === 'string' && message.trim()) {
        bannerText.textContent = message.trim();
    }
}

function renderUpdateChangesHint(context) {
    const hintElement = context.getElement('updateChangesHint');
    if (!hintElement) return;

    const categories = Array.isArray(context.updatedCacheCategories)
        ? context.updatedCacheCategories
        : [];

    if (!categories.length) {
        hintElement.textContent = '';
        setElementHiddenState(hintElement, true);
        return;
    }

    const labels = categories.map((category) => CACHE_CATEGORY_LABELS[category] || category);
    hintElement.textContent = `تم تحديث هذه الأجزاء في الخلفية: ${labels.join('، ')}`;
    setElementHiddenState(hintElement, false);
}

export function setUpdateStatus({
    state = 'idle',
    message,
    detail,
    lastCheckedAt,
    checking = false,
    bannerMessage,
    clearChanges = false,
    revealChanges = false
} = {}) {
    this.updateStatus = {
        ...(this.updateStatus || {}),
        state,
        message: message ?? this.updateStatus?.message ?? 'جاهز للتحقق من التحديثات.',
        detail: detail ?? this.updateStatus?.detail ?? 'آخر فحص: لم يتم بعد',
        lastCheckedAt: lastCheckedAt ?? this.updateStatus?.lastCheckedAt ?? null,
        checking: Boolean(checking)
    };

    if (clearChanges) {
        this.updatedCacheCategories = [];
    }

    const badgeMeta = resolveUpdateBadgeMeta(this.updateStatus.state);
    const statusText = this.getElement('updateStatusText');
    const statusMeta = this.getElement('updateStatusMeta');
    const statusBadge = this.getElement('updateStatusBadge');
    const checkButton = this.getElement('checkUpdatesBtn');
    const applyButton = this.getElement('applyUpdateBtn');

    if (statusText) {
        statusText.textContent = this.updateStatus.message;
    }

    if (statusMeta) {
        if (detail) {
            statusMeta.textContent = detail;
        } else if (this.updateStatus.lastCheckedAt) {
            statusMeta.textContent = `آخر فحص: ${formatLocalTimestamp(this.updateStatus.lastCheckedAt)}`;
        } else {
            statusMeta.textContent = 'آخر فحص: لم يتم بعد';
        }
    }

    if (statusBadge) {
        statusBadge.textContent = badgeMeta.label;
        statusBadge.className = `settings__status-badge ${badgeMeta.className}`;
    }

    setButtonBusy(checkButton, this.updateStatus.checking, {
        idle: 'البحث عن تحديثات',
        busy: 'جاري البحث...'
    });

    if (applyButton) {
        applyButton.disabled = this.updateStatus.state === 'applying';
        applyButton.setAttribute('aria-busy', this.updateStatus.state === 'applying' ? 'true' : 'false');
    }

    if (typeof bannerMessage === 'string') {
        updateUpdateBannerText(this, bannerMessage);
    }

    if (revealChanges || clearChanges) {
        renderUpdateChangesHint(this);
    }
}

export function recordCacheUpdate({ category } = {}) {
    const normalizedCategory = typeof category === 'string' && category.trim() ? category.trim() : 'data';
    const currentCategories = Array.isArray(this.updatedCacheCategories)
        ? this.updatedCacheCategories
        : [];

    if (!currentCategories.includes(normalizedCategory)) {
        this.updatedCacheCategories = [...currentCategories, normalizedCategory];
    }

    if (this.updateStatus?.state !== 'ready' && this.updateStatus?.state !== 'checking' && this.updateStatus?.state !== 'applying') {
        this.setUpdateStatus({
            state: navigator.onLine ? 'refreshed' : 'offline',
            message: navigator.onLine
                ? 'تم تحديث بعض ملفات التطبيق في الخلفية.'
                : 'التطبيق يعمل بدون إنترنت، وآخر نسخة مخزنة ما زالت متاحة.',
            detail: this.updateStatus?.lastCheckedAt
                ? `آخر فحص: ${formatLocalTimestamp(this.updateStatus.lastCheckedAt)}`
                : 'سيتم مزامنة بقية الملفات عند توفر الإنترنت.',
            revealChanges: true
        });
        return;
    }

    renderUpdateChangesHint(this);
}

export function showUpdateBanner(message = 'يوجد تحديث جديد للتطبيق') {
    updateUpdateBannerText(this, message);
    setElementHiddenState(this.getElement('updateAvailableBanner'), false, { useHiddenClass: false });
}

export function hideUpdateBanner() {
    setElementHiddenState(this.getElement('updateAvailableBanner'), true, { useHiddenClass: false });
}

export function setupServiceWorkerUpdates() {
    this.setUpdateStatus({
        state: navigator.onLine ? 'idle' : 'offline',
        message: navigator.onLine
            ? 'جاهز للتحقق من التحديثات.'
            : 'أنت بدون إنترنت الآن. سيتم الفحص عند عودة الاتصال.',
        detail: 'آخر فحص: لم يتم بعد'
    });

    inspectWaitingServiceWorker(this);
}

export function showUpdateModal(worker) {
    this.newWorker = worker || this.newWorker || null;
    openModal(this.getElement('updateModal'));
}

export function closeUpdateModal() {
    closeModal(this.getElement('updateModal'));
}

export function setupSmartUpdates() {
    bindControllerRefresh();
}

export function checkForUpdates() {
    if (!('serviceWorker' in navigator)) {
        this.showToast('عفواً، المتصفح لا يدعم التحديثات الذكية.', 'error');
        this.setUpdateStatus({
            state: 'error',
            message: 'هذا المتصفح لا يدعم Service Worker.',
            detail: 'جرّب متصفحًا أحدث أو افتح التطبيق من شاشة الهاتف.'
        });
        return;
    }

    const startedAt = new Date();
    this.showToast('جاري البحث عن تحديثات...', 'info');
    this.setUpdateStatus({
        state: 'checking',
        checking: true,
        message: 'جاري البحث عن تحديثات جديدة...',
        detail: `بدأ الفحص: ${formatLocalTimestamp(startedAt)}`
    });

    requestManualUpdateCheck(this, startedAt).catch((error) => {
        appLogger.error('[App] Update check error:', error);
        this.setUpdateStatus({
            state: navigator.onLine ? 'error' : 'offline',
            checking: false,
            lastCheckedAt: startedAt,
            message: navigator.onLine
                ? 'تعذر البحث عن التحديثات الآن.'
                : 'لا يمكن البحث عن تحديثات أثناء عدم الاتصال.',
            detail: navigator.onLine
                ? 'تأكد من الاتصال وحاول مرة أخرى.'
                : 'أعد المحاولة عندما يعود الإنترنت.'
        });
        this.showToast('تعذر الاتصال بالخادم، تأكد من الإنترنت.', 'error');
    });
}

export function applyUpdate() {
    if (this.newWorker) {
        this.setUpdateStatus({
            state: 'applying',
            message: 'جاري تطبيق التحديث...',
            detail: 'سيُعاد تحميل التطبيق تلقائيًا بعد ثوانٍ.',
            clearChanges: true
        });
        this.showToast('جاري التحديث...', 'info');
        this.newWorker.postMessage({ action: 'skipWaiting' });
        this.hideUpdateBanner();
        this.closeUpdateModal();
        return;
    }

    this.closeUpdateModal();
    this.setUpdateStatus({
        state: navigator.onLine ? 'idle' : 'offline',
        message: 'لا يوجد تحديث جاهز للتطبيق الآن.',
        detail: this.updateStatus?.lastCheckedAt
            ? `آخر فحص: ${formatLocalTimestamp(this.updateStatus.lastCheckedAt)}`
            : 'اضغط "البحث عن تحديثات" للتحقق يدويًا.'
    });
    this.showToast('لا يوجد تحديث جاهز للتطبيق الآن.', 'info');
}

export function updateOnlineStatus() {
    const offlineBanner = this.getElement('offlineBanner');
    if (offlineBanner) {
        offlineBanner.hidden = navigator.onLine;
    }

    if (!navigator.onLine) {
        this.setUpdateStatus({
            state: this.newWorker ? 'ready' : 'offline',
            message: this.newWorker
                ? 'يوجد تحديث جاهز، لكنك تعمل الآن بدون إنترنت.'
                : 'أنت الآن تعمل بدون إنترنت.',
            detail: this.updateStatus?.lastCheckedAt
                ? `آخر فحص: ${formatLocalTimestamp(this.updateStatus.lastCheckedAt)}`
                : 'سيتم التحقق من التحديثات عند عودة الاتصال.'
        });
        return;
    }

    if (this.newWorker) {
        this.setUpdateStatus({
            state: 'ready',
            message: 'يوجد تحديث جديد جاهز للتطبيق.',
            detail: this.updateStatus?.lastCheckedAt
                ? `آخر فحص: ${formatLocalTimestamp(this.updateStatus.lastCheckedAt)}`
                : 'اضغط "تحديث الآن" لتطبيقه.'
        });
        return;
    }

    this.setUpdateStatus({
        state: 'idle',
        message: this.updatedCacheCategories?.length
            ? 'التطبيق محدث محليًا وآخر البيانات وصلت إلى الجهاز.'
            : 'جاهز للتحقق من التحديثات.',
        detail: this.updateStatus?.lastCheckedAt
            ? `آخر فحص: ${formatLocalTimestamp(this.updateStatus.lastCheckedAt)}`
            : 'آخر فحص: لم يتم بعد',
        revealChanges: Boolean(this.updatedCacheCategories?.length)
    });
}

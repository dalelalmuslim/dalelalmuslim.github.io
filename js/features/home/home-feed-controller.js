// js/features/home/home-feed-controller.js
//
// Responsibility: populate Home section DOM with live data.
// Reads from domain selectors and stores. Writes to DOM via home-dom.js.
// Does NOT handle routing, events, or business logic.

import { appLogger } from '../../shared/logging/app-logger.js';
import { APP_CONFIG } from '../../app/app-config.js';
import { homeFeedStore } from '../../domains/home/home-feed-store.js';
import { setTextContent } from '../../shared/dom/dom-helpers.js';
import { setElementHiddenState } from '../../app/ui/visibility.js';
import { StatsSelectors } from '../../domains/stats/stats-selectors.js';
import { getResumePoint, getResumeSourceLabel } from '../../domains/quran/quran-reading-selectors.js';
import { getHomeAzkarResumeSummary } from '../../domains/azkar/azkar-selectors.js';
import {
    ensureMessagesDataLoaded,
    ensureDailyAyahsDataLoaded,
    getMessagesData,
    getDailyAyahsData,
} from '../../domains/home/home-feed-data.js';
import {
    resolveDailyAyahSelection,
    resolveDailyMessage,
} from '../../domains/home/home-feed-service.js';
import { cacheHomeDom, getHomeDomElement } from './home-dom.js';

// ── Data loading ──────────────────────────────────────────

export async function ensureHomeContentLoaded() {
    try {
        await ensureMessagesDataLoaded();
    } catch (err) {
        appLogger.error('[Home] ensureMessagesLoaded error:', err);
    }
}

async function ensureDailyAyahsLoaded() {
    try {
        await ensureDailyAyahsDataLoaded();
    } catch (err) {
        appLogger.error('[Home] ensureDailyAyahsLoaded error:', err);
    }
}

// ── Daily Ayah ────────────────────────────────────────────

export async function setDailyAyah() {
    const el = getHomeDomElement('dailyAyahText');
    if (!el) return;

    try {
        const ayahs = getDailyAyahsData();
        const safeAyahs = Array.isArray(ayahs) ? ayahs : [];

        if (!safeAyahs.length) {
            el.textContent = 'لا تتوفر آية اليوم حاليًا.';
            return;
        }

        const { today, storageState } = homeFeedStore.getDailyAyahSelectionContext();
        const { selectedAyah, shouldPersist, nextRecentIds } = resolveDailyAyahSelection({
            ayahs: safeAyahs,
            today,
            storageState,
            noRepeatDays: APP_CONFIG.DAILY_AYAH.NO_REPEAT_DAYS,
            now: new Date(),
        });

        if (shouldPersist && selectedAyah) {
            homeFeedStore.saveDailyAyahSelection({ selectedAyahId: selectedAyah.id, today, nextRecentIds });
        }

        delete el.dataset.loadError;
        el.textContent = selectedAyah?.text?.trim() || 'لا تتوفر آية اليوم حاليًا.';
    } catch (err) {
        appLogger.error('[Home] setDailyAyah error:', err);
        el.dataset.loadError = 'true';
        el.textContent = 'تعذّر تحميل الآية.';
    }
}

// ── Daily Message ─────────────────────────────────────────

export function setDailyMessage() {
    const el = getHomeDomElement('dailyMessageText');
    if (!el) return;
    el.textContent = resolveDailyMessage(getMessagesData(), Date.now());
}

// ── Smart Resume Card ─────────────────────────────────────
//
// Priority: Azkar (time-aware) > Quran (bookmark/lastRead).
// Shows one card only — whichever has the higher priority resume point.

export async function renderHomeSmartResume() {
    const card          = getHomeDomElement('homeSmartResumeCard');
    const eyebrowEl     = getHomeDomElement('homeResumeEyebrow');
    const titleEl       = getHomeDomElement('homeResumeTitle');
    const metaEl        = getHomeDomElement('homeResumeMeta');
    const buttonEl      = getHomeDomElement('homeResumeButton');
    const actionTextEl  = getHomeDomElement('homeResumeActionText');

    if (!card || !eyebrowEl || !titleEl || !metaEl || !buttonEl || !actionTextEl) return;

    // 1) Check Azkar (time-aware priority)
    const azkarSummary = await getHomeAzkarResumeSummary().catch(err => {
        appLogger.error('[Home] getHomeAzkarResumeSummary error:', err);
        return null;
    });

    if (azkarSummary?.slug) {
        eyebrowEl.textContent         = `الأذكار اليومية • ${azkarSummary.periodLabel || ''}`;
        titleEl.textContent           = azkarSummary.actionTitle || azkarSummary.title || 'تابع الورد';
        metaEl.textContent            = azkarSummary.helperText || '';
        actionTextEl.textContent      = azkarSummary.actionLabel || 'تابع الورد';
        buttonEl.dataset.navSection   = 'azkar';
        buttonEl.dataset.navTitle     = 'الأذكار اليومية';
        buttonEl.dataset.navAzkarResume = 'true';
        buttonEl.dataset.navAzkarResumeSlug = azkarSummary.slug;
        buttonEl.setAttribute('aria-label', azkarSummary.actionTitle || 'تابع الورد');
        delete buttonEl.dataset.navQuranResume;
        setElementHiddenState(card, false, { display: '' });
        return;
    }

    // 2) Fallback: Quran resume point
    const resumePoint = getResumePoint();
    if (resumePoint?.surahNum && resumePoint?.surahName) {
        eyebrowEl.textContent         = getResumeSourceLabel();
        titleEl.textContent           = resumePoint.surahName;
        metaEl.textContent            = '';
        actionTextEl.textContent      = 'استئناف القراءة';
        buttonEl.dataset.navSection   = 'quran';
        buttonEl.dataset.navTitle     = 'القرآن الكريم';
        buttonEl.dataset.navQuranResume = 'true';
        buttonEl.setAttribute('aria-label', `استئناف القراءة: ${resumePoint.surahName}`);
        delete buttonEl.dataset.navAzkarResume;
        delete buttonEl.dataset.navAzkarResumeSlug;
        setElementHiddenState(card, false, { display: '' });
        return;
    }

    // 3) Nothing to show
    setElementHiddenState(card, true);
    eyebrowEl.textContent    = '';
    titleEl.textContent      = '';
    metaEl.textContent       = '';
    actionTextEl.textContent = '';
    buttonEl.removeAttribute('aria-label');
}

// ── Progress Strip ────────────────────────────────────────

export function renderHomeProgressStrip() {
    const strip = getHomeDomElement('homeProgressStrip');
    if (!strip) return;

    const stats = StatsSelectors.getStatsSummary();
    setTextContent(getHomeDomElement('miniStreak'),   stats.streakCount);
    setTextContent(getHomeDomElement('miniTasbeeh'),  stats.dailyTasbeeh);
    setTextContent(getHomeDomElement('miniTasks'),    `${stats.completedTasks}/${stats.totalTasks}`);
    setTextContent(getHomeDomElement('miniProgress'), `${stats.completionRate}%`);
}

// ── Public API ────────────────────────────────────────────

export async function initHomeContent() {
    cacheHomeDom();

    // Load messages and ayahs in parallel — independent fetches.
    await Promise.allSettled([
        ensureHomeContentLoaded(),
        ensureDailyAyahsLoaded(),
    ]);

    setDailyMessage();
    await setDailyAyah();
    renderHomeProgressStrip();

    await renderHomeSmartResume().catch(err => {
        appLogger.error('[Home] renderHomeSmartResume failed during init:', err);
    });
}

export async function refreshDailyContent() {
    await Promise.allSettled([
        ensureHomeContentLoaded(),
        ensureDailyAyahsLoaded(),
    ]);

    setDailyMessage();
    await setDailyAyah();

    await renderHomeSmartResume().catch(err => {
        appLogger.error('[Home] renderHomeSmartResume failed during refresh:', err);
    });
}

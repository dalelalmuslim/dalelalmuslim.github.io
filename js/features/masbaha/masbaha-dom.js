// js/features/masbaha/masbaha-dom.js
//
// Responsibility: DOM reference caching for the Masbaha section.
// Single cache — no repeated getElementById on hot paths.

let cachedDom = null;
let domCached = false;

export function cacheMasbahaDom() {
    cachedDom = {
        // Zikr header
        currentEntryDisplay: document.getElementById('masbahaCurrentEntryDisplay'),
        nextHint:            document.getElementById('masbahaNextHint'),
        nextText:            document.getElementById('masbahaNextText'),

        // Tap surface
        tapBtn:       document.getElementById('mashabaTapBtn'),
        totalCounter: document.getElementById('totalCounter'),
        batchCounter: document.getElementById('batchCounter'),

        // Progress
        batchProgress: document.getElementById('mashabaBatchProgress'),
        dailyFill:     document.getElementById('mashabaDailyFill'),
        dailyLabel:    document.getElementById('mashabaDailyLabel'),

        // Controls
        streakCount:   document.getElementById('mashabaStreakCount'),
        silentToggle:  document.getElementById('mashabaSilentToggle'),
        silentIcon:    document.getElementById('silentIcon'),

        // Zikr sheet
        zikrSheet:     document.getElementById('masbahaZikrSheet'),
        zikrBackdrop:  document.getElementById('masbahaZikrBackdrop'),
        zikrList:      document.getElementById('masbahaZikrList'),
        targetInput:   document.getElementById('masbahaTargetInput'),
        newEntryInput: document.getElementById('newMasbahaEntryInput'),

        // Confirmation modals (kept as-is)
        deleteEntryModal: document.getElementById('masbahaDeleteEntryModal'),
        resetModal:       document.getElementById('resetMasbahaModal'),
    };

    domCached = true;
    return cachedDom;
}

/**
 * Get a cached DOM element. Caches lazily on first call.
 * Does NOT re-query if element was null at cache time.
 */
export function getMashabaDomEl(key) {
    if (!domCached) cacheMasbahaDom();
    return cachedDom?.[key] ?? null;
}

/**
 * Legacy fallback helper — used by session/custom actions.
 * Prefers cached reference; falls back to getElementById only if cache was
 * never populated (should not happen in normal flow).
 */
export function resolveMashabaElement(dom, key, fallbackId) {
    return dom?.[key] ?? (fallbackId ? document.getElementById(fallbackId) : null);
}

export function focusMashabaInput(dom, key, fallbackId, delay = 80) {
    const input = resolveMashabaElement(dom, key, fallbackId);
    if (!input) return;
    setTimeout(() => input.focus(), delay);
}

/** Re-enable tap button (called after reset). */
export function restoreMasbahaPrimaryButton() {
    const btn = document.querySelector('.masbaha-tap-surface');
    if (!btn) return;
    btn.disabled = false;
}

export function invalidateMashabaDomCache() {
    cachedDom = null;
    domCached = false;
}

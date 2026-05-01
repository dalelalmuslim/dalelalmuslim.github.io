// js/features/home/home-dom.js
//
// Responsibility: cache DOM references for the Home section only.
// Single cache per session — no repeated getElementById calls.
// Call invalidateHomeDomCache() if the section DOM is rebuilt.

let cachedHomeDom = null;
let domCached = false;

export function cacheHomeDom() {
    cachedHomeDom = {
        // Daily ayah
        dailyAyahText:        document.getElementById('dailyAyahText'),
        dailyAyahRef:         document.getElementById('dailyAyahRef'),
        // Daily message
        dailyMessageText:     document.getElementById('dailyMessageText'),
        // Progress strip
        miniStreak:           document.getElementById('miniStreak'),
        miniTasbeeh:          document.getElementById('miniTasbeeh'),
        miniTasks:            document.getElementById('miniTasks'),
        miniProgress:         document.getElementById('miniProgress'),
        homeProgressStrip:    document.getElementById('homeProgressStrip'),
        // Smart resume card (single unified card)
        homeSmartResumeCard:  document.getElementById('homeSmartResumeCard'),
        homeResumeIcon:       document.getElementById('homeResumeIcon'),
        homeResumeEyebrow:    document.getElementById('homeResumeEyebrow'),
        homeResumeTitle:      document.getElementById('homeResumeTitle'),
        homeResumeMeta:       document.getElementById('homeResumeMeta'),
        homeResumeButton:     document.getElementById('homeResumeButton'),
        homeResumeActionText: document.getElementById('homeResumeActionText'),
        // Section root (used for active-section check)
        homeSection:          document.getElementById('home'),
    };

    domCached = true;
    return cachedHomeDom;
}

/**
 * Get a cached DOM element by name.
 * Caches once on first call; subsequent misses return null without re-querying.
 */
export function getHomeDomElement(name) {
    if (!domCached) cacheHomeDom();
    return cachedHomeDom?.[name] ?? null;
}

/** Call this if the home section is ever fully rebuilt. */
export function invalidateHomeDomCache() {
    cachedHomeDom = null;
    domCached = false;
}

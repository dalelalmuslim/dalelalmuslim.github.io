// js/app/ui/bottom-nav.js
//
// Responsibility: manage bottom nav active state + more drawer open/close.
// Does NOT handle section navigation (that belongs to the global click handler).
// Does NOT know about feature internals.

import { appEventBus } from '../events/app-event-bus.js';

// Sections that have a dedicated tab in the bottom nav.
const NAV_SECTIONS = new Set(['home', 'azkar', 'masbaha', 'quran']);

// Reader-like subviews need immersive space and use the top Back action instead.
const NAV_HIDDEN_SUBVIEWS = new Set(['surahReader', 'storyCategoryContent']);
const NAV_HIDDEN_HASHES = new Set(['#surah-reader', '#stories-reader']);

const dom = {
    nav: null,
    moreBtn: null,
    drawer: null,
    backdrop: null,
};

let drawerOpen = false;
let subviewObserver = null;

// ── DOM Setup ──────────────────────────────────────────────

function cacheDom() {
    dom.nav      = document.getElementById('bottomNav');
    dom.moreBtn  = dom.nav?.querySelector('[data-bottom-nav-more]') ?? null;
    dom.drawer   = document.getElementById('moreDrawer');
    dom.backdrop = document.getElementById('moreDrawerBackdrop');
}

// ── Immersive Subview Detection ────────────────────────────

function isElementVisible(element) {
    return Boolean(element && !element.hidden && !element.classList.contains('is-hidden'));
}

function isImmersiveSubviewActive() {
    if (NAV_HIDDEN_HASHES.has(window.location.hash)) {
        return true;
    }

    return [...NAV_HIDDEN_SUBVIEWS].some(id => isElementVisible(document.getElementById(id)));
}

function syncNavImmersiveState() {
    setNavHiddenForSubview(isImmersiveSubviewActive());
}

function observeImmersiveSubviews() {
    subviewObserver?.disconnect();

    const targets = [...NAV_HIDDEN_SUBVIEWS]
        .map(id => document.getElementById(id))
        .filter(Boolean);

    if (!targets.length) return;
    if (typeof MutationObserver === 'undefined') {
        syncNavImmersiveState();
        return;
    }

    subviewObserver = new MutationObserver(() => syncNavImmersiveState());
    targets.forEach(target => {
        subviewObserver.observe(target, {
            attributes: true,
            attributeFilter: ['class', 'hidden', 'aria-hidden']
        });
    });

    syncNavImmersiveState();
}

// ── Visibility ─────────────────────────────────────────────

function setNavHiddenForSubview(isHidden) {
    if (!dom.nav) return;

    dom.nav.classList.toggle('is-hidden-for-subview', Boolean(isHidden));
    document.body.classList.toggle('has-hidden-bottom-nav', Boolean(isHidden));

    if (isHidden) {
        closeDrawer();
    }
}

// ── Active Tab ─────────────────────────────────────────────

function setActiveTab(sectionId) {
    if (!dom.nav) return;

    dom.nav.querySelectorAll('.bottom-nav__tab').forEach(tab => {
        tab.classList.remove('is-active');
        tab.removeAttribute('aria-current');
    });

    // If the section belongs to a named tab, highlight it.
    // Otherwise (duas, tasks, stats, names, stories, settings) → highlight "more".
    const isMoreSection = !NAV_SECTIONS.has(sectionId);
    const selector = isMoreSection
        ? '[data-bottom-nav-more]'
        : `.bottom-nav__tab[data-nav-section="${sectionId}"]`;

    const activeTab = dom.nav.querySelector(selector);
    if (activeTab) {
        activeTab.classList.add('is-active');
        activeTab.setAttribute('aria-current', 'page');
    }
}

// ── More Drawer ────────────────────────────────────────────

function openDrawer() {
    if (!dom.drawer || drawerOpen) return;
    drawerOpen = true;
    dom.drawer.classList.add('is-open');
    dom.drawer.setAttribute('aria-hidden', 'false');
    dom.moreBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    if (!dom.drawer || !drawerOpen) return;
    drawerOpen = false;
    dom.drawer.classList.remove('is-open');
    dom.drawer.setAttribute('aria-hidden', 'true');
    dom.moreBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

function bindDrawerEvents() {
    dom.moreBtn?.addEventListener('click', () => {
        drawerOpen ? closeDrawer() : openDrawer();
    });

    dom.backdrop?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && drawerOpen) closeDrawer();
    });
}

// ── Init ───────────────────────────────────────────────────

export function initBottomNav() {
    cacheDom();
    if (!dom.nav) return;

    bindDrawerEvents();
    observeImmersiveSubviews();

    // Close drawer and update active tab whenever a section changes.
    appEventBus.on('nav:section-changed', ({ sectionId } = {}) => {
        closeDrawer();
        if (sectionId) setActiveTab(sectionId);

        // Some subviews are rendered after the section transition. Re-sync on the next frame.
        requestAnimationFrame(() => {
            observeImmersiveSubviews();
            syncNavImmersiveState();
        });
    });

    appEventBus.on('ui:subview-changed', ({ subviewId } = {}) => {
        if (!NAV_HIDDEN_SUBVIEWS.has(subviewId)) return;
        syncNavImmersiveState();
    });

    window.addEventListener('popstate', () => requestAnimationFrame(syncNavImmersiveState));
    window.addEventListener('hashchange', () => requestAnimationFrame(syncNavImmersiveState));

    // Reflect the initial route (app always starts on home).
    setActiveTab('home');
    syncNavImmersiveState();
}

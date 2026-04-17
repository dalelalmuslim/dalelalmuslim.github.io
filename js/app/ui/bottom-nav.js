// js/app/ui/bottom-nav.js
//
// Responsibility: manage bottom nav active state + more drawer open/close.
// Does NOT handle section navigation (that belongs to the global click handler).
// Does NOT know about feature internals.

import { appEventBus } from '../events/app-event-bus.js';

// Sections that have a dedicated tab in the bottom nav.
const NAV_SECTIONS = new Set(['home', 'azkar', 'masbaha', 'quran']);

const dom = {
    nav: null,
    moreBtn: null,
    drawer: null,
    backdrop: null,
};

let drawerOpen = false;

// ── DOM Setup ──────────────────────────────────────────────

function cacheDom() {
    dom.nav     = document.getElementById('bottomNav');
    dom.moreBtn = dom.nav?.querySelector('[data-bottom-nav-more]') ?? null;
    dom.drawer  = document.getElementById('moreDrawer');
    dom.backdrop = document.getElementById('moreDrawerBackdrop');
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

    // Close drawer and update active tab whenever a section changes.
    appEventBus.on('nav:section-changed', ({ sectionId } = {}) => {
        closeDrawer();
        if (sectionId) setActiveTab(sectionId);
    });

    // Reflect the initial route (app always starts on home).
    setActiveTab('home');
}

import { APP_CONFIG } from '../../app/app-config.js';
import { scrollToTop } from '../../services/platform/browser-navigation.js';
import { getCurrentSection, setCurrentSection } from '../ui/ui-state.js';
import { getSectionTitle } from '../../router/section-registry.js';
import { appRouter } from '../../router/app-router.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { closeActiveSubview, resetSubviews as resetRegisteredSubviews } from '../ui/subview-manager.js';
import { hideUIElement, showUIElement } from '../ui/visibility.js';
import { appEventBus } from '../events/app-event-bus.js';

export function resetSubviews() {
    resetRegisteredSubviews();
}

export function setActiveTab(id) {
    document.querySelectorAll('.tab-content').forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
    });
    const target = this.getSectionElement(id);
    if (target) {
        target.classList.add('active');
        target.setAttribute('aria-hidden', 'false');
    }
}

export function updateHeader(title, showBackButton) {
    const headerTitle = this.getHeaderTitle();
    if (headerTitle) headerTitle.textContent = title || APP_CONFIG.APP_NAME_AR;

    const backBtn = this.getBackButton();
    if (!backBtn) return;
    if (showBackButton) {
        showUIElement(backBtn, { display: 'flex' });
        return;
    }

    hideUIElement(backBtn, { display: 'none' });
}

export function showSectionInternal(id, title) {
    setCurrentSection(id);
    this.setActiveTab(id);
    this.updateHeader(title || APP_CONFIG.APP_NAME_AR, true);
    scrollToTop();
    appEventBus.emit('nav:section-changed', { sectionId: id });
}

export function showHomeInternal() {
    setCurrentSection('home');
    this.setActiveTab('home');
    this.updateHeader(APP_CONFIG.APP_NAME_AR, false);
    this.resetSubviews();
    appEventBus.emit('nav:section-changed', { sectionId: 'home' });
}

export function openSection(id, title = getSectionTitle(id)) {
    appRouter.openSection(this, id, title);
}

export function goHome() {
    appRouter.goHome(this);
}

export function handleBackNavigation() {
    if (closeActiveSubview()) {
        const currentSectionId = getCurrentSection();
        if (currentSectionId && currentSectionId !== 'home') {
            replaceSectionRoute(currentSectionId, getSectionTitle(currentSectionId));
        }
        return true;
    }

    if (getCurrentSection() && getCurrentSection() !== 'home') {
        this.goHome();
        return true;
    }

    return false;
}

export function handleBackButton(event) {
    if (closeActiveSubview()) {
        return;
    }

    appRouter.handlePopState(this, event);
}

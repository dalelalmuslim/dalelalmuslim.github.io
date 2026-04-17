import {
    getCurrentHash,
    pushHashState,
    replaceHashState,
    replacePathState
} from '../services/platform/browser-navigation.js';
import { APP_CONFIG } from '../app/app-config.js';
import { getSectionTitle, isKnownSection } from './section-registry.js';

const SECTION_ALIASES = Object.freeze({
    wird: 'masbaha',
    settingsPage: 'settings'
});

const HOME_ROUTE = Object.freeze({
    sectionId: 'home',
    title: APP_CONFIG.APP_NAME_AR,
    isHome: true
});

function normalizeSectionId(sectionId) {
    const normalized = String(sectionId || '').replace(/^#/, '').trim();
    if (!normalized) return null;
    return SECTION_ALIASES[normalized] || normalized;
}

function createSectionRoute(sectionId, title = getSectionTitle(sectionId)) {
    const normalizedSectionId = normalizeSectionId(sectionId);
    if (!normalizedSectionId || !isKnownSection(normalizedSectionId)) {
        return null;
    }

    return Object.freeze({
        sectionId: normalizedSectionId,
        title: title || getSectionTitle(normalizedSectionId),
        isHome: false
    });
}

export function resolveHashRoute(hashValue = getCurrentHash()) {
    const sectionId = normalizeSectionId(hashValue);
    if (!sectionId || !isKnownSection(sectionId)) {
        return HOME_ROUTE;
    }

    return createSectionRoute(sectionId);
}

export function resolvePopStateRoute(state) {
    const sectionId = normalizeSectionId(state?.section);
    if (!sectionId) {
        return HOME_ROUTE;
    }

    return createSectionRoute(sectionId, state?.title) || HOME_ROUTE;
}

export function pushSectionRoute(sectionId, title = getSectionTitle(sectionId)) {
    const route = createSectionRoute(sectionId, title);
    if (!route) {
        return null;
    }

    pushHashState({ section: route.sectionId, title: route.title }, `#${route.sectionId}`);
    return route;
}

export function replaceSectionRoute(sectionId, title = getSectionTitle(sectionId)) {
    const route = createSectionRoute(sectionId, title);
    if (!route) {
        return null;
    }

    replaceHashState({ section: route.sectionId, title: route.title }, `#${route.sectionId}`);
    return route;
}

export function replaceHomeRoute() {
    replacePathState();
    return HOME_ROUTE;
}

export function getHomeRoute() {
    return HOME_ROUTE;
}

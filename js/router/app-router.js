import { getSectionTitle } from './section-registry.js';
import {
    getHomeRoute,
    pushSectionRoute,
    replaceHomeRoute,
    replaceSectionRoute,
    resolveHashRoute,
    resolvePopStateRoute
} from './route-state.js';
import { getCurrentSection } from '../app/ui/ui-state.js';

function applyRoute(appApi, route, meta = {}) {
    if (!route || route.isHome || route.sectionId === 'home') {
        appApi.showHomeInternal();
        appApi.runSectionLifecycle('home', {
            reason: meta.reason || 'navigation',
            previousSectionId: meta.previousSectionId
        });
        return getHomeRoute();
    }

    appApi.showSectionInternal(route.sectionId, route.title);
    appApi.runSectionLifecycle(route.sectionId, {
        reason: meta.reason || 'navigation',
        previousSectionId: meta.previousSectionId
    });
    return route;
}

export const appRouter = {
    resolveCurrentRoute() {
        return resolveHashRoute();
    },

    restore(appApi) {
        return applyRoute(appApi, this.resolveCurrentRoute(), { reason: 'restore' });
    },

    openSection(appApi, sectionId, title = getSectionTitle(sectionId)) {
        const currentSectionId = getCurrentSection();
        const currentSectionIsHome = !currentSectionId || currentSectionId === 'home';
        const route = (currentSectionIsHome
            ? pushSectionRoute(sectionId, title)
            : replaceSectionRoute(sectionId, title)) || getHomeRoute();

        return applyRoute(appApi, route, {
            reason: currentSectionIsHome ? 'push-state' : 'replace-state',
            previousSectionId: currentSectionId || 'home'
        });
    },

    goHome(appApi) {
        return applyRoute(appApi, replaceHomeRoute(), { reason: 'replace-state' });
    },

    handlePopState(appApi, event) {
        return applyRoute(appApi, resolvePopStateRoute(event?.state), { reason: 'popstate' });
    }
};

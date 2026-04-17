import { getFeatureCapabilities } from '../../features/index.js';
import { createClickActionMap, refreshGlobalAppEffects, resolveClickTarget } from './click-action-map.js';

let globalEventsBound = false;

export function bindGlobalEvents() {
    if (globalEventsBound) {
        return;
    }

    window.addEventListener('popstate', event => this.handleBackButton(event));

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshGlobalAppEffects(this);
        }
    });

    window.addEventListener('focus', () => {
        refreshGlobalAppEffects(this);
    });

    globalEventsBound = true;
}

export function bindUIEvents() {
    document.body.addEventListener('click', event => {
        const targets = resolveClickTarget(event);
        const firstMatch = Object.entries(targets).find(([, value]) => Boolean(value));
        if (!firstMatch) return;

        const [key, target] = firstMatch;
        createClickActionMap(this, event, target)[key]?.();
    });

    document.body.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        if (event.target.matches('[data-masbaha-entry-enter-save="true"]')) {
            event.preventDefault();
            getFeatureCapabilities('masbaha')?.saveCustomEntry?.();
            return;
        }

        if (event.target.matches('[data-tasks-enter-add="true"]')) {
            event.preventDefault();
            getFeatureCapabilities('tasks')?.addTask?.();
        }
    });

    document.body.addEventListener('change', event => {
        if (event.target.matches('#dailyTargetInput')) {
            this.saveUserProfile();
            return;
        }

        if (event.target.matches('[data-masbaha-action="update-target"]')) {
            getFeatureCapabilities('masbaha')?.updateTarget?.();
        }
    });
}

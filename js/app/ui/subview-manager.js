import { clearActiveSubview, getActiveSubview, setActiveSubview } from './ui-state.js';
import { appEventBus } from '../events/app-event-bus.js';
import { hideUIElement, resolveElement, showUIElement, swapUIVisibility } from './visibility.js';

const subviewCloseHandlers = new Map();

function emitSubviewVisibilityChange(id, isVisible) {
    appEventBus.emit('ui:subview-changed', {
        subviewId: id,
        isVisible: Boolean(isVisible)
    });
}

const SUBVIEW_DEFINITIONS = Object.freeze({
    surahReader: {
        id: 'surahReader',
        containerId: 'surahListContainer'
    },
    azkarListView: {
        id: 'azkarListView',
        containerId: 'azkarMainView'
    },
    duaCategoryContent: {
        id: 'duaCategoryContent',
        containerId: 'duasCatalogHome'
    },
    storyCategoryContent: {
        id: 'storyCategoryContent',
        containerId: 'storyCategoriesGrid'
    }
});

export function getSubviewDefinition(id) {
    return SUBVIEW_DEFINITIONS[id] || null;
}

export function registerSubviewCloseHandler(id, handler) {
    if (typeof handler !== 'function') return false;
    if (!getSubviewDefinition(id)) return false;
    subviewCloseHandlers.set(id, handler);
    return true;
}

export function isSubviewVisible(id) {
    const definition = getSubviewDefinition(id);
    const element = resolveElement(definition?.id || id);
    if (!element) return false;
    return !element.hidden && !element.classList.contains('is-hidden');
}

export function openSubview(id, options = {}) {
    const definition = getSubviewDefinition(id);
    if (!definition) return false;

    const subview = resolveElement(definition.id);
    const container = resolveElement(definition.containerId);
    if (!subview || !container) return false;

    swapUIVisibility({
        show: subview,
        hide: container,
        showDisplay: options.subviewDisplay ?? '',
        hideDisplay: options.containerDisplay ?? 'none'
    });
    setActiveSubview(definition.id);
    emitSubviewVisibilityChange(definition.id, true);
    return true;
}

export function closeSubview(id) {
    const definition = getSubviewDefinition(id);
    if (!definition) return false;

    const subview = resolveElement(definition.id);
    const container = resolveElement(definition.containerId);
    if (!subview || !container) return false;

    hideUIElement(subview, { display: 'none' });
    showUIElement(container, { display: '' });

    if (getActiveSubview() === definition.id) {
        clearActiveSubview();
    }

    subviewCloseHandlers.get(definition.id)?.();
    emitSubviewVisibilityChange(definition.id, false);
    return true;
}

export function closeActiveSubview() {
    const activeSubviewId = getActiveSubview();
    if (activeSubviewId) {
        return closeSubview(activeSubviewId);
    }

    for (const definition of Object.values(SUBVIEW_DEFINITIONS)) {
        if (isSubviewVisible(definition.id)) {
            return closeSubview(definition.id);
        }
    }

    return false;
}

export function resetSubviews() {
    Object.values(SUBVIEW_DEFINITIONS).forEach(definition => {
        closeSubview(definition.id);
    });
}

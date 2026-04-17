const DISPLAY_CLASS_MAP = Object.freeze({
    block: 'u-display-block',
    flex: 'u-display-flex',
    grid: 'u-display-grid',
    'inline-flex': 'u-display-inline-flex'
});

const DISPLAY_CLASSES = Object.freeze(Object.values(DISPLAY_CLASS_MAP));

export function resolveElement(elementOrId) {
    if (!elementOrId) return null;
    if (typeof elementOrId === 'string') {
        return document.getElementById(elementOrId);
    }
    return elementOrId;
}

function removeDisplayClasses(element) {
    element.classList.remove(...DISPLAY_CLASSES);
}

function removeHiddenVisibilityState(element) {
    element.hidden = false;
    element.classList.remove('is-hidden');
}

function applyDisplayClass(element, display = '') {
    removeDisplayClasses(element);
    const className = DISPLAY_CLASS_MAP[display];
    if (className) {
        element.classList.add(className);
    }
}

export function hideUIElement(elementOrId, { useHiddenClass = true } = {}) {
    const element = resolveElement(elementOrId);
    if (!element) return null;

    removeDisplayClasses(element);
    element.hidden = true;
    if (useHiddenClass) {
        element.classList.add('is-hidden');
    }
    element.setAttribute('aria-hidden', 'true');
    return element;
}

export function showUIElement(elementOrId, { removeHiddenClass = true, display = '' } = {}) {
    const element = resolveElement(elementOrId);
    if (!element) return null;

    if (removeHiddenClass) {
        removeHiddenVisibilityState(element);
    } else {
        element.hidden = false;
    }
    applyDisplayClass(element, display);
    element.setAttribute('aria-hidden', 'false');
    return element;
}

export function setElementHiddenState(elementOrId, hidden, options = {}) {
    return hidden
        ? hideUIElement(elementOrId, options)
        : showUIElement(elementOrId, options);
}

export function swapUIVisibility({ show, hide, showDisplay = '', hideDisplay = 'none' } = {}) {
    if (hide) {
        hideUIElement(hide, { useHiddenClass: hideDisplay === 'none' });
    }
    if (show) {
        showUIElement(show, { display: showDisplay });
    }
}

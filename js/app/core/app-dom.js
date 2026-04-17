import { hideUIElement, showUIElement } from '../ui/visibility.js';
import { appLogger } from '../../shared/logging/app-logger.js';

export function getElement(id) {
    return document.getElementById(id);
}

export function getHeaderTitle() {
    return getElement('headerTitle');
}

export function getBackButton() {
    return getElement('backBtn');
}

export function getSectionElement(id) {
    return getElement(id);
}

export function hideElement(element, useHiddenClass = false) {
    if (!element) return;
    hideUIElement(element, { useHiddenClass, display: 'none' });
}

export function showElement(element, displayValue = '', removeHiddenClass = false) {
    if (!element) return;
    showUIElement(element, { removeHiddenClass, display: displayValue });
}

export function safeInit(label, fn) {
    try {
        const result = fn?.();
        if (result && typeof result.then === 'function') {
            return result.catch(error => {
                appLogger.error(`[App] Bootstrap error in ${label}:`, error);
                return null;
            });
        }

        return result;
    } catch (error) {
        appLogger.error(`[App] Bootstrap error in ${label}:`, error);
        return null;
    }
}

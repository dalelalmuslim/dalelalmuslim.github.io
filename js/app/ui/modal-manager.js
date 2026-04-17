import { clearActiveModal, getActiveModal, setActiveModal } from './ui-state.js';
import { hideUIElement, resolveElement, showUIElement } from './visibility.js';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

let lastTriggerElement = null;
let activeTrapCleanup = null;

function getFocusableElements(modal) {
    return Array.from(modal.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
}

function createFocusTrap(modal) {
    const handleKeydown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal(modal);
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusable = getFocusableElements(modal);
        if (!focusable.length) {
            event.preventDefault();
            modal.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey) {
            if (activeElement === first || activeElement === modal) {
                event.preventDefault();
                last.focus();
            }
            return;
        }

        if (activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    modal.addEventListener('keydown', handleKeydown);
    return () => modal.removeEventListener('keydown', handleKeydown);
}

function focusFirstElement(modal) {
    const focusable = getFocusableElements(modal);
    const target = focusable[0] || modal;
    target.focus();
}

export function openModal(modalId, options = {}) {
    const modal = resolveElement(modalId);
    if (!modal?.id) return null;

    if (activeTrapCleanup) {
        activeTrapCleanup();
        activeTrapCleanup = null;
    }

    lastTriggerElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    showUIElement(modal, { display: options.display ?? 'flex' });
    modal.setAttribute('aria-modal', 'true');
    if (!modal.hasAttribute('tabindex')) {
        modal.setAttribute('tabindex', '-1');
    }
    setActiveModal(modal.id);

    activeTrapCleanup = createFocusTrap(modal);
    queueMicrotask(() => focusFirstElement(modal));
    return modal;
}

export function closeModal(modalId) {
    const modal = resolveElement(modalId);
    if (!modal?.id) return null;

    hideUIElement(modal, { display: 'none' });
    if (activeTrapCleanup) {
        activeTrapCleanup();
        activeTrapCleanup = null;
    }

    if (getActiveModal() === modal.id) {
        clearActiveModal();
    }

    if (lastTriggerElement instanceof HTMLElement && document.contains(lastTriggerElement)) {
        lastTriggerElement.focus();
    }

    return modal;
}

export function closeActiveModal() {
    const activeModalId = getActiveModal();
    if (!activeModalId) return null;
    return closeModal(activeModalId);
}

export function isModalOpen(modalId) {
    const modal = resolveElement(modalId);
    if (!modal) return false;
    return !modal.hidden && !modal.classList.contains('is-hidden');
}

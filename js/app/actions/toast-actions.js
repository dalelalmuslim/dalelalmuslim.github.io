import { createIconElement, createTextElement } from '../../shared/dom/dom-helpers.js';

export function getOrCreateToast() {
    let toast = this.getElement('appToast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast is-hidden';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'app-toast__icon';
    iconWrapper.setAttribute('aria-hidden', 'true');
    iconWrapper.append(createIconElement(['fa-solid', 'fa-circle-check']));

    const body = document.createElement('div');
    body.className = 'app-toast__body';
    body.append(
        createTextElement('div', 'نجاح', 'app-toast__label'),
        createTextElement('div', '', 'app-toast__message')
    );

    toast.append(iconWrapper, body);
    document.body.appendChild(toast);
    return toast;
}

export function showToast(message, type = 'success') {
    const toast = this.getOrCreateToast();
    const iconEl = toast.querySelector('.app-toast__icon i');
    const labelEl = toast.querySelector('.app-toast__label');
    const messageEl = toast.querySelector('.app-toast__message');
    const safeType = this.toastMeta[type] ? type : 'success';
    const meta = this.toastMeta[safeType];

    toast.classList.remove(
        'is-hidden',
        'app-toast--success',
        'app-toast--error',
        'app-toast--warning',
        'app-toast--info',
        'app-toast--visible'
    );
    toast.classList.add(`app-toast--${safeType}`);

    if (iconEl) iconEl.className = `fa-solid ${meta.icon}`;
    if (labelEl) labelEl.textContent = meta.label;
    if (messageEl) messageEl.textContent = message;

    clearTimeout(this.toastTimeout);
    clearTimeout(this.toastRemoveTimeout);

    requestAnimationFrame(() => toast.classList.add('app-toast--visible'));

    this.toastTimeout = setTimeout(() => {
        toast.classList.remove('app-toast--visible');
        this.toastRemoveTimeout = setTimeout(() => toast.classList.add('is-hidden'), 260);
    }, 2600);
}

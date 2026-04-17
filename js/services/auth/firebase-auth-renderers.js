import { clearElement, createIconElement, createTextElement } from '../../shared/dom/dom-helpers.js';

function bindButton(authArea, selector, handler) {
    const button = authArea.querySelector(selector);
    if (button) {
        button.addEventListener('click', handler);
    }
}

function createAuthButton({
    id = '',
    className = '',
    label = '',
    iconClasses = [],
    disabled = false,
    ariaDisabled = false
} = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    if (id) {
        button.id = id;
    }
    if (disabled) {
        button.disabled = true;
    }
    if (ariaDisabled) {
        button.setAttribute('aria-disabled', 'true');
    }
    button.append(
        createIconElement(iconClasses),
        document.createTextNode(` ${label}`)
    );
    return button;
}

export function renderAuthLoadingState(authArea) {
    if (!authArea) return;
    clearElement(authArea);
    authArea.append(createAuthButton({
        className: 'btn btn--ghost settings-auth-btn settings-auth-btn--loading',
        label: 'جاري تجهيز تسجيل الدخول...',
        iconClasses: ['fa-solid', 'fa-spinner', 'fa-spin'],
        disabled: true,
        ariaDisabled: true
    }));
}

export function renderAuthUnavailableState(authArea, { onRetry }) {
    if (!authArea) return;
    clearElement(authArea);

    const panel = document.createElement('div');
    panel.className = 'cardx cardx--soft settings-auth-panel';

    const status = document.createElement('div');
    status.className = 'muted settings-auth-status';
    status.append(
        createIconElement(['fa-solid', 'fa-triangle-exclamation']),
        createTextElement('span', 'تسجيل الدخول غير متاح الآن.')
    );

    panel.append(
        status,
        createAuthButton({
            id: 'btnLoginRetry',
            className: 'btn btn--ghost settings-auth-btn',
            label: 'إعادة المحاولة',
            iconClasses: ['fa-solid', 'fa-rotate-right']
        })
    );

    authArea.append(panel);
    bindButton(authArea, '#btnLoginRetry', onRetry);
}

export function renderSignedOutState(authArea, { onLogin }) {
    if (!authArea) return;
    clearElement(authArea);
    authArea.append(createAuthButton({
        id: 'btnLogin',
        className: 'btn btn--primary settings-auth-btn',
        label: 'تسجيل الدخول',
        iconClasses: ['fa-brands', 'fa-google']
    }));

    bindButton(authArea, '#btnLogin', onLogin);
}

export function renderSignedInState(authArea, { onLogout }) {
    if (!authArea) return;
    clearElement(authArea);
    authArea.append(createAuthButton({
        id: 'btnLogout',
        className: 'btn btn--ghost settings-auth-btn settings-auth-btn--danger',
        label: 'تسجيل الخروج',
        iconClasses: ['fa-solid', 'fa-right-from-bracket']
    }));

    bindButton(authArea, '#btnLogout', onLogout);
}

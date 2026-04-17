import { appLogger } from '../shared/logging/app-logger.js';
import { hideUIElement, showUIElement } from '../app/ui/visibility.js';
import { createIconElement, clearElement } from '../shared/dom/dom-helpers.js';

function createInstallButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--primary btn--full btn--start';
    button.append(
        createIconElement(['fa-solid', 'fa-download']),
        document.createTextNode(' تثبيت التطبيق')
    );
    return button;
}

export function bindInstallPromptUI() {
    const installContainer = document.getElementById('installAppContainer');
    if (!installContainer) return;

    let deferredPrompt = null;
    hideUIElement(installContainer);

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;

        showUIElement(installContainer, { display: 'block' });
        clearElement(installContainer);
        const button = createInstallButton();
        installContainer.append(button);

        button.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();
            await deferredPrompt.userChoice;

            deferredPrompt = null;
            hideUIElement(installContainer);
            clearElement(installContainer);
        }, { once: true });
    });

    window.addEventListener('appinstalled', () => {
        hideUIElement(installContainer);
        clearElement(installContainer);
        appLogger.info('[PWA] App installed successfully.');
    });
}

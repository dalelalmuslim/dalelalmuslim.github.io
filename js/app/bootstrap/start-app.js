import { app } from '../core/app-controller.js';
import { STARTUP_PHASES, runStartupPhases } from './startup-phases.js';

async function bootstrap() {
    const summary = await runStartupPhases(app, STARTUP_PHASES);
    app.recordStartupHealth?.(summary);
    if (!summary.ok) {
        app.showToast('تعذر إكمال تهيئة التطبيق بالكامل.', 'error');
    }
}

export function startApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
        return;
    }

    bootstrap();
}

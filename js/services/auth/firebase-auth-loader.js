import { appLogger } from '../../shared/logging/app-logger.js';
import { showToast } from '../../app/shell/app-shell.js';

let firebaseAuthLoader = null;

export function ensureFirebaseAuthLoaded() {
    if (!firebaseAuthLoader) {
        firebaseAuthLoader = import('../../services/auth/firebase-auth-ui.js')
            .then(async (module) => {
                const loaded = await (module.ensureFirebaseAuthUi?.() ?? true);
                if (!loaded) {
                    firebaseAuthLoader = null;
                }
                return loaded;
            })
            .catch(error => {
                appLogger.error('[App] Failed to lazy load firebase auth:', error);
                showToast('تعذر تحميل تسجيل الدخول الآن.', 'error');
                firebaseAuthLoader = null;
                return false;
            });
    }

    return firebaseAuthLoader;
}

export function resetFirebaseAuthLoader() {
    firebaseAuthLoader = null;
}

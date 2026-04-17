// @ts-nocheck
import { appLogger } from '../../shared/logging/app-logger.js';
import { showToast } from '../../app/shell/app-shell.js';
import { DEFAULT_AVATAR_URL } from './firebase-auth-config.js';
import {
    getCurrentAuthUser,
    initFirebaseAuth,
    resolvePendingAuthRedirect,
    resetFirebaseAuthState,
    shouldUseRedirectAuth,
    signInWithGoogle,
    signOutCurrentUser,
    subscribeToAuthState
} from './firebase-auth-service.js';
import {
    renderAuthLoadingState,
    renderAuthUnavailableState,
    renderSignedInState,
    renderSignedOutState
} from './firebase-auth-renderers.js';

let authUiInitialized = false;
let authUiUnsubscribe = null;
let redirectResolved = false;

function notify(message, type = 'success') {
    showToast(message, type);
}

async function retryFirebaseAuthUi(authArea) {
    renderAuthLoadingState(authArea);
    resetFirebaseAuthUiSubscription();
    resetFirebaseAuthState();
    const loaded = await ensureFirebaseAuthUi();
    if (loaded) {
        notify('تمت إعادة تهيئة تسجيل الدخول.', 'success');
    }
}

async function handleLoginClick() {
    notify(
        shouldUseRedirectAuth()
            ? 'جاري تحويلك إلى تسجيل الدخول الآمن... ⏳'
            : 'جاري فتح نافذة تسجيل الدخول... ⏳',
        'info'
    );

    try {
        const result = await signInWithGoogle();
        if (result?.redirect) {
            return;
        }
        notify('تم تسجيل الدخول بنجاح! ✅');
    } catch (error) {
        appLogger.error('[Firebase Auth] Login error:', error);
        notify('تعذر بدء تسجيل الدخول', 'error');
    }
}

async function handleLogoutClick() {
    try {
        await signOutCurrentUser();
        notify('تم تسجيل الخروج');
    } catch (error) {
        appLogger.error('[Firebase Auth] Logout error:', error);
        notify('تعذر تسجيل الخروج الآن', 'error');
    }
}

export function updateFirebaseAuthUi(user, options = {}) {
    const authArea = document.getElementById('authButtonArea');
    const userNameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('modalUserAvatar');

    if (!authArea) {
        return;
    }

    if (userNameEl) {
        userNameEl.textContent = user?.displayName || 'حسابي';
    }

    if (avatarEl) {
        avatarEl.src = user?.photoURL || DEFAULT_AVATAR_URL;
        avatarEl.onerror = () => {
            avatarEl.src = DEFAULT_AVATAR_URL;
        };
    }

    if (options.loading) {
        renderAuthLoadingState(authArea);
        return;
    }

    if (options.unavailable) {
        renderAuthUnavailableState(authArea, {
            onRetry: () => retryFirebaseAuthUi(authArea)
        });
        return;
    }

    if (user) {
        renderSignedInState(authArea, { onLogout: handleLogoutClick });
        return;
    }

    renderSignedOutState(authArea, { onLogin: handleLoginClick });
}

export async function ensureFirebaseAuthUi() {
    try {
        await initFirebaseAuth();
    } catch (error) {
        appLogger.error('[Firebase Auth] Initialization error:', error);
        updateFirebaseAuthUi(null, { unavailable: true });
        notify('تعذر تحميل خدمة تسجيل الدخول الآن.', 'error');
        return false;
    }

    if (!redirectResolved) {
        redirectResolved = true;
        try {
            const result = await resolvePendingAuthRedirect();
            if (result?.user) {
                notify('تم تسجيل الدخول بنجاح! ✅');
            }
        } catch (error) {
            appLogger.error('[Firebase Auth] Redirect result error:', error);
            notify('تعذر إكمال تسجيل الدخول، حاول مرة أخرى.', 'error');
        }
    }

    if (!authUiInitialized) {
        authUiInitialized = true;
        authUiUnsubscribe = subscribeToAuthState(user => {
            updateFirebaseAuthUi(user);
        });
    }

    updateFirebaseAuthUi(getCurrentAuthUser());
    return true;
}

export function resetFirebaseAuthUiSubscription() {
    if (typeof authUiUnsubscribe === 'function') {
        authUiUnsubscribe();
    }

    authUiInitialized = false;
    authUiUnsubscribe = null;
    redirectResolved = false;
}

// @ts-nocheck
import { ensureFirebaseAuthContext, setCurrentAuthUser } from './firebase-auth-runtime.js';

let redirectResolutionPromise = null;

function isStandaloneDisplayMode() {
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
}

export function shouldUseRedirectAuth() {
    return isStandaloneDisplayMode();
}

export async function resolvePendingAuthRedirect() {
    const { firebaseAuth, modules } = await ensureFirebaseAuthContext();

    if (!redirectResolutionPromise) {
        redirectResolutionPromise = modules.getRedirectResult(firebaseAuth)
            .then((result) => {
                setCurrentAuthUser(result?.user ?? firebaseAuth.currentUser ?? null);
                return result;
            })
            .catch((error) => {
                redirectResolutionPromise = null;
                throw error;
            });
    }

    return redirectResolutionPromise;
}

export async function signInWithGoogle() {
    const { firebaseAuth, googleProvider, modules } = await ensureFirebaseAuthContext();

    if (shouldUseRedirectAuth()) {
        await modules.signInWithRedirect(firebaseAuth, googleProvider);
        return { redirect: true };
    }

    const result = await modules.signInWithPopup(firebaseAuth, googleProvider);
    setCurrentAuthUser(result?.user ?? firebaseAuth.currentUser ?? null);
    return result;
}

export function resetFirebaseAuthRedirectState() {
    redirectResolutionPromise = null;
}

export {
    ensureFirebaseAuthContext,
    initFirebaseAuth,
    getCurrentAuthUser,
    setCurrentAuthUser,
    signOutCurrentUser,
    subscribeToAuthState,
    resetFirebaseAuthRuntimeState
} from './firebase-auth-runtime.js';
export {
    shouldUseRedirectAuth,
    resolvePendingAuthRedirect,
    signInWithGoogle,
    resetFirebaseAuthRedirectState
} from './firebase-auth-redirect.js';

import { resetFirebaseAuthRuntimeState } from './firebase-auth-runtime.js';
import { resetFirebaseAuthRedirectState } from './firebase-auth-redirect.js';

export function resetFirebaseAuthState() {
    resetFirebaseAuthRedirectState();
    resetFirebaseAuthRuntimeState();
}

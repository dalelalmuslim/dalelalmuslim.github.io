import { appLogger } from '../../shared/logging/app-logger.js';
import { FIREBASE_AUTH_CONFIG } from './firebase-auth-config.js';
import { loadFirebaseModules, resetFirebaseModulesLoader } from './firebase-sdk-loader.js';

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;
let currentAuthUser = null;

export async function ensureFirebaseAuthContext() {
    if (firebaseAuth && googleProvider) {
        return {
            firebaseAuth,
            googleProvider,
            modules: await loadFirebaseModules()
        };
    }

    const modules = await loadFirebaseModules();

    firebaseApp = firebaseApp || modules.initializeApp(FIREBASE_AUTH_CONFIG);
    firebaseAuth = firebaseAuth || modules.getAuth(firebaseApp);
    googleProvider = googleProvider || new modules.GoogleAuthProvider();
    currentAuthUser = firebaseAuth.currentUser ?? null;

    return {
        firebaseAuth,
        googleProvider,
        modules
    };
}

export async function initFirebaseAuth() {
    const { firebaseAuth } = await ensureFirebaseAuthContext();
    return firebaseAuth;
}

export function getCurrentAuthUser() {
    return currentAuthUser || firebaseAuth?.currentUser || null;
}

export function setCurrentAuthUser(user) {
    currentAuthUser = user ?? null;
}

export async function signOutCurrentUser() {
    const { firebaseAuth, modules } = await ensureFirebaseAuthContext();
    await modules.signOut(firebaseAuth);
    setCurrentAuthUser(null);
}

export function subscribeToAuthState(listener) {
    let unsubscribe = null;
    let active = true;

    ensureFirebaseAuthContext()
        .then(({ firebaseAuth, modules }) => {
            if (!active) {
                return;
            }

            unsubscribe = modules.onAuthStateChanged(firebaseAuth, (user) => {
                setCurrentAuthUser(user);
                listener(user ?? null);
            });
        })
        .catch((error) => {
            appLogger.error('[Firebase Auth] Failed to subscribe to auth state:', error);
            if (active) {
                listener(null);
            }
        });

    return () => {
        active = false;
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    };
}

export function resetFirebaseAuthRuntimeState() {
    firebaseApp = null;
    firebaseAuth = null;
    googleProvider = null;
    currentAuthUser = null;
    resetFirebaseModulesLoader();
}

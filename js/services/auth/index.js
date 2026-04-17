import { ensureFirebaseAuthLoaded, resetFirebaseAuthLoader } from './firebase-auth-loader.js';

export function ensureAuthLoaded() {
    return ensureFirebaseAuthLoaded();
}

export function resetAuthLoader() {
    resetFirebaseAuthLoader();
}

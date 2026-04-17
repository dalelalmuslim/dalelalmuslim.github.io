const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let firebaseModulesPromise = null;

export async function loadFirebaseModules() {
    if (!firebaseModulesPromise) {
        firebaseModulesPromise = Promise.all([
            import(FIREBASE_APP_URL),
            import(FIREBASE_AUTH_URL)
        ]).then(([appModule, authModule]) => ({
            initializeApp: appModule.initializeApp,
            getAuth: authModule.getAuth,
            signInWithPopup: authModule.signInWithPopup,
            signInWithRedirect: authModule.signInWithRedirect,
            getRedirectResult: authModule.getRedirectResult,
            GoogleAuthProvider: authModule.GoogleAuthProvider,
            onAuthStateChanged: authModule.onAuthStateChanged,
            signOut: authModule.signOut
        })).catch((error) => {
            firebaseModulesPromise = null;
            throw error;
        });
    }

    return firebaseModulesPromise;
}

export function resetFirebaseModulesLoader() {
    firebaseModulesPromise = null;
}

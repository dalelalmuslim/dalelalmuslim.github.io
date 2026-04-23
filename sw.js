/**
 * ====================================================================
 * Service Worker 2.0
 * ====================================================================
 * Workbox-like, policy-driven Service Worker for an HTML-first app.
 */

try {
    importScripts('./sw-manifest.js', './sw-strategies.js', './sw-routes.js');
} catch (error) {
    console.warn('[SW] Failed to load helper scripts, using fallback manifest.', error);
}

const RAW_MANIFEST = self.__SW_MANIFEST__ || {};

function normalizeManifest(manifest) {
    const precache = manifest.precache || {};
    const documents = Array.isArray(precache.documents)
        ? precache.documents
        : Array.isArray(manifest.documentUrls)
            ? manifest.documentUrls
            : [
                './',
                './index.html',
                './about.html',
                './contact.html',
                './privacy.html',
                './terms.html',
                './manifest.json',
                './robots.txt',
                './sitemap.xml'
            ];

    const shell = Array.isArray(precache.shell)
        ? precache.shell
        : Array.isArray(manifest.shellUrls)
            ? manifest.shellUrls
            : [
                './css/core/themes.css',
                './css/app.css',
                './css/core/layout.css',
                './css/shared/surfaces.css',
                './js/main.js',
                './js/pwa.js',
                './assets/icons/icon-192x192.png',
                './assets/icons/icon-512x512.png'
            ];

    const data = Array.isArray(precache.data)
        ? precache.data
        : Array.isArray(manifest.essentialDataUrls)
            ? manifest.essentialDataUrls
            : [
                './data/home/home-ayahs.json',
                './data/home/home-messages-data.js',
                './data/azkar/azkar-legacy-catalog.js',
                './data/azkar/categories/manifest.js',
                './data/azkar/categories/azkar-after-prayer.js',
                './data/azkar/categories/azkar-evening.js',
                './data/azkar/categories/azkar-morning.js',
                './data/stories/manifest.js'
            ];

    const warmData = Array.isArray(manifest.warmDataUrls) ? manifest.warmDataUrls : [];
    const routing = manifest.routing || {};

    return {
        cacheVersion: manifest.cacheVersion || 'azkar-v26-phase22-fallback',
        precache: {
            documents,
            shell,
            data
        },
        warmDataUrls: warmData,
        routing: {
            documentFallback: routing.documentFallback || './index.html'
        }
    };
}

const SW_MANIFEST = normalizeManifest(RAW_MANIFEST);
const CACHE_VERSION = SW_MANIFEST.cacheVersion;

const CACHE_NAMES = Object.freeze({
    documents: `${CACHE_VERSION}-documents`,
    static: `${CACHE_VERSION}-static`,
    data: `${CACHE_VERSION}-data`,
    runtime: `${CACHE_VERSION}-runtime`
});

const CACHE_LIMITS = Object.freeze({
    documents: 20,
    static: 180,
    data: 220,
    runtime: 80
});

const DOCUMENT_FALLBACK_URL = SW_MANIFEST.routing.documentFallback;
const PRECACHE_URLS = Object.freeze({
    documents: [...new Set(SW_MANIFEST.precache.documents)],
    static: [...new Set(SW_MANIFEST.precache.shell)],
    data: [...new Set(SW_MANIFEST.precache.data)]
});

const swConfig = Object.freeze({
    cacheNames: CACHE_NAMES,
    cacheLimits: CACHE_LIMITS,
    warmDataUrls: SW_MANIFEST.warmDataUrls,
    documentFallbackUrl: DOCUMENT_FALLBACK_URL,
    shellDestinations: new Set(['style', 'script', 'worker', 'image', 'font', 'audio', 'video']),
    dataPrefix: '/data/',
    quranSurahsPrefix: '/data/quran/surahs/',
    azkarCategoriesPrefix: '/data/azkar/categories/',
    firebaseHosts: new Set(['www.gstatic.com']),
    firebasePathPrefix: '/firebasejs/',
    publicContentApiPrefix: '/api/public/'
});

const ROUTE_POLICIES = swCreateRoutePolicies(swConfig);

self.addEventListener('install', (event) => {
    event.waitUntil(Promise.all([
        swPrecacheGroup(CACHE_NAMES.documents, PRECACHE_URLS.documents, {
            plugins: [swOkResponsePlugin()]
        }),
        swPrecacheGroup(CACHE_NAMES.static, PRECACHE_URLS.static, {
            plugins: [swOkResponsePlugin()]
        }),
        swPrecacheGroup(CACHE_NAMES.data, PRECACHE_URLS.data, {
            plugins: [swOkResponsePlugin()]
        })
    ]));
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        await swCleanupOldCaches(CACHE_NAMES);

        if ('navigationPreload' in self.registration) {
            await self.registration.navigationPreload.enable();
        }

        await self.clients.claim();
        await swWarmRuntimeData(swConfig);

        await swNotifyClients({
            type: 'SW_ACTIVATED',
            cacheVersion: CACHE_VERSION
        });
    })());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(swHandleRequest(event, {
        ...swConfig,
        routePolicies: ROUTE_POLICIES
    }));
});

self.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data.action === 'warmData') {
        event.waitUntil(swWarmRuntimeData(swConfig));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || './index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }

            return undefined;
        })
    );
});

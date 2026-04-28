function swIsDocumentRequest(request) {
    return request.mode === 'navigate' || request.destination === 'document';
}

function swIsSameOriginGetRequest(request) {
    return request.method === 'GET' && request.url.startsWith(self.location.origin);
}

function swIsStaticAssetRequest(request, url, shellDestinations) {
    return shellDestinations.has(request.destination)
        || url.pathname.endsWith('/sw.js')
        || url.pathname.endsWith('/sw-manifest.js')
        || url.pathname.endsWith('/sw-strategies.js')
        || url.pathname.endsWith('/sw-routes.js')
        || url.pathname.endsWith('/manifest.json');
}

function swIsDataRequest(url, dataPrefix) {
    return url.pathname.includes(dataPrefix);
}

function swIsAdminRequest(url) {
    return url.pathname === '/admin.html'
        || url.pathname.startsWith('/admin/')
        || url.pathname.startsWith('/api/admin/');
}

function swIsPublicContentApiRequest(url, publicApiPrefix) {
    return url.pathname.startsWith(publicApiPrefix);
}

function swIsFirebaseSdkRequest(url, firebaseHosts, firebasePathPrefix) {
    return firebaseHosts.has(url.hostname) && url.pathname.includes(firebasePathPrefix);
}

function swCreateRoutePolicies(config) {
    return [
        {
            name: 'documents',
            match: ({ request }) => swIsDocumentRequest(request),
            handler: swCreateNetworkFirstStrategy({
                cacheName: config.cacheNames.documents,
                maxEntries: config.cacheLimits.documents,
                plugins: [swOkResponsePlugin()],
                ignoreSearch: true,
                fallbackUrl: config.documentFallbackUrl,
                useNavigationPreload: true
            })
        },
        {
            name: 'quran-surahs',
            match: ({ url }) => url.pathname.includes(config.quranSurahsPrefix),
            handler: swCreateCacheFirstStrategy({
                cacheName: config.cacheNames.data,
                maxEntries: config.cacheLimits.data,
                plugins: [swOkResponsePlugin(), swBroadcastUpdatePlugin('quran-surahs')],
                revalidate: true
            })
        },
        {
            name: 'azkar-categories',
            match: ({ url }) => url.pathname.includes(config.azkarCategoriesPrefix),
            handler: swCreateCacheFirstStrategy({
                cacheName: config.cacheNames.data,
                maxEntries: config.cacheLimits.data,
                plugins: [swOkResponsePlugin(), swBroadcastUpdatePlugin('azkar-categories')],
                revalidate: true
            })
        },
        {
            name: 'data-assets',
            match: ({ url }) => swIsDataRequest(url, config.dataPrefix),
            handler: swCreateStaleWhileRevalidateStrategy({
                cacheName: config.cacheNames.data,
                maxEntries: config.cacheLimits.data,
                plugins: [swOkResponsePlugin(), swBroadcastUpdatePlugin('data')]
            })
        },
        {
            name: 'public-content-api',
            match: ({ url }) => swIsPublicContentApiRequest(url, config.publicContentApiPrefix),
            handler: swCreateNetworkFirstStrategy({
                cacheName: config.cacheNames.runtime,
                maxEntries: config.cacheLimits.runtime,
                plugins: [swOkResponsePlugin(), swBroadcastUpdatePlugin('public-content-api')]
            })
        },
        {
            name: 'static-assets',
            match: ({ request, url }) => swIsStaticAssetRequest(request, url, config.shellDestinations),
            handler: swCreateStaleWhileRevalidateStrategy({
                cacheName: config.cacheNames.static,
                maxEntries: config.cacheLimits.static,
                plugins: [swOkResponsePlugin(), swBroadcastUpdatePlugin('static')]
            })
        },
        {
            name: 'firebase-sdk',
            match: ({ request, url }) => request.method === 'GET' && swIsFirebaseSdkRequest(url, config.firebaseHosts, config.firebasePathPrefix),
            handler: swCreateCacheFirstStrategy({
                cacheName: config.cacheNames.static,
                maxEntries: config.cacheLimits.static,
                plugins: [swOkResponsePlugin(), swBroadcastUpdatePlugin('firebase-sdk')],
                revalidate: true
            })
        },
        {
            name: 'runtime-fallbacks',
            match: () => true,
            handler: swCreateCacheFirstStrategy({
                cacheName: config.cacheNames.runtime,
                maxEntries: config.cacheLimits.runtime,
                plugins: [swOkResponsePlugin()]
            })
        }
    ];
}

async function swWarmRuntimeData(config) {
    if (!config.warmDataUrls.length) return;

    await Promise.allSettled(
        config.warmDataUrls.map(async (url) => {
            const request = new Request(url);
            const cached = await swMatchFromCache(config.cacheNames.data, request);
            if (cached) return;
            const response = await fetch(request, { cache: 'no-store' });
            await swPutInCache(config.cacheNames.data, request, response, {
                maxEntries: config.cacheLimits.data,
                plugins: [swOkResponsePlugin()]
            });
        })
    );
}

async function swCleanupOldCaches(activeCacheNames) {
    const activeNames = new Set(Object.values(activeCacheNames));
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter((cacheName) => !activeNames.has(cacheName))
            .map((cacheName) => caches.delete(cacheName))
    );
}

async function swHandleRequest(event, config) {
    const request = event.request;
    const url = new URL(request.url);
    const isFirebaseRequest = swIsFirebaseSdkRequest(url, config.firebaseHosts, config.firebasePathPrefix);

    if (request.method !== 'GET') {
        return fetch(request);
    }

    if (swIsAdminRequest(url)) {
        return fetch(request, { cache: 'no-store' });
    }

    if (!swIsSameOriginGetRequest(request) && !isFirebaseRequest) {
        return fetch(request);
    }

    const policy = config.routePolicies.find((entry) => entry.match({ request, url, event }));

    if (!policy) {
        return fetch(request);
    }

    return policy.handler({ request, url, event, policyName: policy.name });
}

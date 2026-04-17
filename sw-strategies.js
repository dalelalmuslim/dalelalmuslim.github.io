function swBuildCacheKey(request, options = {}) {
    const url = new URL(request.url);
    if (options.ignoreSearch) {
        url.search = '';
    }
    url.hash = '';
    return url.toString();
}

function swIsCacheableResponse(response) {
    return !!response && response.status === 200 && (response.type === 'basic' || response.type === 'cors');
}

async function swNotifyClients(message) {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clientList.map((client) => client.postMessage(message)));
}

function swOkResponsePlugin() {
    return {
        async cacheWillUpdate({ response }) {
            return swIsCacheableResponse(response) ? response : null;
        }
    };
}

function swBroadcastUpdatePlugin(category) {
    return {
        async cacheDidUpdate({ request, oldResponse, newResponse, cacheName }) {
            if (!oldResponse || !newResponse || oldResponse.status !== newResponse.status) {
                return;
            }

            await swNotifyClients({
                type: 'CACHE_UPDATED',
                category,
                cacheName,
                url: request.url
            });
        }
    };
}

async function swRunPluginHook(plugins, hookName, context, initialValue) {
    let value = initialValue;
    for (const plugin of plugins) {
        if (typeof plugin?.[hookName] !== 'function') continue;
        const result = await plugin[hookName]({ ...context, value, response: value, request: context.request });
        if (typeof result !== 'undefined') {
            value = result;
        }
    }
    return value;
}

async function swOpenCache(cacheName) {
    return caches.open(cacheName);
}

async function swMatchFromCache(cacheName, request, options = {}) {
    const cache = await swOpenCache(cacheName);
    return cache.match(swBuildCacheKey(request, options));
}

async function swPutInCache(cacheName, request, response, options = {}) {
    const plugins = options.plugins || [];
    const cacheableResponse = await swRunPluginHook(plugins, 'cacheWillUpdate', {
        cacheName,
        request
    }, response);

    if (!cacheableResponse) {
        return null;
    }

    const cache = await swOpenCache(cacheName);
    const cacheKey = swBuildCacheKey(request, options);
    const oldResponse = await cache.match(cacheKey);
    await cache.put(cacheKey, cacheableResponse.clone());

    if (options.maxEntries) {
        const keys = await cache.keys();
        const overflow = keys.length - options.maxEntries;
        if (overflow > 0) {
            await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
        }
    }

    await swRunPluginHook(plugins, 'cacheDidUpdate', {
        cacheName,
        request,
        oldResponse
    }, cacheableResponse);

    return cacheableResponse;
}

async function swPrecacheGroup(cacheName, urls, options = {}) {
    const cache = await swOpenCache(cacheName);
    const results = await Promise.allSettled(
        urls.map(async (url) => {
            const response = await fetch(url, { cache: 'no-store' });
            const cacheableResponse = await swRunPluginHook(options.plugins || [], 'cacheWillUpdate', {
                cacheName,
                request: new Request(url)
            }, response);

            if (!cacheableResponse) {
                throw new Error(`Uncacheable response for ${url}`);
            }

            await cache.put(url, cacheableResponse.clone());
        })
    );

    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
        console.warn(`[SW] Precache failures in ${cacheName}:`, failures.length);
    }
}

function swCreateCacheFirstStrategy(config) {
    const options = {
        cacheName: config.cacheName,
        maxEntries: config.maxEntries ?? null,
        plugins: config.plugins || [swOkResponsePlugin()],
        ignoreSearch: config.ignoreSearch === true,
        revalidate: config.revalidate === true
    };

    return async function handle({ request, event }) {
        const cached = await swMatchFromCache(options.cacheName, request, { ignoreSearch: options.ignoreSearch });

        if (cached) {
            if (options.revalidate) {
                const refreshPromise = fetch(request)
                    .then((response) => swPutInCache(options.cacheName, request, response, options))
                    .catch(() => null);
                if (event && refreshPromise) {
                    event.waitUntil(refreshPromise);
                }
            }
            return cached;
        }

        const response = await fetch(request);
        await swPutInCache(options.cacheName, request, response, options);
        return response;
    };
}

function swCreateStaleWhileRevalidateStrategy(config) {
    const options = {
        cacheName: config.cacheName,
        maxEntries: config.maxEntries ?? null,
        plugins: config.plugins || [swOkResponsePlugin()],
        ignoreSearch: config.ignoreSearch === true,
        fallbackResponse: config.fallbackResponse || null
    };

    return async function handle({ request, event }) {
        const cached = await swMatchFromCache(options.cacheName, request, { ignoreSearch: options.ignoreSearch });

        const networkPromise = fetch(request)
            .then((response) => swPutInCache(options.cacheName, request, response, options).then(() => response))
            .catch(() => null);

        if (event && networkPromise) {
            event.waitUntil(networkPromise);
        }

        if (cached) {
            return cached;
        }

        const networkResponse = await networkPromise;
        if (networkResponse) {
            return networkResponse;
        }

        return options.fallbackResponse || new Response('', {
            status: 504,
            statusText: 'Gateway Timeout'
        });
    };
}

function swCreateNetworkFirstStrategy(config) {
    const options = {
        cacheName: config.cacheName,
        maxEntries: config.maxEntries ?? null,
        plugins: config.plugins || [swOkResponsePlugin()],
        ignoreSearch: config.ignoreSearch === true,
        fallbackUrl: config.fallbackUrl || null,
        useNavigationPreload: config.useNavigationPreload === true
    };

    return async function handle({ request, event }) {
        try {
            if (options.useNavigationPreload && event?.preloadResponse) {
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) {
                    await swPutInCache(options.cacheName, request, preloadResponse, options);
                    return preloadResponse;
                }
            }

            const response = await fetch(request);
            await swPutInCache(options.cacheName, request, response, options);
            return response;
        } catch (error) {
            const cached = await swMatchFromCache(options.cacheName, request, { ignoreSearch: options.ignoreSearch });
            if (cached) {
                return cached;
            }

            if (options.fallbackUrl) {
                const fallback = await swMatchFromCache(options.cacheName, new Request(options.fallbackUrl), {
                    ignoreSearch: true
                });
                if (fallback) {
                    return fallback;
                }
            }

            return new Response('', {
                status: 504,
                statusText: 'Gateway Timeout'
            });
        }
    };
}

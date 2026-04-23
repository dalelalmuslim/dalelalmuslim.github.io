function buildCorsHeaders(headers = {}) {
    return {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, HEAD, OPTIONS',
        'access-control-allow-headers': 'content-type, if-none-match',
        'x-content-type-options': 'nosniff',
        ...headers
    };
}

function buildJsonBody(data) {
    return data === null ? null : JSON.stringify(data);
}

export function getRequestId(request) {
    const cfRay = request?.headers?.get('cf-ray');
    if (typeof cfRay === 'string' && cfRay.trim()) {
        return cfRay.trim();
    }

    return typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `req-${Date.now()}`;
}

export function createRequestMeta(request, meta = {}) {
    const requestUrl = new URL(request.url);
    return {
        requestId: getRequestId(request),
        path: requestUrl.pathname,
        generatedAt: new Date().toISOString(),
        ...meta
    };
}

export function json(data, init = {}) {
    const status = Number(init.status) || 200;
    const headers = buildCorsHeaders(init.headers || {});
    const body = init.includeBody === false ? null : buildJsonBody(data);

    return new Response(body, {
        status,
        headers
    });
}

export function success(request, data, init = {}) {
    return json({
        ok: true,
        data,
        meta: createRequestMeta(request, init.meta || {})
    }, init);
}

export function failure(request, error, init = {}) {
    return json({
        ok: false,
        error,
        meta: createRequestMeta(request, init.meta || {})
    }, {
        ...init,
        status: Number(init.status) || 500
    });
}

export function options() {
    return new Response(null, {
        status: 204,
        headers: buildCorsHeaders({
            'cache-control': 'no-store'
        })
    });
}

export function isReadMethod(method) {
    return method === 'GET' || method === 'HEAD';
}

export function methodNotAllowed(request, allowed = ['GET', 'HEAD', 'OPTIONS']) {
    return failure(request, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only supported HTTP methods are allowed for this endpoint.',
        allowed
    }, {
        status: 405,
        headers: {
            allow: allowed.join(', '),
            'cache-control': 'no-store'
        }
    });
}

export function notFound(request, message = 'The requested resource was not found.') {
    return failure(request, {
        code: 'NOT_FOUND',
        message
    }, {
        status: 404,
        headers: {
            'cache-control': 'no-store'
        }
    });
}

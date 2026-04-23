import { isReadMethod, json, methodNotAllowed, options } from '../_shared/http.js';

export async function onRequest(context) {
    const { request } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    if (!isReadMethod(request.method)) {
        return methodNotAllowed(request);
    }

    return json({
        ok: true,
        service: 'dalil-almuslim-pages-functions',
        timestamp: new Date().toISOString()
    }, {
        headers: {
            'cache-control': 'no-store'
        },
        includeBody: request.method !== 'HEAD'
    });
}

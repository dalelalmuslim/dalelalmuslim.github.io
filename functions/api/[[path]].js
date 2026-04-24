import { notFound, options } from '../_shared/http.js';

export function onRequest(context) {
    const { request } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    return notFound(request, 'API endpoint was not found.');
}

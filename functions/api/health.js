import { json, methodNotAllowed } from '../_shared/http.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return methodNotAllowed(['GET']);
  }

  return json({
    ok: true,
    service: 'dalil-almuslim-pages-functions',
    timestamp: new Date().toISOString()
  });
}

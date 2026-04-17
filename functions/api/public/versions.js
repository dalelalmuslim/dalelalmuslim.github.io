import { json, methodNotAllowed } from '../../_shared/http.js';
import { PUBLIC_CONTENT_SECTIONS, PUBLIC_CONTENT_VERSIONS } from '../../_shared/public-versions.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return methodNotAllowed(['GET']);
  }

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    versions: PUBLIC_CONTENT_VERSIONS,
    sections: PUBLIC_CONTENT_SECTIONS
  });
}

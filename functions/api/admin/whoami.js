import { authenticateAdminRequest } from '../../_shared/admin-auth.js';
import { failure, methodNotAllowed, options, success } from '../../_shared/http.js';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return options();
    }

    if (request.method !== 'GET') {
        return methodNotAllowed(request, ['GET', 'OPTIONS']);
    }

    const authResult = await authenticateAdminRequest(request, env);
    if (!authResult.ok) {
        return failure(request, authResult.error, {
            status: authResult.status,
            headers: { 'cache-control': 'no-store' }
        });
    }

    return success(request, {
        authenticated: true,
        admin: {
            uid: authResult.admin.uid,
            email: authResult.admin.email,
            emailVerified: authResult.admin.emailVerified,
            provider: authResult.admin.provider
        }
    }, {
        headers: { 'cache-control': 'no-store' },
        meta: { endpoint: '/api/admin/whoami' }
    });
}

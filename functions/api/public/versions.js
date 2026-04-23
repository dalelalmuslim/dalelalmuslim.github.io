import { handlePublicVersionsRequest } from '../../_shared/public-content.js';

export async function onRequest(context) {
    return handlePublicVersionsRequest(context);
}

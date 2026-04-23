import { handlePublicSectionRequest } from '../../../_shared/public-content.js';

export async function onRequest(context) {
    return handlePublicSectionRequest('app_config', context);
}

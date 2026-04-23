import {
    getPublicContentVersionSnapshot,
    listPublicContentSections
} from '../../js/shared/contracts/public-content-manifest.js';

export const PUBLIC_CONTENT_VERSIONS = Object.freeze(getPublicContentVersionSnapshot());
export const PUBLIC_CONTENT_SECTIONS = Object.freeze(listPublicContentSections());

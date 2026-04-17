import { APP_CONFIG } from '../app/app-config.js';
import { FEATURE_SECTIONS } from '../features/feature-sections.js';

const SECTION_DEFINITIONS = Object.freeze(
    Object.fromEntries(
        FEATURE_SECTIONS.map((section) => [section.id, section])
    )
);

export function getSectionDefinition(sectionId) {
    return SECTION_DEFINITIONS[sectionId] || null;
}

export function getSectionTitle(sectionId) {
    return SECTION_DEFINITIONS[sectionId]?.title || APP_CONFIG.APP_NAME_AR;
}

export function isKnownSection(sectionId) {
    return Boolean(getSectionDefinition(sectionId));
}

export function listSectionIds() {
    return Object.keys(SECTION_DEFINITIONS);
}

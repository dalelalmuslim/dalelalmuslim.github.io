import { APP_CONFIG } from '../../app/app-config.js';
import { getJSONStorageItem, setJSONStorageItem } from '../platform/browser-storage.js';
import { getContentSectionDefinition, listContentSections } from '../../shared/contracts/content-sections.js';

function readVersionState() {
    const snapshot = getJSONStorageItem(APP_CONFIG.CONTENT_VERSION_NAMESPACE, null);
    return snapshot && typeof snapshot === 'object' ? snapshot : {};
}

function writeVersionState(state) {
    return setJSONStorageItem(APP_CONFIG.CONTENT_VERSION_NAMESPACE, state);
}

export function getStoredSectionVersions() {
    const state = readVersionState();
    const versions = {};

    listContentSections().forEach((section) => {
        versions[section.versionKey] = typeof state[section.versionKey] === 'string'
            ? state[section.versionKey]
            : APP_CONFIG.CONTENT_DEFAULT_VERSIONS[section.id];
    });

    return versions;
}

export function getStoredSectionVersion(sectionId) {
    const section = getContentSectionDefinition(sectionId);
    if (!section) return '';

    const state = readVersionState();
    return typeof state[section.versionKey] === 'string'
        ? state[section.versionKey]
        : APP_CONFIG.CONTENT_DEFAULT_VERSIONS[section.id];
}

export function setStoredSectionVersion(sectionId, version) {
    const section = getContentSectionDefinition(sectionId);
    if (!section) return false;

    const state = readVersionState();
    state[section.versionKey] = String(version || APP_CONFIG.CONTENT_DEFAULT_VERSIONS[section.id]);
    return writeVersionState(state);
}

export function hasSectionVersionChanged(sectionId, incomingVersion) {
    const currentVersion = getStoredSectionVersion(sectionId);
    return String(currentVersion || '') !== String(incomingVersion || '');
}

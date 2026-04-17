
import { homeFeature } from './home/index.js';
import { masbahaFeature } from './masbaha/index.js';
import { azkarFeature } from './azkar/index.js';
import { duasFeature } from './duas/index.js';
import { quranFeature } from './quran/index.js';
import { tasksFeature } from './tasks/index.js';
import { statsFeature } from './stats/index.js';
import { namesFeature } from './names/index.js';
import { storiesFeature } from './stories/index.js';
import { settingsFeature } from './settings/index.js';

function validateFeatureApis(features) {
    const ids = new Set();

    features.forEach(feature => {
        if (!feature?.id) {
            throw new Error('[FeatureApis] Each feature must declare a stable id.');
        }

        if (ids.has(feature.id)) {
            throw new Error(`[FeatureApis] Duplicate feature id detected: "${feature.id}".`);
        }

        ids.add(feature.id);
    });

    return Object.freeze([...features]);
}

export const FEATURE_APIS = validateFeatureApis([
    homeFeature,
    masbahaFeature,
    azkarFeature,
    duasFeature,
    quranFeature,
    tasksFeature,
    statsFeature,
    namesFeature,
    storiesFeature,
    settingsFeature
]);

const FEATURE_API_MAP = Object.freeze(
    Object.fromEntries(FEATURE_APIS.map(feature => [feature.id, feature]))
);

export function getFeatureApi(featureId) {
    return FEATURE_API_MAP[featureId] || null;
}

export function getFeatureCapabilities(featureId) {
    return getFeatureApi(featureId)?.capabilities || null;
}

import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';

function ensureAuthLoaded({ app }) {
    return app.ensureAuthLoaded();
}

export const settingsFeature = defineFeatureApi({
    id: 'settings',
    title: 'حسابي',
    init({ app }) {
        app.safeInit('feature:settings:auth', () => ensureAuthLoaded({ app }));
    },
    capabilities: {
        ensureAuthLoaded
    }
});

export const settingsSection = settingsFeature;

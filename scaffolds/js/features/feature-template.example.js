import { defineFeatureApi } from '../shared/contracts/define-feature-api.js';

function refreshExampleSurface() {
    // attach feature-specific refresh work here
}

export const exampleFeature = defineFeatureApi({
    id: 'example',
    title: 'مثال قسم جديد',
    init({ app }) {
        app.safeInit('feature:example:init', () => {
            // one-time bootstrap work for the feature
        });
    },
    enter({ app }) {
        app.safeInit('feature:example:enter', refreshExampleSurface);
    },
    refresh({ app }) {
        app.safeInit('feature:example:refresh', refreshExampleSurface);
    },
    leave() {
        // optional transient UI cleanup
    },
    dispose() {
        // optional teardown for future tests or runtime resets
    },
    capabilities: {
        refreshSurface: refreshExampleSurface
    }
});

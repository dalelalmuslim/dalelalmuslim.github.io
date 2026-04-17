import { defineFeatureApi } from './define-feature-api.js';

export function defineSectionContract(definition) {
    if (!definition || typeof definition !== 'object') {
        return defineFeatureApi(definition);
    }

    return defineFeatureApi({
        ...definition,
        enter: definition.enter || definition.onShow,
        leave: definition.leave || definition.onHide
    });
}

function ensureHandler(handler) {
    return typeof handler === 'function' ? handler : null;
}

function freezeCapabilities(capabilities) {
    if (!capabilities || typeof capabilities !== 'object') {
        return Object.freeze({});
    }
    return Object.freeze({ ...capabilities });
}

export function defineFeatureApi(definition) {
    if (!definition || typeof definition !== 'object') {
        throw new Error('[FeatureApi] Feature definition must be an object.');
    }

    const { id, title } = definition;
    if (!id || typeof id !== 'string') {
        throw new Error('[FeatureApi] Feature id is required.');
    }

    if (!title || typeof title !== 'string') {
        throw new Error(`[FeatureApi] Feature title is required for "${id}".`);
    }

    return Object.freeze({
        id,
        title,
        booted: Boolean(definition.booted),
        init: ensureHandler(definition.init),
        enter: ensureHandler(definition.enter),
        refresh: ensureHandler(definition.refresh),
        leave: ensureHandler(definition.leave),
        dispose: ensureHandler(definition.dispose),
        capabilities: freezeCapabilities(definition.capabilities)
    });
}

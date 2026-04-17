import { appLogger } from '../../shared/logging/app-logger.js';

const listenersByEvent = new Map();

function getEventListeners(eventName) {
    if (!listenersByEvent.has(eventName)) {
        listenersByEvent.set(eventName, new Set());
    }

    return listenersByEvent.get(eventName);
}

export const appEventBus = {
    on(eventName, listener) {
        if (typeof eventName !== 'string' || !eventName.trim() || typeof listener !== 'function') {
            return () => {};
        }

        const listeners = getEventListeners(eventName);
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
                listenersByEvent.delete(eventName);
            }
        };
    },

    emit(eventName, payload) {
        if (typeof eventName !== 'string' || !eventName.trim()) {
            return;
        }

        const listeners = listenersByEvent.get(eventName);
        if (!listeners || listeners.size === 0) {
            return;
        }

        [...listeners].forEach(listener => {
            try {
                listener(payload);
            } catch (error) {
                appLogger.error(`[EventBus] Listener failed for "${eventName}":`, error);
            }
        });
    },

    clear(eventName = null) {
        if (typeof eventName === 'string' && eventName.trim()) {
            listenersByEvent.delete(eventName);
            return;
        }

        listenersByEvent.clear();
    }
};

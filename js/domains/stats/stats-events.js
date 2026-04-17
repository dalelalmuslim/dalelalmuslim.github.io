import { appEventBus } from '../../app/events/app-event-bus.js';

const STATS_CHANGED_EVENT = 'stats:changed';

export function onStatsChanged(listener) {
    return appEventBus.on(STATS_CHANGED_EVENT, listener);
}

export function emitStatsChanged(payload = {}) {
    appEventBus.emit(STATS_CHANGED_EVENT, {
        at: Date.now(),
        ...payload
    });
}

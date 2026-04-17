const LOG_HISTORY_LIMIT = 200;
const history = [];

function toSafeString(value) {
    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof Error) {
        return value.message || value.name || 'Unknown error';
    }

    if (typeof value === 'object' && value !== null) {
        try {
            return JSON.stringify(value);
        } catch {
            return '[unserializable object]';
        }
    }

    return String(value ?? '');
}

function extractScopeAndMessage(args = []) {
    const first = args[0];
    if (typeof first === 'string') {
        const match = first.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (match) {
            return {
                scope: match[1] || 'App',
                message: match[2] || first,
                payload: args.slice(1)
            };
        }

        return {
            scope: 'App',
            message: first,
            payload: args.slice(1)
        };
    }

    if (first instanceof Error) {
        return {
            scope: 'App',
            message: first.message || 'Unknown error',
            payload: args
        };
    }

    return {
        scope: 'App',
        message: toSafeString(first),
        payload: args.slice(1)
    };
}

function extractError(payload = []) {
    return payload.find(item => item instanceof Error) || null;
}

function canUseDebugConsoleMirror() {
    try {
        if (globalThis.__AZKAR_ENABLE_DEBUG_LOGS__ === true) {
            return true;
        }

        const search = globalThis.location?.search || '';
        return new URLSearchParams(search).get('debugLogs') === '1';
    } catch {
        return false;
    }
}

function mirrorToConsole(level, args) {
    if (!canUseDebugConsoleMirror()) {
        return;
    }

    const consoleApi = globalThis.console;
    if (!consoleApi) {
        return;
    }

    const method = level === 'error'
        ? 'error'
        : level === 'warn'
            ? 'warn'
            : 'log';

    consoleApi[method]?.(...args);
}

function dispatchLogEvent(entry) {
    try {
        const eventTarget = globalThis.window || globalThis;
        if (typeof eventTarget.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
            eventTarget.dispatchEvent(new globalThis.CustomEvent('azkar:log', { detail: entry }));
        }
    } catch {
        // no-op
    }
}

function forwardToTelemetry(entry) {
    try {
        const telemetry = globalThis.__AZKAR_TELEMETRY__;
        if (typeof telemetry === 'function') {
            telemetry(entry);
            return;
        }

        if (telemetry && typeof telemetry.capture === 'function') {
            telemetry.capture(entry);
        }
    } catch {
        // no-op
    }
}

function record(level, args = []) {
    const { scope, message, payload } = extractScopeAndMessage(args);
    const error = extractError(payload);
    const entry = {
        level,
        scope,
        message,
        payload,
        error,
        timestamp: new Date().toISOString()
    };

    history.push(entry);
    if (history.length > LOG_HISTORY_LIMIT) {
        history.shift();
    }

    dispatchLogEvent(entry);
    forwardToTelemetry(entry);
    mirrorToConsole(level, args);

    return entry;
}

export const appLogger = {
    info(...args) {
        return record('info', args);
    },

    warn(...args) {
        return record('warn', args);
    },

    error(...args) {
        return record('error', args);
    },

    getHistory() {
        return history.slice();
    },

    clear() {
        history.length = 0;
    }
};

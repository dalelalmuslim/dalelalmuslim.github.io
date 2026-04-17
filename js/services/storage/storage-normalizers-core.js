export function toSafeNumber(value, fallback = 0, { min = null, max = null } = {}) {
    const num = Number(value);

    if (!Number.isFinite(num)) {
        return fallback;
    }

    let result = num;
    if (min !== null && result < min) result = min;
    if (max !== null && result > max) result = max;

    return result;
}

export function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

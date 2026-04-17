export function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getLocalMonthKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

export function parseDateKey(dateKey) {
    if (!dateKey || typeof dateKey !== 'string') return null;

    const parts = dateKey.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

    const [year, month, day] = parts;
    const parsed = new Date(year, month - 1, day);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

export function getDayDifference(fromKey, toKey) {
    const fromDate = parseDateKey(fromKey);
    const toDate = parseDateKey(toKey);

    if (!fromDate || !toDate) return null;

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(0, 0, 0, 0);

    const diffMs = toDate.getTime() - fromDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

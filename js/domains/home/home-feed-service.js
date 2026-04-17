export function getDayOfYear(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / 86400000);
}

export function resolveDailyAyahSelection({
    ayahs,
    today,
    storageState,
    noRepeatDays,
    now = new Date()
}) {
    const normalizedAyahs = Array.isArray(ayahs) ? ayahs : [];
    if (normalizedAyahs.length === 0) {
        return { selectedAyah: null, shouldPersist: false, nextRecentIds: [] };
    }

    const currentAyahId = Number(storageState?.dailyAyahId);
    const currentAyahDate = storageState?.dailyAyahDate || '';
    let selectedAyah = null;

    if (currentAyahDate === today && Number.isFinite(currentAyahId)) {
        selectedAyah = normalizedAyahs.find(item => Number(item?.id) === currentAyahId) || null;
    }

    const recentIds = Array.isArray(storageState?.recentDailyAyahIds)
        ? storageState.recentDailyAyahIds.map(Number).filter(Number.isFinite)
        : [];

    if (selectedAyah) {
        return {
            selectedAyah,
            shouldPersist: false,
            nextRecentIds: recentIds
        };
    }

    let availableAyahs = normalizedAyahs.filter(item => !recentIds.includes(Number(item?.id)));
    if (availableAyahs.length === 0) {
        availableAyahs = normalizedAyahs;
    }

    const daySeed = getDayOfYear(now);
    const index = daySeed % availableAyahs.length;
    selectedAyah = availableAyahs[index] || availableAyahs[0] || null;

    if (!selectedAyah) {
        return { selectedAyah: null, shouldPersist: false, nextRecentIds: recentIds };
    }

    const selectedId = Number(selectedAyah.id);
    const nextRecentIds = [
        ...recentIds.filter(id => id !== selectedId),
        selectedId
    ].slice(-noRepeatDays);

    return {
        selectedAyah,
        shouldPersist: true,
        nextRecentIds
    };
}

export function resolveDailyMessage(messages, now = Date.now()) {
    const safeMessages = Array.isArray(messages) ? messages : [];
    if (safeMessages.length === 0) {
        return '—';
    }

    // Use local time hours (not UTC) so the 6-hour cycle aligns with the user's timezone.
    // E.g. a user at UTC+3: without this fix, "صباح" message could show at 3AM local time.
    const localHour = new Date(now).getHours();
    const period = Math.floor(localHour / 6); // 4 periods: 0–5, 6–11, 12–17, 18–23
    const item = safeMessages[period % safeMessages.length];
    return item?.message || String(item || '—');
}

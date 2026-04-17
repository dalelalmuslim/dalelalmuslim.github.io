export function applyDateBoundaryResets(storageApi) {
    let changed = false;
    const today = storageApi.getLocalDateKey();
    const monthKey = storageApi.getLocalMonthKey();

    if (storageApi.state.lastMonthKey !== monthKey) {
        storageApi.state.monthlyTasbeeh = 0;
        storageApi.state.lastMonthKey = monthKey;
        changed = true;
    }

    if (storageApi.state.lastDate === today) {
        return changed;
    }

    if (storageApi.state.lastDate) {
        const diffDays = storageApi.getDayDifference(storageApi.state.lastDate, today);
        if (diffDays === 1) {
            storageApi.state.streakCount += 1;
        } else {
            storageApi.state.streakCount = 1;
        }
    } else {
        storageApi.state.streakCount = 1;
    }

    storageApi.state.dailyTasbeeh = 0;
    storageApi.state.currentSessionTasbeeh = 0;
    storageApi.state.azkarProgress = {};
    storageApi.state.azkarSession = {
        ...storageApi.state.azkarSession,
        activeCategorySlug: '',
        activeCategoryTitle: '',
        activeItemIndex: 0,
        startedAt: '',
        view: 'grid'
    };
    storageApi.state.lastDate = today;
    changed = true;

    if (Array.isArray(storageApi.state.tasks)) {
        storageApi.state.tasks = storageApi.state.tasks.map(task => ({
            ...task,
            completed: false
        }));
    } else {
        storageApi.state.tasks = [];
    }

    storageApi.syncDerivedState();
    return true;
}

const STATS_DOM_IDS = Object.freeze({
    emptyState: 'statsEmptyState',
    activityLabel: 'statsActivityLabel',
    tasksProgressBar: 'tasksProgressBar',
    tasksPercentInline: 'statTasksPercentInline',
    dailyTasbeehInline: 'statDailyTasbeehInline',
    dailyTasbeehTargetInline: 'statDailyTasbeehTargetInline',
    tasbeehPercentInline: 'statTasbeehPercentInline',
    tasbeehProgressBar: 'tasbeehProgressBar',
    compatTasbeehProgress: 'statTasbeehProgressBar',
    tasksProgressDetails: 'statTasksProgressDetails',
    tasbeehProgressDetails: 'statTasbeehProgressDetails',
    remainingSummary: 'statRemainingSummary',
    tasksProgressPercent: 'statTasksProgressPercent',
    statTasksProgressBar: 'statTasksProgressBar',
    smartMessage: 'statsSmartMessage',
    statDailyTasbeeh: 'statDailyTasbeeh',
    statStreak: 'statStreak',
    statMonthlyTasbeeh: 'statMonthlyTasbeeh',
    statTasksCompleted: 'statTasksCompleted',
    statTasksTotal: 'statTasksTotal',
    statTasksPercent: 'statTasksPercent'
});

function getElementById(id) {
    return typeof id === 'string' && id
        ? document.getElementById(id)
        : null;
}

export function getStatsDomElement(key) {
    return getElementById(STATS_DOM_IDS[key]);
}

import { setProgress, setTextContent, toggleHidden } from '../../shared/dom/dom-helpers.js';
import { StatsSelectors } from '../../domains/stats/stats-selectors.js';
import { getStatsDomElement } from './stats-dom.js';

export function renderStatsSurface() {
    const summary = StatsSelectors.getStatsSummary();

    toggleHidden(getStatsDomElement('emptyState'), summary.hasTrackedActivity);

    setTextContent('statDailyTasbeeh', summary.dailyTasbeeh);
    setTextContent('statDailyTasbeehInline', summary.dailyTasbeeh);
    setTextContent('statDailyTasbeehTargetInline', summary.dailyTasbeehTarget);
    setTextContent('statStreak', summary.streakCount);
    setTextContent('statMonthlyTasbeeh', summary.monthlyTasbeeh);
    setTextContent('statTasksCompleted', summary.completedTasks);
    setTextContent('statTasksTotal', summary.totalTasks);
    setTextContent('statTasksPercent', `${summary.completionRate}%`);
    setTextContent('statTasksPercentInline', `${summary.completionRate}%`);
    setTextContent('statsActivityLabel', summary.activity.label);
    setTextContent('statTasbeehPercentInline', `${Math.round(summary.dailyTasbeehProgressRatio * 100)}%`);
    setTextContent('statTasksProgressDetails', summary.tasksProgressText);
    setTextContent('statTasbeehProgressDetails', summary.tasbeehProgressText);
    setTextContent('statRemainingSummary', summary.remainingSummaryText);
    setTextContent('statTasksProgressPercent', `${summary.tasksCompletionRate}%`);
    setTextContent('statsSmartMessage', summary.smartMessage);

    setProgress('tasksProgressBar', summary.completionRate / 100);
    setProgress('tasbeehProgressBar', summary.dailyTasbeehProgressRatio);
    setProgress('statTasbeehProgressBar', summary.dailyTasbeehProgressRatio);
    setProgress('statTasksProgressBar', summary.tasksCompletionRate / 100);

    return summary;
}

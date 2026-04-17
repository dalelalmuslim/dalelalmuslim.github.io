import { tasksStore } from '../tasks/tasks-store.js';
import { masbahaProgressStore } from '../masbaha/masbaha-progress-store.js';
import { APP_CONFIG } from '../../app/app-config.js';

export const StatsSelectors = {
    getCompletedTasksCount() {
        return tasksStore.getCompletedCount();
    },

    getTotalTasksCount() {
        return tasksStore.getTotalCount();
    },

    getDailyTasbeeh() {
        return masbahaProgressStore.getDailyTasbeeh();
    },

    getMonthlyTasbeeh() {
        return masbahaProgressStore.getMonthlyTasbeeh();
    },

    getStreakCount() {
        return masbahaProgressStore.getStreakCount();
    },

    getTasksCompletedLifetime() {
        return tasksStore.getLifetimeCompleted();
    },

    getTasksRemainingCount() {
        return Math.max(0, this.getTotalTasksCount() - this.getCompletedTasksCount());
    },

    getDailyTasbeehTarget() {
        return masbahaProgressStore.getDailyTasbeehTarget() || APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET;
    },

    getDailyTasbeehProgressRatio() {
        const target = this.getDailyTasbeehTarget();
        const current = this.getDailyTasbeeh();
        if (target <= 0) return 1;
        return Math.min(current / target, 1);
    },

    getDailyTasbeehRemaining() {
        return Math.max(0, this.getDailyTasbeehTarget() - this.getDailyTasbeeh());
    },

    getTasksCompletionRate() {
        const total = this.getTotalTasksCount();
        if (total === 0) return 0;
        const completed = this.getCompletedTasksCount();
        return Math.round((completed / total) * 100);
    },

    getTasksProgressRatio() {
        return this.getTasksCompletionRate() / 100;
    },

    hasTrackedActivity() {
        return this.getCompletedTasksCount() > 0
            || this.getDailyTasbeeh() > 0
            || this.getMonthlyTasbeeh() > 0
            || this.getStreakCount() > 0
            || this.getTasksCompletedLifetime() > 0;
    },

    getCompletionRate() {
        const completedTasks = this.getCompletedTasksCount();
        const totalTasks = this.getTotalTasksCount();
        const tasbeehProgress = this.getDailyTasbeehProgressRatio();

        const totalUnits = totalTasks + 1;
        const completedUnits = completedTasks + tasbeehProgress;

        if (totalUnits <= 0) return 0;

        return Math.round((completedUnits / totalUnits) * 100);
    },

    getTasksProgressText() {
        return `${this.getCompletedTasksCount()} / ${this.getTotalTasksCount()}`;
    },

    getTasbeehProgressText() {
        return `${this.getDailyTasbeeh()} / ${this.getDailyTasbeehTarget()}`;
    },

    getDashboardStats() {
        const completedTasks = this.getCompletedTasksCount();
        const totalTasks = this.getTotalTasksCount();
        const dailyTasbeeh = this.getDailyTasbeeh();
        const dailyTasbeehTarget = this.getDailyTasbeehTarget();
        const monthlyTasbeeh = this.getMonthlyTasbeeh();
        const streakCount = this.getStreakCount();
        const tasksCompletedLifetime = this.getTasksCompletedLifetime();

        return {
            completedTasks,
            totalTasks,
            pendingTasks: Math.max(totalTasks - completedTasks, 0),
            tasksCompletionRate: this.getTasksCompletionRate(),
            dailyTasbeeh,
            dailyTasbeehTarget,
            dailyTasbeehProgress: this.getDailyTasbeehProgressRatio(),
            dailyTasbeehRemaining: this.getDailyTasbeehRemaining(),
            monthlyTasbeeh,
            streakCount,
            tasksCompletedLifetime
        };
    },

    getRemainingSummaryText(stats = null) {
        const summary = stats || this.getDashboardStats();

        if (summary.totalTasks === 0 && summary.dailyTasbeeh === 0) {
            return 'ابدأ بإضافة مهام أو تسبيح اليوم ✨';
        }

        const pendingTasks = summary.pendingTasks;
        const remainingTasbeeh = summary.dailyTasbeehRemaining;

        if (pendingTasks === 0 && remainingTasbeeh === 0) {
            return 'اكتمل هدف اليوم بالكامل ✅';
        }

        if (pendingTasks > 0 && remainingTasbeeh > 0) {
            return `باقي ${pendingTasks} مهام و ${remainingTasbeeh} تسبيحة`;
        }

        if (pendingTasks > 0) {
            return `باقي ${pendingTasks} مهام فقط`;
        }

        return `باقي ${remainingTasbeeh} تسبيحة فقط`;
    },

    getActivityLevelFromStats(stats) {
        if (stats.totalTasks === 0 && stats.dailyTasbeeh === 0) {
            return { label: 'ابدأ اليوم', tone: 'neutral' };
        }

        const completionRate = this.getCompletionRate();

        if (completionRate === 100) {
            return { label: 'يوم مثالي', tone: 'excellent' };
        }

        if (completionRate >= 85) {
            return { label: 'ممتاز جدًا', tone: 'excellent' };
        }

        if (completionRate >= 65) {
            return { label: 'تقدم قوي', tone: 'good' };
        }

        if (completionRate >= 40) {
            return { label: 'تقدم جيد', tone: 'good' };
        }

        if (stats.dailyTasbeeh > 0 || stats.completedTasks > 0) {
            return { label: 'بداية موفقة', tone: 'neutral' };
        }

        return { label: 'بداية اليوم', tone: 'neutral' };
    },

    getSmartStatsMessage(stats) {
        const completionRate = this.getCompletionRate();

        if (completionRate === 100) {
            return 'أتممت كل مهامك وحققت هدف التسبيح اليومي، ما شاء الله 🌟';
        }

        if (stats.completedTasks === stats.totalTasks && stats.totalTasks > 0 && stats.dailyTasbeeh < stats.dailyTasbeehTarget) {
            return `أنجزت كل المهام، وبقي ${stats.dailyTasbeehRemaining} تسبيحة لإغلاق اليوم على 100%`;
        }

        if (stats.dailyTasbeeh >= stats.dailyTasbeehTarget && stats.pendingTasks > 0) {
            return `حققت هدف التسبيح اليومي، وبقي ${stats.pendingTasks} مهام للوصول إلى 100%`;
        }

        if (stats.pendingTasks === 1 && stats.dailyTasbeehRemaining === 0) {
            return 'بقيت مهمة واحدة فقط للوصول إلى يوم مثالي 🔥';
        }

        if (stats.pendingTasks === 0 && stats.dailyTasbeehRemaining > 0) {
            return `بقي ${stats.dailyTasbeehRemaining} تسبيحة فقط لتحقيق هدف اليوم`;
        }

        if (completionRate >= 75) {
            return 'أنت قريب جدًا من إكمال يومك بنجاح ممتاز 👏';
        }

        if (completionRate >= 40) {
            return 'تقدمك جيد، استمر بنفس الوتيرة 🌱';
        }

        return 'ابدأ بخطوة صغيرة: مهمة واحدة أو دفعة تسبيح، والباقي سيأتي بسهولة ✨';
    },

    getStatsSummary() {
        const stats = this.getDashboardStats();

        return {
            dailyTasbeeh: stats.dailyTasbeeh,
            dailyTasbeehTarget: stats.dailyTasbeehTarget,
            dailyTasbeehProgressRatio: stats.dailyTasbeehProgress,
            dailyTasbeehRemaining: stats.dailyTasbeehRemaining,
            monthlyTasbeeh: stats.monthlyTasbeeh,
            streakCount: stats.streakCount,
            completedTasks: stats.completedTasks,
            totalTasks: stats.totalTasks,
            remainingTasks: stats.pendingTasks,
            tasksCompletedLifetime: stats.tasksCompletedLifetime,
            tasksProgressText: this.getTasksProgressText(),
            tasbeehProgressText: this.getTasbeehProgressText(),
            remainingSummaryText: this.getRemainingSummaryText(stats),
            tasksCompletionRate: this.getTasksCompletionRate(),
            tasksProgressRatio: this.getTasksProgressRatio(),
            completionRate: this.getCompletionRate(),
            activity: this.getActivityLevelFromStats(stats),
            smartMessage: this.getSmartStatsMessage(stats),
            hasTrackedActivity: this.hasTrackedActivity()
        };
    }
};

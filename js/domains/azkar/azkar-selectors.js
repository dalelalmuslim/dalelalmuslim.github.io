import { getStorageDateKey } from '../../services/storage/storage-access.js';
import { getAzkarCatalog, getAzkarCategoryByKey } from './azkar-repository.js';
import { azkarProgressStore } from './azkar-progress-store.js';
import { azkarSessionStore } from './azkar-session-store.js';
import { azkarHistoryStore } from './azkar-history-store.js';
import { azkarPreferencesStore } from './azkar-preferences-store.js';

const PERIOD_META = {
    morning: { label: 'الصباح', icon: 'fa-sun' },
    evening: { label: 'المساء', icon: 'fa-cloud-moon' },
    prayer: { label: 'بعد الصلاة', icon: 'fa-mosque' },
    general: { label: 'عام', icon: 'fa-sparkles' }
};

const REMINDER_META = {
    off: { label: 'التذكير متوقف', shortLabel: 'بدون تذكير', icon: 'fa-bell-slash' },
    smart: { label: 'تذكير خفيف للصباح والمساء', shortLabel: 'تذكير ذكي', icon: 'fa-wand-magic-sparkles' },
    morning: { label: 'تذكير صباحي هادئ', shortLabel: 'الصباح', icon: 'fa-sun' },
    evening: { label: 'تذكير مسائي هادئ', shortLabel: 'المساء', icon: 'fa-cloud-moon' },
    prayer: { label: 'تذكير بعد الصلاة', shortLabel: 'بعد الصلاة', icon: 'fa-mosque' }
};

function calculateCategoryProgress(category, progressMap = {}) {
    const items = Array.isArray(category?.azkar) ? category.azkar : [];
    const totalItems = items.length;
    const completedItems = items.reduce((count, item, index) => {
        const target = Number(item?.repeatTarget ?? 1) || 1;
        const current = Number(progressMap[index]) || 0;
        return count + (current >= target ? 1 : 0);
    }, 0);
    const totalRepeats = items.reduce((sum, item) => sum + (Number(item?.repeatTarget ?? 1) || 1), 0);
    const completedRepeats = items.reduce((sum, item, index) => {
        const target = Number(item?.repeatTarget ?? 1) || 1;
        const current = Number(progressMap[index]) || 0;
        return sum + Math.min(current, target);
    }, 0);
    const remainingItems = Math.max(0, totalItems - completedItems);

    return {
        totalItems,
        completedItems,
        totalRepeats,
        completedRepeats,
        remainingItems,
        itemCompletionRatio: totalItems > 0 ? completedItems / totalItems : 0,
        repeatCompletionRatio: totalRepeats > 0 ? completedRepeats / totalRepeats : 0,
        progressLabel: `${completedItems}/${totalItems}`,
        repeatProgressLabel: `${completedRepeats}/${totalRepeats}`,
        isCompleted: totalItems > 0 && completedItems >= totalItems
    };
}

export function getCurrentTimeContext() {
    const hour = new Date().getHours();

    if (hour >= 4 && hour < 11) {
        return { key: 'morning', primaryPeriod: 'morning', label: 'الصباح' };
    }

    if (hour >= 17 && hour < 22) {
        return { key: 'evening', primaryPeriod: 'evening', label: 'المساء' };
    }

    if (hour >= 22 || hour < 4) {
        return { key: 'late-night', primaryPeriod: 'evening', label: 'آخر الليل' };
    }

    return { key: 'day', primaryPeriod: 'prayer', label: 'اليوم' };
}

function getSuggestedPeriodOrder() {
    const context = getCurrentTimeContext();

    if (context.key === 'morning') {
        return ['morning', 'prayer', 'evening', 'general'];
    }

    if (context.key === 'evening' || context.key === 'late-night') {
        return ['evening', 'prayer', 'morning', 'general'];
    }

    return ['prayer', 'morning', 'evening', 'general'];
}

function getHomeResumePeriod() {
    const context = getCurrentTimeContext();

    if (context.key === 'morning') {
        return 'morning';
    }

    if (context.key === 'evening' || context.key === 'late-night') {
        return 'evening';
    }

    return '';
}

function buildSuggestedRank(category) {
    const periodOrder = getSuggestedPeriodOrder();
    const index = periodOrder.indexOf(category.period || 'general');
    return index >= 0 ? index : periodOrder.length;
}

function getTodayCompletedSlugs(historyState) {
    const today = getStorageDateKey();
    return Array.isArray(historyState.dailyCompletions?.[today])
        ? historyState.dailyCompletions[today]
        : [];
}

function createLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getReminderMeta(preferences) {
    const reminderWindow = preferences?.reminderEnabled === false
        ? 'off'
        : (preferences?.reminderWindow || 'smart');
    return REMINDER_META[reminderWindow] || REMINDER_META.smart;
}

function getWeeklyConsistency(historyState) {
    const today = new Date();
    let activeDays = 0;
    let streakDays = 0;

    for (let index = 0; index < 7; index += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        const dateKey = createLocalDateKey(date);
        const hasActivity = Array.isArray(historyState.dailyCompletions?.[dateKey]) && historyState.dailyCompletions[dateKey].length > 0;

        if (hasActivity) {
            activeDays += 1;
            if (index === streakDays) {
                streakDays += 1;
            }
        }
    }

    return {
        activeDays,
        streakDays,
        ratio: activeDays / 7
    };
}

function buildSortingTuple(category, preferences = {}) {
    const smartOrderingEnabled = preferences.smartOrderingEnabled !== false;

    if (!smartOrderingEnabled) {
        return [0, category.sortOrder, category.title];
    }

    return [
        category.isActiveSession ? 0 : 1,
        category.wasCompletedToday ? 1 : 0,
        category.suggestedRank,
        category.isLastVisited && !category.progress.isCompleted ? 0 : 1,
        category.sortOrder,
        category.title
    ];
}

function compareCategoryTuples(left, right) {
    const max = Math.max(left.length, right.length);
    for (let index = 0; index < max; index += 1) {
        const l = left[index];
        const r = right[index];
        if (l === r) continue;
        if (typeof l === 'string' || typeof r === 'string') {
            return String(l).localeCompare(String(r), 'ar');
        }
        return Number(l) - Number(r);
    }
    return 0;
}

function enrichCategory(category, progressMap, historyState, sessionState, preferences) {
    const progress = calculateCategoryProgress(category, progressMap);
    const periodMeta = PERIOD_META[category.period || 'general'] || PERIOD_META.general;
    const todayCompleted = getTodayCompletedSlugs(historyState);
    const timeContext = getCurrentTimeContext();
    const suggestedRank = buildSuggestedRank(category);
    const isRecommendedNow = suggestedRank === 0 && category.period === timeContext.primaryPeriod;
    const hasProgress = progress.completedItems > 0 && !progress.isCompleted;

    return {
        ...category,
        progressMap,
        progress,
        periodLabel: periodMeta.label,
        periodIcon: periodMeta.icon,
        suggestedRank,
        timeContextKey: timeContext.key,
        timeContextLabel: timeContext.label,
        isRecommendedNow,
        categoryStateLabel: progress.isCompleted
            ? 'تم اليوم'
            : isRecommendedNow
                ? 'الأنسب الآن'
                : '',
        isLastVisited: historyState.lastVisitedSlug === category.slug,
        isActiveSession: sessionState.activeCategorySlug === category.slug,
        wasCompletedToday: todayCompleted.includes(category.slug),
        reminderHint: preferences.reminderEnabled && preferences.reminderWindow !== 'off'
            ? getReminderMeta(preferences).shortLabel
            : ''
    };
}

export async function getAzkarCategorySummaries() {
    const catalog = await getAzkarCatalog();
    const progressMap = azkarProgressStore.getMap();
    const historyState = azkarHistoryStore.getState();
    const sessionState = azkarSessionStore.getState();
    const preferences = azkarPreferencesStore.getState();

    const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];

    return categories
        .map(category => enrichCategory(category, progressMap[category.slug] || {}, historyState, sessionState, preferences))
        .sort((left, right) => compareCategoryTuples(
            buildSortingTuple(left, preferences),
            buildSortingTuple(right, preferences)
        ));
}

export async function getAzkarCategoryViewModel(categoryKey) {
    const category = await getAzkarCategoryByKey(categoryKey);
    if (!category) return null;

    const historyState = azkarHistoryStore.getState();
    const sessionState = azkarSessionStore.getState();
    const preferences = azkarPreferencesStore.getState();
    const categoryProgressMap = azkarProgressStore.getMap()[category.slug] || {};
    const enrichedCategory = enrichCategory(category, categoryProgressMap, historyState, sessionState, preferences);
    const firstIncompleteIndex = category.azkar.findIndex((item, index) => {
        const current = Number(categoryProgressMap[index]) || 0;
        const target = Number(item?.repeatTarget ?? 1) || 1;
        return current < target;
    });

    return {
        ...enrichedCategory,
        activeItemIndex: sessionState.activeCategorySlug === category.slug && Number.isInteger(sessionState.activeItemIndex)
            ? sessionState.activeItemIndex
            : (firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0),
        firstIncompleteIndex: firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0,
        reminderMeta: getReminderMeta(preferences),
        preferences
    };
}

export async function getAzkarResumeSummary() {
    const categories = await getAzkarCategorySummaries();
    if (categories.length === 0) return null;

    const sessionState = azkarSessionStore.getState();
    const historyState = azkarHistoryStore.getState();
    const favoriteItemIds = new Set(azkarPreferencesStore.getState().favoriteItemIds || []);

    const bySession = categories.find(category => category.slug === sessionState.activeCategorySlug);
    const byFavoriteItem = categories.find(category => category.azkar.some(item => favoriteItemIds.has(item.id)) && !category.progress.isCompleted);
    const byLastVisited = categories.find(category => category.slug === historyState.lastVisitedSlug);
    const bySuggested = categories[0];

    const candidate = (bySession && !bySession.progress.isCompleted)
        ? bySession
        : byFavoriteItem
            ? byFavoriteItem
            : (byLastVisited && !byLastVisited.progress.isCompleted)
                ? byLastVisited
                : bySuggested;

    if (!candidate) return null;

    const helperText = candidate.progress.isCompleted
        ? 'أكملت هذا الورد اليوم، يمكنك مراجعته أو البدء من جديد.'
        : candidate.progress.remainingItems > 0
            ? `باقي ${candidate.progress.remainingItems} ذكر لإتمام هذا الورد.`
            : 'ابدأ هذا الورد الآن.';

    return {
        slug: candidate.slug,
        title: candidate.title,
        description: candidate.description,
        estimatedMinutes: candidate.estimatedMinutes,
        progressLabel: candidate.progress.progressLabel,
        completionRatio: candidate.progress.itemCompletionRatio,
        helperText,
        periodLabel: candidate.periodLabel,
        isFavorite: candidate.azkar.some(item => favoriteItemIds.has(item.id)),
        actionLabel: candidate.progress.isCompleted ? 'مراجعة الورد' : 'افتح الورد'
    };
}

function buildFavoriteItemSnippet(text = '') {
    const compact = String(text || '').replace(/\s+/g, ' ').trim();
    if (compact.length <= 78) return compact;
    return `${compact.slice(0, 75).trim()}…`;
}

export async function getFavoriteAzkarItemsViewModel() {
    const catalog = await getAzkarCatalog();
    const preferences = azkarPreferencesStore.getState();
    const progressState = azkarProgressStore.getMap();
    const favoriteIds = Array.isArray(preferences.favoriteItemIds) ? preferences.favoriteItemIds : [];
    if (favoriteIds.length === 0) return [];

    const itemMap = new Map();
    const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];

    categories.forEach((category) => {
        const categoryProgressMap = progressState[category.slug] || {};
        category.azkar.forEach((item, index) => {
            const itemId = item.id || `${category.slug}-${index + 1}`;
            const target = Number(item.repeatTarget ?? item.repeat ?? item.count ?? 1) || 1;
            const current = Number(categoryProgressMap[index]) || 0;
            itemMap.set(itemId, {
                itemId,
                categorySlug: category.slug,
                categoryTitle: category.title,
                categoryPeriodLabel: (PERIOD_META[category.period || 'general'] || PERIOD_META.general).label,
                categoryAccentTone: category.accentTone || 'default',
                accentTone: category.accentTone || 'default',
                text: item.text || item.zekr || '',
                snippet: buildFavoriteItemSnippet(item.text || item.zekr || ''),
                reference: item.reference || item.fadl || '',
                progressLabel: `${Math.min(current, target)}/${target}`,
                isCompleted: current >= target,
                itemIndex: index,
                isRecommendedNow: buildSuggestedRank(category) === 0,
                sortOrder: category.sortOrder || 0
            });
        });
    });

    return favoriteIds
        .map(itemId => itemMap.get(itemId))
        .filter(Boolean)
        .sort((left, right) => {
            if (left.isRecommendedNow !== right.isRecommendedNow) return left.isRecommendedNow ? -1 : 1;
            if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
            return left.itemIndex - right.itemIndex;
        });
}


export async function getHomeAzkarResumeSummary() {
    const categories = await getAzkarCategorySummaries();
    if (!categories.length) return null;

    const targetPeriod = getHomeResumePeriod();
    if (!targetPeriod) return null;

    const candidate = categories.find(category => category.period === targetPeriod);
    if (!candidate || candidate.progress.isCompleted) return null;

    const hasStarted = (candidate.progress.completedRepeats || 0) > 0;
    const helperText = hasStarted
        ? `باقي ${candidate.progress.remainingItems} ذكر لإتمام ${candidate.title}.`
        : `${candidate.title} غير مكتملة حتى الآن.`;

    return {
        slug: candidate.slug,
        title: candidate.title,
        actionTitle: hasStarted ? `أكمل ${candidate.title}` : `ابدأ ${candidate.title}`,
        actionLabel: hasStarted ? 'تابع الورد' : 'ابدأ الورد',
        helperText,
        periodLabel: candidate.periodLabel,
        accentTone: candidate.accentTone || 'default',
        icon: candidate.periodIcon || candidate.icon || 'fa-book-open',
        completionRatio: candidate.progress.itemCompletionRatio
    };
}

export async function getAzkarPrimaryActionViewModel() {
    const categories = await getAzkarCategorySummaries();
    if (!categories.length) return null;

    const timeContext = getCurrentTimeContext();
    const primary = categories.find(category => category.isRecommendedNow)
        || categories.find(category => category.period === timeContext.primaryPeriod)
        || categories[0];

    if (!primary) return null;

    const actionLabel = primary.progress.completedItems > 0 && !primary.progress.isCompleted
        ? `افتح ${primary.title}`
        : `ابدأ ${primary.title}`;

    return {
        slug: primary.slug,
        title: actionLabel,
        helperText: `الأنسب الآن: ${primary.periodLabel}`,
        periodLabel: primary.periodLabel,
        icon: primary.periodIcon || primary.icon || 'fa-sparkles',
        accentTone: primary.accentTone || 'default',
        timeContextLabel: timeContext.label
    };
}

export async function getAzkarEngagementSummary() {
    const categories = await getAzkarCategorySummaries();
    const preferences = azkarPreferencesStore.getState();
    const historyState = azkarHistoryStore.getState();
    const reminderMeta = getReminderMeta(preferences);
    const dailyCategories = categories.filter(category => category.isDaily);
    const completedToday = getTodayCompletedSlugs(historyState);
    const completedDailyCount = dailyCategories.filter(category => completedToday.includes(category.slug)).length;
    const weeklyConsistency = getWeeklyConsistency(historyState);
    const favoriteItemsCount = Array.isArray(preferences.favoriteItemIds) ? preferences.favoriteItemIds.length : 0;

    const headline = completedDailyCount >= dailyCategories.length && dailyCategories.length > 0
        ? 'أكملت أورادك اليومية اليوم. حافظ على هذا الهدوء الجميل.'
        : completedDailyCount > 0
            ? `أنجزت ${completedDailyCount} من ${dailyCategories.length || categories.length} من أورادك اليومية.`
            : 'ابدأ اليوم بورد قصير وسترى الأثر يتراكم بهدوء.';

    return {
        headline,
        dailyCompletedCount: completedDailyCount,
        dailyTargetCount: dailyCategories.length,
        weeklyActiveDays: weeklyConsistency.activeDays,
        streakDays: weeklyConsistency.streakDays,
        weeklyRatio: weeklyConsistency.ratio,
        favoriteCount: favoriteItemsCount,
        reminderLabel: reminderMeta.label,
        reminderShortLabel: reminderMeta.shortLabel,
        reminderIcon: reminderMeta.icon,
        smartOrderingEnabled: preferences.smartOrderingEnabled !== false,
        hasFavorites: favoriteItemsCount > 0
    };
}

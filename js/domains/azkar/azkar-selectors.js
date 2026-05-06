import { getStorageDateKey } from '../../services/storage/storage-access.js';
import { getAzkarCatalog, getAzkarCategoryByKey } from './azkar-repository.js';
import { azkarProgressStore } from './azkar-progress-store.js';
import { azkarSessionStore } from './azkar-session-store.js';
import { azkarHistoryStore } from './azkar-history-store.js';
import { azkarPreferencesStore } from './azkar-preferences-store.js';

const PERIOD_META = Object.freeze({
    morning: {
        label: 'الصباح',
        icon: 'fa-sun',
        tone: 'morning',
        actionTitle: 'أذكار الصباح',
        helper: 'بداية هادئة ونشيطة لليوم'
    },
    evening: {
        label: 'المساء',
        icon: 'fa-moon',
        tone: 'evening',
        actionTitle: 'أذكار المساء',
        helper: 'ورد خفيف لختم اليوم بطمأنينة'
    },
    prayer: {
        label: 'بعد الصلاة',
        icon: 'fa-mosque',
        tone: 'prayer',
        actionTitle: 'أذكار بعد الصلاة',
        helper: 'ورد قصير يتكرر بعد الصلوات'
    },
    general: {
        label: 'عام',
        icon: 'fa-sparkles',
        tone: 'default',
        actionTitle: 'ورد مختار',
        helper: 'ذكر خفيف ليومك'
    }
});

const REMINDER_META = Object.freeze({
    off: { label: 'التذكير متوقف', shortLabel: 'بدون تذكير', icon: 'fa-bell-slash' },
    smart: { label: 'تذكير خفيف للصباح والمساء', shortLabel: 'تذكير ذكي', icon: 'fa-wand-magic-sparkles' },
    morning: { label: 'تذكير صباحي هادئ', shortLabel: 'الصباح', icon: 'fa-sun' },
    evening: { label: 'تذكير مسائي هادئ', shortLabel: 'المساء', icon: 'fa-cloud-moon' },
    prayer: { label: 'تذكير بعد الصلاة', shortLabel: 'بعد الصلاة', icon: 'fa-mosque' }
});

export const AZKAR_FILTERS = Object.freeze([
    { key: 'all', label: 'الكل' },
    { key: 'morning', label: 'الصباح' },
    { key: 'evening', label: 'المساء' },
    { key: 'prayer', label: 'بعد الصلاة' },
    { key: 'favorites', label: 'المفضلة' }
]);

function getCategoryItems(category) {
    if (Array.isArray(category?.azkar)) return category.azkar;
    if (Array.isArray(category?.items)) return category.items;
    return [];
}

function getRepeatTarget(item) {
    return Math.max(1, Number(item?.repeatTarget ?? item?.repeat ?? item?.count ?? 1) || 1);
}

function createLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeArabicSearch(value = '') {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/\s+/g, ' ');
}

export function formatAzkarCount(count) {
    const value = Number(count) || 0;
    if (value === 0) return 'لا أذكار';
    if (value === 1) return 'ذكر واحد';
    if (value === 2) return 'ذكران';
    if (value >= 3 && value <= 10) return `${value} أذكار`;
    return `${value} ذكرًا`;
}

function formatRemainingCount(count) {
    const value = Number(count) || 0;
    if (value <= 0) return 'اكتمل الورد';
    if (value === 1) return 'باقي ذكر واحد';
    if (value === 2) return 'باقي ذكران';
    if (value >= 3 && value <= 10) return `باقي ${value} أذكار`;
    return `باقي ${value} ذكرًا`;
}

function calculateCategoryProgress(category, progressMap = {}) {
    const items = getCategoryItems(category);
    const totalItems = items.length;
    const completedItems = items.reduce((count, item, index) => {
        const target = getRepeatTarget(item);
        const current = Number(progressMap[index]) || 0;
        return count + (current >= target ? 1 : 0);
    }, 0);
    const totalRepeats = items.reduce((sum, item) => sum + getRepeatTarget(item), 0);
    const completedRepeats = items.reduce((sum, item, index) => {
        const target = getRepeatTarget(item);
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
        progressLabelReadable: `${completedItems} من ${totalItems}`,
        itemCountLabel: formatAzkarCount(totalItems),
        repeatProgressLabel: `${completedRepeats}/${totalRepeats}`,
        remainingLabel: formatRemainingCount(remainingItems),
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

    if (context.key === 'morning') return ['morning', 'prayer', 'evening', 'general'];
    if (context.key === 'evening' || context.key === 'late-night') return ['evening', 'prayer', 'morning', 'general'];
    return ['prayer', 'morning', 'evening', 'general'];
}

function getHomeResumePeriod() {
    const context = getCurrentTimeContext();
    if (context.key === 'morning') return 'morning';
    if (context.key === 'evening' || context.key === 'late-night') return 'evening';
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
        const hasActivity = Array.isArray(historyState.dailyCompletions?.[dateKey])
            && historyState.dailyCompletions[dateKey].length > 0;

        if (hasActivity) {
            activeDays += 1;
            if (index === streakDays) streakDays += 1;
        }
    }

    return { activeDays, streakDays, ratio: activeDays / 7 };
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

function getPeriodMeta(category) {
    return PERIOD_META[category?.period || 'general'] || PERIOD_META.general;
}

function normalizeCategory(category) {
    return {
        ...category,
        azkar: getCategoryItems(category)
    };
}

function buildSearchText(category) {
    const items = getCategoryItems(category);
    const values = [
        category.title,
        category.description,
        category.periodLabel,
        category.period,
        ...items.flatMap(item => [item.text, item.zekr, item.reference, item.fadl])
    ];
    return normalizeArabicSearch(values.filter(Boolean).join(' '));
}

function enrichCategory(categoryInput, progressMap, historyState, sessionState, preferences) {
    const category = normalizeCategory(categoryInput);
    const progress = calculateCategoryProgress(category, progressMap);
    const periodMeta = getPeriodMeta(category);
    const todayCompleted = getTodayCompletedSlugs(historyState);
    const timeContext = getCurrentTimeContext();
    const suggestedRank = buildSuggestedRank(category);
    const isRecommendedNow = suggestedRank === 0 && category.period === timeContext.primaryPeriod;
    const favoriteSlugs = Array.isArray(preferences.favoriteSlugs) ? preferences.favoriteSlugs : [];

    return {
        ...category,
        progressMap,
        progress,
        periodLabel: periodMeta.label,
        periodIcon: periodMeta.icon,
        tone: periodMeta.tone,
        suggestedRank,
        timeContextKey: timeContext.key,
        timeContextLabel: timeContext.label,
        isRecommendedNow,
        categoryStateLabel: progress.isCompleted
            ? 'مكتمل'
            : isRecommendedNow
                ? 'مستحب الآن'
                : '',
        categoryStateKind: progress.isCompleted
            ? 'complete'
            : isRecommendedNow
                ? 'now'
                : '',
        isLastVisited: historyState.lastVisitedSlug === category.slug,
        isActiveSession: sessionState.activeCategorySlug === category.slug,
        wasCompletedToday: todayCompleted.includes(category.slug),
        isFavorite: favoriteSlugs.includes(category.slug),
        reminderHint: preferences.reminderEnabled && preferences.reminderWindow !== 'off'
            ? getReminderMeta(preferences).shortLabel
            : '',
        estimatedMinutesLabel: `${Number(category.estimatedMinutes || 3)} دقائق`,
        searchText: buildSearchText({ ...category, periodLabel: periodMeta.label })
    };
}

async function getEnrichedCategories() {
    const catalog = await getAzkarCatalog();
    const progressMap = azkarProgressStore.getMap();
    const historyState = azkarHistoryStore.getState();
    const sessionState = azkarSessionStore.getState();
    const preferences = azkarPreferencesStore.getState();
    const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];

    return categories
        .map(category => enrichCategory(category, progressMap[category.slug] || {}, historyState, sessionState, preferences))
        .sort((left, right) => compareCategoryTuples(buildSortingTuple(left, preferences), buildSortingTuple(right, preferences)));
}

export async function getAzkarCategorySummaries() {
    return getEnrichedCategories();
}

export async function getAzkarCategoryViewModel(categoryKey) {
    const category = await getAzkarCategoryByKey(categoryKey);
    if (!category) return null;

    const normalizedCategory = normalizeCategory(category);
    const historyState = azkarHistoryStore.getState();
    const sessionState = azkarSessionStore.getState();
    const preferences = azkarPreferencesStore.getState();
    const categoryProgressMap = azkarProgressStore.getMap()[normalizedCategory.slug] || {};
    const enrichedCategory = enrichCategory(normalizedCategory, categoryProgressMap, historyState, sessionState, preferences);
    const firstIncompleteIndex = enrichedCategory.azkar.findIndex((item, index) => {
        const current = Number(categoryProgressMap[index]) || 0;
        const target = getRepeatTarget(item);
        return current < target;
    });

    return {
        ...enrichedCategory,
        activeItemIndex: sessionState.activeCategorySlug === enrichedCategory.slug && Number.isInteger(sessionState.activeItemIndex)
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
            ? candidate.progress.remainingLabel
            : 'ابدأ هذا الورد الآن.';

    return {
        slug: candidate.slug,
        title: candidate.title,
        description: candidate.description,
        estimatedMinutes: candidate.estimatedMinutes,
        progressLabel: candidate.progress.progressLabel,
        progressLabelReadable: candidate.progress.progressLabelReadable,
        completionRatio: candidate.progress.itemCompletionRatio,
        helperText,
        periodLabel: candidate.periodLabel,
        tone: candidate.tone,
        icon: candidate.periodIcon || candidate.icon || 'fa-book-open',
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

    categories.forEach((categoryInput) => {
        const category = normalizeCategory(categoryInput);
        const periodMeta = getPeriodMeta(category);
        const categoryProgressMap = progressState[category.slug] || {};
        category.azkar.forEach((item, index) => {
            const itemId = item.id || `${category.slug}-${index + 1}`;
            const target = getRepeatTarget(item);
            const current = Number(categoryProgressMap[index]) || 0;
            itemMap.set(itemId, {
                itemId,
                categorySlug: category.slug,
                categoryTitle: category.title,
                categoryPeriodLabel: periodMeta.label,
                categoryAccentTone: category.accentTone || periodMeta.tone,
                tone: periodMeta.tone,
                accentTone: category.accentTone || periodMeta.tone,
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

export async function getAzkarPrimaryActionViewModel() {
    const categories = await getAzkarCategorySummaries();
    if (!categories.length) return null;

    const timeContext = getCurrentTimeContext();
    const primary = categories.find(category => category.isRecommendedNow && !category.progress.isCompleted)
        || categories.find(category => category.period === timeContext.primaryPeriod && !category.progress.isCompleted)
        || categories.find(category => !category.progress.isCompleted)
        || categories[0];

    if (!primary) return null;

    const hasProgress = primary.progress.completedItems > 0 && !primary.progress.isCompleted;
    const actionLabel = primary.progress.isCompleted
        ? `راجع ${primary.title}`
        : hasProgress
            ? `تابع ${primary.title}`
            : `ابدأ ${primary.title}`;

    return {
        slug: primary.slug,
        title: actionLabel,
        helperText: `${primary.progress.progressLabelReadable} • ${primary.progress.itemCountLabel}`,
        description: primary.description,
        periodLabel: primary.periodLabel,
        icon: primary.periodIcon || primary.icon || 'fa-sparkles',
        tone: primary.tone,
        accentTone: primary.accentTone || primary.tone,
        timeContextLabel: timeContext.label,
        progressLabel: primary.progress.progressLabelReadable,
        itemCountLabel: primary.progress.itemCountLabel,
        isCompleted: primary.progress.isCompleted
    };
}

export async function getAzkarCatalogSurfaceViewModel({ filterKey = 'all', query = '' } = {}) {
    const categories = await getAzkarCategorySummaries();
    const primaryAction = await getAzkarPrimaryActionViewModel();
    const safeFilter = AZKAR_FILTERS.some(filter => filter.key === filterKey) ? filterKey : 'all';
    const normalizedQuery = normalizeArabicSearch(query);
    const preferences = azkarPreferencesStore.getState();

    const filteredCategories = categories.filter(category => {
        if (safeFilter === 'favorites') {
            const itemIds = new Set(preferences.favoriteItemIds || []);
            return category.isFavorite || category.azkar.some(item => itemIds.has(item.id));
        }
        if (safeFilter !== 'all' && category.period !== safeFilter) return false;
        if (normalizedQuery && !category.searchText.includes(normalizedQuery)) return false;
        return true;
    });

    return {
        filters: AZKAR_FILTERS,
        activeFilter: safeFilter,
        primaryAction,
        categories: filteredCategories,
        allCategories: categories,
        preferences
    };
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
        ? candidate.progress.remainingLabel
        : `${candidate.title} غير مكتملة حتى الآن.`;

    return {
        slug: candidate.slug,
        title: candidate.title,
        actionTitle: hasStarted ? `أكمل ${candidate.title}` : `ابدأ ${candidate.title}`,
        actionLabel: hasStarted ? 'تابع الورد' : 'ابدأ الورد',
        helperText,
        periodLabel: candidate.periodLabel,
        accentTone: candidate.accentTone || candidate.tone,
        icon: candidate.periodIcon || candidate.icon || 'fa-book-open',
        completionRatio: candidate.progress.itemCompletionRatio
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

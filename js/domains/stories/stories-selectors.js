import { getStorageDateKey } from '../../services/storage/storage-access.js';
import { getAllStories, getStoryByKey, getStoryCategoryBySlug, getStoriesCatalog } from './stories-repository.js';
import { searchStories } from './stories-search-index.js';
import { storiesHistoryStore } from './stories-history-store.js';
import { storiesPreferencesStore } from './stories-preferences-store.js';
import { storiesSessionStore } from './stories-session-store.js';

async function getStoryOfTheDay() {
  const stories = await getAllStories();
  if (!stories.length) return null;
  const dateSeed = (getStorageDateKey() || new Date().toISOString().slice(0, 10))
    .replace(/-/g, '')
    .split('')
    .reduce((sum, digit) => sum + Number(digit || 0), 0);
  return stories[dateSeed % stories.length] || stories[0];
}


function getCurrentStreak(dailyVisits = {}) {
  const dates = Object.keys(dailyVisits).sort();
  if (!dates.length) return 0;
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    const visits = Array.isArray(dailyVisits[key]) ? dailyVisits[key] : [];
    if (!visits.length) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function clampCount(value, min = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.round(numeric));
}

function getStoryCardMood(category) {
  switch (category.group) {
    case 'prophets':
      return 'ثبات وهداية';
    case 'companions':
      return 'قدوة وعزيمة';
    default:
      return 'عبرة يومية';
  }
}

function getCardBadge(category, history, preferences) {
  const hasFavorite = category.stories.some((story) => preferences.favoriteStoryKeys.includes(story.storyKey));
  if (preferences.pinnedCategorySlugs.includes(category.slug)) return 'مثبتة';
  if (history.lastVisitedCategorySlug === category.slug) return 'أكمل القراءة';
  if (hasFavorite) return 'تحتوي مفضلات';
  if (category.isFeatured) return 'مقترحة';
  return 'قصص';
}

function getSourceBadge(category) {
  switch (category.group) {
    case 'prophets':
      return 'قصص قرآنية';
    case 'companions':
      return 'سير ملهمة';
    default:
      return 'عبر يومية';
  }
}

function getGroupLabel(group) {
  switch (group) {
    case 'prophets':
      return 'هداية وثبات';
    case 'companions':
      return 'سير وقدوة';
    case 'morals':
    default:
      return 'عبر عملية';
  }
}

async function getRecentStories(limit = 4) {
  const history = storiesHistoryStore.getState();
  const stories = await Promise.all(
    history.recentStoryKeys.map((storyKey) => getStoryByKey(storyKey))
  );

  return stories
    .filter(Boolean)
    .slice(0, limit)
    .map((story) => ({
      storyKey: story.storyKey,
      categorySlug: story.categorySlug,
      title: story.title,
      excerpt: story.excerpt,
      categoryTitle: story.categoryTitle,
      readingMinutes: story.readingMinutes,
      source: story.source,
      lesson: story.lesson
    }));
}


async function getPinnedCategoriesViewModel(limit = 4) {
  const preferences = storiesPreferencesStore.getState();
  const catalog = await getStoriesCatalog();

  return catalog
    .filter((category) => preferences.pinnedCategorySlugs.includes(category.slug))
    .slice(0, limit)
    .map((category) => ({
      slug: category.slug,
      title: category.title,
      description: category.description,
      icon: category.icon,
      accentTone: category.accentTone,
      storyCount: category.storyCount,
      estimatedMinutes: category.estimatedMinutes,
      previewTitle: category.previewTitle,
      isPinned: true
    }));
}


async function buildRecommendedStories(limit = 4) {
  const history = storiesHistoryStore.getState();
  const preferences = storiesPreferencesStore.getState();
  const recommendations = [];
  const seen = new Set();

  const pushStory = (story, reason = '') => {
    if (!story || seen.has(story.storyKey)) return;
    seen.add(story.storyKey);
    recommendations.push({
      storyKey: story.storyKey,
      categorySlug: story.categorySlug,
      title: story.title,
      excerpt: story.excerpt,
      categoryTitle: story.categoryTitle,
      readingMinutes: story.readingMinutes,
      reason,
      isFavorite: preferences.favoriteStoryKeys.includes(story.storyKey),
      isBookmarked: history.bookmarkedStoryKeys.includes(story.storyKey)
    });
  };

  const lastStory = history.lastVisitedStoryKey
    ? await getStoryByKey(history.lastVisitedStoryKey)
    : null;

  if (lastStory) {
    const category = await getStoryCategoryBySlug(lastStory.categorySlug);
    const index = category?.stories.findIndex((story) => story.storyKey === lastStory.storyKey) ?? -1;
    if (category && index >= 0) {
      pushStory(category.stories[index + 1], 'أكمل السلسلة');
      pushStory(category.stories[index - 1], 'ارجع للقصة السابقة');
    }
  }

  for (const slug of preferences.pinnedCategorySlugs) {
    const category = await getStoryCategoryBySlug(slug);
    if (!category) continue;
    pushStory(category.stories[0], 'من التصنيفات المثبتة');
  }

  for (const storyKey of preferences.favoriteStoryKeys) {
    pushStory(await getStoryByKey(storyKey), 'من مفضلتك');
  }

  for (const storyKey of history.bookmarkedStoryKeys) {
    pushStory(await getStoryByKey(storyKey), 'قصة محفوظة');
  }

  pushStory(await getStoryOfTheDay(), 'قصة اليوم');

  const catalog = await getStoriesCatalog();
  catalog
    .filter((category) => category.isFeatured)
    .forEach((category) => pushStory(category.stories[0], 'مقترحة لك'));

  return recommendations.slice(0, limit);
}


async function getWeeklyReflectionViewModel() {
  const history = storiesHistoryStore.getState();
  const entries = Object.entries(history.dailyVisits || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  const categoryCounts = new Map();
  let totalVisits = 0;

  for (const [, storyKeys] of entries) {
    for (const storyKey of storyKeys || []) {
      const story = await getStoryByKey(storyKey);
      if (!story) continue;
      totalVisits += 1;
      categoryCounts.set(story.categorySlug, (categoryCounts.get(story.categorySlug) || 0) + 1);
    }
  }

  const [topSlug, topCount] = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ['', 0];
  const topCategory = topSlug ? await getStoryCategoryBySlug(topSlug) : null;
  const label = topCategory
    ? `الأكثر حضورًا هذا الأسبوع: ${topCategory.title}`
    : 'ابدأ هذا الأسبوع بقصة قصيرة واحدة كل يوم.';
  const detail = topCategory
    ? `عدت إلى هذا التصنيف ${clampCount(topCount)} مرات. استمر على نفس الوتيرة الهادئة.`
    : 'التكرار الهادئ هو أفضل طريق لبناء عادة القراءة اليومية.';

  return {
    activeDays: entries.filter(([, values]) => Array.isArray(values) && values.length > 0).length,
    totalVisits,
    title: 'تأمل الأسبوع',
    label,
    detail,
    mood: topCategory ? getStoryCardMood(topCategory) : 'بداية جديدة'
  };
}


export async function getStoriesCatalogViewModel({ filter = 'all', query = '' } = {}) {
  const history = storiesHistoryStore.getState();
  const preferences = storiesPreferencesStore.getState();
  const normalizedQuery = String(query || '').trim();
  const matchedStoryKeys = normalizedQuery ? new Set(await searchStories(normalizedQuery)) : null;
  const currentFilter = ['all', 'featured', 'favorites', 'recent', 'pinned'].includes(filter) ? filter : 'all';
  const catalog = await getStoriesCatalog();

  const cards = catalog
    .map((category) => {
      const favoriteCount = category.stories.filter((story) => preferences.favoriteStoryKeys.includes(story.storyKey)).length;
      const recentCount = category.stories.filter((story) => history.recentStoryKeys.includes(story.storyKey)).length;
      const readCount = category.stories.filter((story) => history.recentStoryKeys.includes(story.storyKey) || history.bookmarkedStoryKeys.includes(story.storyKey)).length;
      const matchesQuery = matchedStoryKeys
        ? category.stories.some((story) => matchedStoryKeys.has(story.storyKey)) || `${category.title} ${category.description}`.includes(normalizedQuery)
        : true;
      const isPinned = preferences.pinnedCategorySlugs.includes(category.slug);
      const progressRatio = category.storyCount ? Math.min(1, readCount / category.storyCount) : 0;
      return {
        slug: category.slug,
        title: category.title,
        description: category.description,
        icon: category.icon,
        accentTone: category.accentTone,
        estimatedMinutes: category.estimatedMinutes,
        storyCount: category.storyCount,
        previewTitle: category.previewTitle,
        previewExcerpt: category.previewExcerpt,
        badgeLabel: getCardBadge(category, history, preferences),
        sourceBadge: getSourceBadge(category),
        isFeatured: category.isFeatured,
        favoriteCount,
        recentCount,
        readCount,
        progressRatio,
        progressPercent: Math.round(progressRatio * 100),
        progressLabel: readCount ? `تم فتح ${readCount} من ${category.storyCount}` : 'ابدأ بقصة قصيرة من هذا التصنيف',
        matchesQuery,
        isResume: history.lastVisitedCategorySlug === category.slug,
        isPinned,
        moodLabel: getStoryCardMood(category),
        groupLabel: getGroupLabel(category.group),
        lastOpenedLabel: history.lastVisitedCategorySlug === category.slug ? 'آخر قراءة' : recentCount ? 'زُرته مؤخرًا' : '',
        estimatedLabel: `${Number(category.estimatedMinutes || 1)} دقائق`,
        featuredLabel: category.isFeatured ? 'مختارة' : ''
      };
    })
    .filter((card) => {
      if (!card.matchesQuery) return false;
      if (currentFilter === 'featured' && !card.isFeatured) return false;
      if (currentFilter === 'favorites' && card.favoriteCount === 0) return false;
      if (currentFilter === 'recent' && card.recentCount === 0) return false;
      if (currentFilter === 'pinned' && !card.isPinned) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.isResume !== b.isResume) return a.isResume ? -1 : 1;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.favoriteCount !== b.favoriteCount) return b.favoriteCount - a.favoriteCount;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.storyCount - b.storyCount;
    });

  return {
    filter: currentFilter,
    query: normalizedQuery,
    cards,
    summaryText: normalizedQuery
      ? `نتائج البحث: ${cards.length}`
      : `المتاح الآن: ${cards.length} تصنيف`
  };
}

export async function getStoriesResumeViewModel() {
  const history = storiesHistoryStore.getState();
  const session = storiesSessionStore.getState();
  const storyKey = session.activeStoryKey || history.lastVisitedStoryKey;
  const story = storyKey ? await getStoryByKey(storyKey) : null;
  if (!story) return null;
  return {
    storyKey: story.storyKey,
    categorySlug: story.categorySlug,
    title: story.title,
    subtitle: story.categoryTitle,
    helperText: 'تابع من حيث توقفت دون أن تبحث من جديد.',
    meta: `${story.readingMinutes} دقائق قراءة تقريبًا`,
    actionLabel: 'تابع القراءة'
  };
}

export async function getStoryOfTheDayViewModel() {
  const story = await getStoryOfTheDay();
  if (!story) return null;
  return {
    storyKey: story.storyKey,
    categorySlug: story.categorySlug,
    title: 'قصة اليوم',
    storyTitle: story.title,
    excerpt: story.excerpt,
    categoryTitle: story.categoryTitle,
    actionLabel: 'افتح القصة'
  };
}

export async function getStoriesInsightsViewModel() {
  const history = storiesHistoryStore.getState();
  const preferences = storiesPreferencesStore.getState();
  const activeDays = Object.keys(history.dailyVisits || {}).slice(-7).filter((dateKey) => Array.isArray(history.dailyVisits[dateKey]) && history.dailyVisits[dateKey].length > 0).length;
  const streak = getCurrentStreak(history.dailyVisits || {});
  const catalog = await getStoriesCatalog();
  return {
    activeDays,
    streak,
    favoriteCount: preferences.favoriteStoryKeys.length,
    bookmarkCount: history.bookmarkedStoryKeys.length,
    pinnedCount: preferences.pinnedCategorySlugs.length,
    featuredCount: catalog.filter((category) => category.isFeatured).length,
    hint: activeDays >= 4
      ? 'القراءة المنتظمة هذا الأسبوع ممتازة، استمر على نفس الهدوء.'
      : 'اختر قصة قصيرة واحدة يوميًا، الاستمرار أهم من الكثرة.'
  };
}

export async function getStoriesRetentionViewModel() {
  return {
    recentStories: await getRecentStories(),
    pinnedCategories: await getPinnedCategoriesViewModel(),
    recommendations: await buildRecommendedStories(),
    weeklyReflection: await getWeeklyReflectionViewModel()
  };
}

export async function getStoriesReaderViewModel(categoryKey, storyKey = '') {
  const category = await getStoryCategoryBySlug(categoryKey);
  if (!category) return null;

  const history = storiesHistoryStore.getState();
  const preferences = storiesPreferencesStore.getState();
  const session = storiesSessionStore.getState();
  const targetStoryKey = storyKey || session.activeStoryKey || history.lastVisitedStoryKey || category.stories[0]?.storyKey || '';
  const activeIndex = Math.max(0, category.stories.findIndex((story) => story.storyKey === targetStoryKey));
  const activeStory = category.stories[activeIndex] || category.stories[0] || null;
  const nextStory = category.stories[activeIndex + 1] || null;
  const previousStory = activeIndex > 0 ? category.stories[activeIndex - 1] : null;
  const storyList = category.stories.map((story) => ({
    ...story,
    isActive: activeStory?.storyKey === story.storyKey,
    isFavorite: preferences.favoriteStoryKeys.includes(story.storyKey),
    isBookmarked: history.bookmarkedStoryKeys.includes(story.storyKey)
  }));

  const recommendedNext = (await buildRecommendedStories(3))
    .filter((story) => story.storyKey !== activeStory?.storyKey)
    .slice(0, 3);

  const progressCurrent = activeIndex + 1;
  const progressPercent = category.storyCount ? Math.max(1, Math.round((progressCurrent / category.storyCount) * 100)) : 0;
  const remainingStoriesCount = Math.max(0, category.storyCount - progressCurrent);
  const estimatedRemainingMinutes = Math.max(1, Math.round((remainingStoriesCount / Math.max(category.storyCount, 1)) * Number(category.estimatedMinutes || 1)));

  return {
    slug: category.slug,
    title: category.title,
    description: category.description,
    accentTone: category.accentTone,
    storyCount: category.storyCount,
    estimatedMinutes: category.estimatedMinutes,
    activeStoryKey: activeStory?.storyKey || '',
    focusMode: preferences.focusMode,
    largeText: preferences.largeText,
    isPinned: preferences.pinnedCategorySlugs.includes(category.slug),
    progressCurrent,
    progressPercent,
    remainingStoriesCount,
    estimatedRemainingMinutes,
    moodLabel: getStoryCardMood(category),
    groupLabel: getGroupLabel(category.group),
    activeStory: activeStory ? {
      ...activeStory,
      isFavorite: preferences.favoriteStoryKeys.includes(activeStory.storyKey),
      isBookmarked: history.bookmarkedStoryKeys.includes(activeStory.storyKey)
    } : null,
    previousStory,
    nextStory,
    storyList,
    relatedStories: storyList.filter((story) => !story.isActive).slice(0, 4),
    recommendedNext
  };
}

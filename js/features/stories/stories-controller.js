import { copyToClipboard, shareText, showToast } from '../../app/shell/app-shell.js';
import { closeSubview, openSubview, registerSubviewCloseHandler } from '../../app/ui/subview-manager.js';
import { pushHashState, scrollToTop } from '../../services/platform/browser-navigation.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { cacheStoriesDom } from './stories-dom.js';
import { appendTrustedHTML, clearElement } from '../../shared/dom/dom-helpers.js';
import { renderStoriesCatalog, renderStoriesReader, renderStoriesShell } from './stories-renderers.js';
import { getStoryByKey, getStoryCategoryBySlug } from '../../domains/stories/stories-repository.js';
import { storiesSessionStore } from '../../domains/stories/stories-session-store.js';
import { storiesPreferencesStore } from '../../domains/stories/stories-preferences-store.js';
import { storiesHistoryStore } from '../../domains/stories/stories-history-store.js';
import {
  getStoriesCatalogViewModel,
  getStoriesResumeViewModel,
  getStoryOfTheDayViewModel,
  getStoriesInsightsViewModel,
  getStoriesRetentionViewModel,
  getStoriesReaderViewModel
} from '../../domains/stories/stories-selectors.js';

const state = {
  initialized: false,
  dom: null,
  filter: 'all',
  query: '',
  inputBound: false
};

function ensureDom() {
  state.dom = cacheStoriesDom();
  return state.dom;
}

async function renderShell() {
  const dom = ensureDom();
  if (!dom.root) return false;
  const [resume, storyOfDay, insights, retention] = await Promise.all([
    getStoriesResumeViewModel(),
    getStoryOfTheDayViewModel(),
    getStoriesInsightsViewModel(),
    getStoriesRetentionViewModel()
  ]);

  appendTrustedHTML(dom.root, renderStoriesShell({
    resume,
    storyOfDay,
    insights,
    retention,
    activeFilter: state.filter,
    searchQuery: state.query
  }));
  state.dom = cacheStoriesDom();
  return true;
}

async function renderCatalogView() {
  const dom = ensureDom();
  const cardsContainer = document.getElementById('storiesCardsGrid');
  if (!cardsContainer || !dom.summary) return;
  const vm = await getStoriesCatalogViewModel({ filter: state.filter, query: state.query });
  appendTrustedHTML(cardsContainer, renderStoriesCatalog(vm.cards));
  dom.summary.textContent = vm.summaryText;
}

function updateReaderClasses(sessionVm) {
  const dom = ensureDom();
  if (!dom.root) return;
  dom.root.classList.toggle('stories-root--focus-mode', Boolean(sessionVm?.focusMode));
  dom.root.classList.toggle('stories-root--large-text', Boolean(sessionVm?.largeText));
}

async function renderReaderView(slug, storyKey = '') {
  const dom = ensureDom();
  if (!dom.content) return false;
  const vm = await getStoriesReaderViewModel(slug, storyKey || storiesSessionStore.getState().activeStoryKey);
  if (!vm) return false;
  appendTrustedHTML(dom.content, renderStoriesReader(vm));
  openSubview('storyCategoryContent');
  updateReaderClasses(vm);
  return true;
}

function bindRootEvents() {
  const dom = ensureDom();
  if (!dom.root || state.inputBound) return;
  dom.root.addEventListener('input', handleRootInput);
  state.inputBound = true;
}

async function openStoryReader(categorySlug, storyKey = '') {
  const category = await getStoryCategoryBySlug(categorySlug);
  if (!category) return;
  const resolvedStoryKey = storyKey || category.stories[0]?.storyKey || '';
  await storiesSessionStore.openCategory(category, resolvedStoryKey);
  storiesHistoryStore.markVisited(category, resolvedStoryKey);
  await renderSection({ preserveSession: true });
  pushHashState({ section: 'stories', sub: true }, '#stories-reader');
  scrollToTop();
}

export async function closeStoryReader() {
  closeSubview('storyCategoryContent');
  storiesSessionStore.reset();
  replaceSectionRoute('stories', 'قصص وعبر');
  await renderSection();
}

async function openSpecificStory(storyKey) {
  const story = await getStoryByKey(storyKey);
  if (!story) return;
  await storiesSessionStore.setActiveStory(story.categorySlug, story.storyKey);
  storiesHistoryStore.markVisited(story.categorySlug, story.storyKey);
  await renderSection({ preserveSession: true });
  scrollToTop();
}

function formatStoryShareText(story) {
  if (!story) return '';
  return `${story.title}\n\n${story.story}\n\n${story.lesson ? `العبرة: ${story.lesson}\n` : ''}${story.source ? `المصدر: ${story.source}` : ''}`.trim();
}

async function rerenderWithSessionAwareness() {
  await renderSection({ preserveSession: Boolean(storiesSessionStore.getState().activeCategorySlug) });
}

export async function dispatchStoriesAction(action, payload = {}) {
  const value = payload.value || '';
  const categorySlug = payload.categorySlug || '';

  switch (action) {
    case 'open-category':
      await openStoryReader(value);
      return true;
    case 'close-category':
      await closeStoryReader();
      return true;
    case 'open-story':
      await openSpecificStory(value);
      return true;
    case 'continue-story':
    case 'open-story-of-day':
      await openStoryReader(categorySlug, value);
      return true;
    case 'set-filter':
      state.filter = value || 'all';
      await renderSection();
      return true;
    case 'clear-search':
      state.query = '';
      await renderSection();
      return true;
    case 'toggle-favorite-story':
      storiesPreferencesStore.toggleFavoriteStory(value);
      await rerenderWithSessionAwareness();
      return true;
    case 'toggle-bookmark':
      storiesHistoryStore.toggleBookmark(value);
      await rerenderWithSessionAwareness();
      return true;
    case 'toggle-pin-category':
      storiesPreferencesStore.togglePinnedCategory(value);
      await rerenderWithSessionAwareness();
      return true;
    case 'toggle-focus-mode': {
      const current = storiesPreferencesStore.getState();
      storiesPreferencesStore.update({ focusMode: !current.focusMode });
      await renderSection({ preserveSession: true });
      return true;
    }
    case 'toggle-large-text': {
      const current = storiesPreferencesStore.getState();
      storiesPreferencesStore.update({ largeText: !current.largeText });
      await renderSection({ preserveSession: true });
      return true;
    }
    case 'share-story': {
      const story = await getStoryByKey(value);
      if (story) shareText(formatStoryShareText(story));
      return true;
    }
    case 'copy-story': {
      const story = await getStoryByKey(value);
      if (story) {
        copyToClipboard(formatStoryShareText(story));
        showToast('تم نسخ القصة.', 'success');
      }
      return true;
    }
    default:
      return false;
  }
}

export function handleStoriesActionTarget(actionTarget) {
  if (!actionTarget) return false;
  return dispatchStoriesAction(actionTarget.dataset.storiesAction, {
    value: actionTarget.dataset.storiesValue,
    categorySlug: actionTarget.dataset.storiesCategory
  });
}

async function handleRootInput(event) {
  if (!event.target.matches('#storiesSearchInput')) return;
  state.query = String(event.target.value || '').trim();
  await renderCatalogView();
  const clearButton = state.dom?.root?.querySelector('.stories-search__clear');
  if (clearButton) {
    clearButton.classList.toggle('is-hidden', !state.query);
  }
}

export async function initStoriesSection() {
  if (state.initialized) return;
  renderShell();
  bindRootEvents();
  registerSubviewCloseHandler('storyCategoryContent', () => {
    const dom = ensureDom();
    if (dom.content) {
      clearElement(dom.content);
    }
    dom.root?.classList.remove('stories-root--focus-mode', 'stories-root--large-text');
  });
  state.initialized = true;
}

export async function renderSection(options = {}) {
  renderShell();
  bindRootEvents();
  await renderCatalogView();
  const sessionState = storiesSessionStore.getState();
  const sessionSlug = options.preserveSession ? sessionState.activeCategorySlug : '';
  if (sessionSlug) {
    renderReaderView(sessionSlug, sessionState.activeStoryKey);
  }
}

export function renderStoriesSection() {
  return renderSection({ preserveSession: Boolean(storiesSessionStore.getState().activeCategorySlug) });
}

export function openStoryCategory(categoryKey, storyKey = '') {
  return openStoryReader(categoryKey, storyKey);
}

export function resetStoriesView() {
  closeSubview('storyCategoryContent');
}

export const storiesController = {
  initStoriesSection,
  renderSection,
  renderStoriesSection,
  openStoryCategory,
  closeStoryReader,
  resetStoriesView,
  handleActionTarget: handleStoriesActionTarget,
  dispatchAction: dispatchStoriesAction
};

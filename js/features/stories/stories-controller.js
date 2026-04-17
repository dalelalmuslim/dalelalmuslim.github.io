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

function renderShell() {
  const dom = ensureDom();
  if (!dom.root) return false;
  appendTrustedHTML(dom.root, renderStoriesShell({
    resume: getStoriesResumeViewModel(),
    storyOfDay: getStoryOfTheDayViewModel(),
    insights: getStoriesInsightsViewModel(),
    retention: getStoriesRetentionViewModel(),
    activeFilter: state.filter,
    searchQuery: state.query
  }));
  state.dom = cacheStoriesDom();
  return true;
}

function renderCatalogView() {
  const dom = ensureDom();
  const cardsContainer = document.getElementById('storiesCardsGrid');
  if (!cardsContainer || !dom.summary) return;
  const vm = getStoriesCatalogViewModel({ filter: state.filter, query: state.query });
  appendTrustedHTML(cardsContainer, renderStoriesCatalog(vm.cards));
  dom.summary.textContent = vm.summaryText;
}

function updateReaderClasses(sessionVm) {
  const dom = ensureDom();
  if (!dom.root) return;
  dom.root.classList.toggle('stories-root--focus-mode', Boolean(sessionVm?.focusMode));
  dom.root.classList.toggle('stories-root--large-text', Boolean(sessionVm?.largeText));
}

function renderReaderView(slug, storyKey = '') {
  const dom = ensureDom();
  if (!dom.content) return false;
  const vm = getStoriesReaderViewModel(slug, storyKey || storiesSessionStore.getState().activeStoryKey);
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

function openStoryReader(categorySlug, storyKey = '') {
  const category = getStoryCategoryBySlug(categorySlug);
  if (!category) return;
  const resolvedStoryKey = storyKey || category.stories[0]?.storyKey || '';
  storiesSessionStore.openCategory(category, resolvedStoryKey);
  storiesHistoryStore.markVisited(category, resolvedStoryKey);
  renderSection({ preserveSession: true });
  pushHashState({ section: 'stories', sub: true }, '#stories-reader');
  scrollToTop();
}

export function closeStoryReader() {
  closeSubview('storyCategoryContent');
  storiesSessionStore.reset();
  replaceSectionRoute('stories', 'قصص وعبر');
  renderSection();
}

function openSpecificStory(storyKey) {
  const story = getStoryByKey(storyKey);
  if (!story) return;
  storiesSessionStore.setActiveStory(story.categorySlug, story.storyKey);
  storiesHistoryStore.markVisited(story.categorySlug, story.storyKey);
  renderSection({ preserveSession: true });
  scrollToTop();
}

function formatStoryShareText(story) {
  if (!story) return '';
  return `${story.title}\n\n${story.story}\n\n${story.lesson ? `العبرة: ${story.lesson}\n` : ''}${story.source ? `المصدر: ${story.source}` : ''}`.trim();
}

function rerenderWithSessionAwareness() {
  renderSection({ preserveSession: Boolean(storiesSessionStore.getState().activeCategorySlug) });
}

export function dispatchStoriesAction(action, payload = {}) {
  const value = payload.value || '';
  const categorySlug = payload.categorySlug || '';

  switch (action) {
    case 'open-category':
      openStoryReader(value);
      return true;
    case 'close-category':
      closeStoryReader();
      return true;
    case 'open-story':
      openSpecificStory(value);
      return true;
    case 'continue-story':
    case 'open-story-of-day':
      openStoryReader(categorySlug, value);
      return true;
    case 'set-filter':
      state.filter = value || 'all';
      renderSection();
      return true;
    case 'clear-search':
      state.query = '';
      renderSection();
      return true;
    case 'toggle-favorite-story':
      storiesPreferencesStore.toggleFavoriteStory(value);
      rerenderWithSessionAwareness();
      return true;
    case 'toggle-bookmark':
      storiesHistoryStore.toggleBookmark(value);
      rerenderWithSessionAwareness();
      return true;
    case 'toggle-pin-category':
      storiesPreferencesStore.togglePinnedCategory(value);
      rerenderWithSessionAwareness();
      return true;
    case 'toggle-focus-mode': {
      const current = storiesPreferencesStore.getState();
      storiesPreferencesStore.update({ focusMode: !current.focusMode });
      renderSection({ preserveSession: true });
      return true;
    }
    case 'toggle-large-text': {
      const current = storiesPreferencesStore.getState();
      storiesPreferencesStore.update({ largeText: !current.largeText });
      renderSection({ preserveSession: true });
      return true;
    }
    case 'share-story': {
      const story = getStoryByKey(value);
      if (story) shareText(formatStoryShareText(story));
      return true;
    }
    case 'copy-story': {
      const story = getStoryByKey(value);
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

function handleRootInput(event) {
  if (!event.target.matches('#storiesSearchInput')) return;
  state.query = String(event.target.value || '').trim();
  renderCatalogView();
  const clearButton = state.dom?.root?.querySelector('.stories-search__clear');
  if (clearButton) {
    clearButton.classList.toggle('is-hidden', !state.query);
  }
}

export function initStoriesSection() {
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

export function renderSection(options = {}) {
  renderShell();
  bindRootEvents();
  renderCatalogView();
  const sessionState = storiesSessionStore.getState();
  const sessionSlug = options.preserveSession ? sessionState.activeCategorySlug : '';
  if (sessionSlug) {
    renderReaderView(sessionSlug, sessionState.activeStoryKey);
  }
}

export function renderStoriesSection() {
  renderSection({ preserveSession: Boolean(storiesSessionStore.getState().activeCategorySlug) });
}

export function openStoryCategory(categoryKey, storyKey = '') {
  openStoryReader(categoryKey, storyKey);
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

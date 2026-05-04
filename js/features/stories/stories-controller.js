import { copyToClipboard, shareText, showToast } from '../../app/shell/app-shell.js';
import { closeSubview, openSubview, registerSubviewCloseHandler } from '../../app/ui/subview-manager.js';
import { appendTrustedHTML, clearElement } from '../../shared/dom/dom-helpers.js';
import { pushHashState, scrollToPosition, scrollToTop, getScrollY } from '../../services/platform/browser-navigation.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { cacheStoriesDom } from './stories-dom.js';
import {
  buildStoryShareText,
  renderEmptyState,
  renderErrorState,
  renderFilterChips,
  renderLoadingState,
  renderStoriesReader,
  renderStoriesShell,
  renderStoriesStream,
  renderStreamSummary
} from './stories-renderers.js';
import { STORIES_PAGE_SIZE, getStoriesReaderViewModel, getStoriesStreamViewModel } from '../../domains/stories/stories-selectors.js';
import { getStoryByKey } from '../../domains/stories/stories-repository.js';
import { storiesSessionStore } from '../../domains/stories/stories-session-store.js';

const state = {
  initialized: false,
  dom: null,
  filter: 'all',
  query: '',
  visibleCount: STORIES_PAGE_SIZE,
  currentContextKeys: [],
  inputDebounceTimer: null,
  rootEventsBound: false,
  renderRequestId: 0
};

function ensureDom() {
  state.dom = cacheStoriesDom();
  return state.dom;
}

function ensureShell() {
  const dom = ensureDom();
  if (!dom.root) return false;

  if (!dom.mainView || !dom.reader || !dom.searchInput || !dom.filterChips || !dom.summary || !dom.list) {
    appendTrustedHTML(dom.root, renderStoriesShell({ query: state.query }));
    state.dom = cacheStoriesDom();
  }

  return Boolean(state.dom?.root && state.dom?.mainView && state.dom?.reader && state.dom?.list);
}

function setSearchInputValue() {
  const input = ensureDom().searchInput;
  if (input && input.value !== state.query) {
    input.value = state.query;
  }

  const clearButton = state.dom?.root?.querySelector('.stories-clear-search');
  if (clearButton) {
    clearButton.classList.toggle('is-hidden', !state.query);
  }
}

async function renderStreamContent() {
  if (!ensureShell()) return false;

  const requestId = state.renderRequestId + 1;
  state.renderRequestId = requestId;

  const dom = ensureDom();
  appendTrustedHTML(dom.list, renderLoadingState('جاري تحميل القصص...'));

  try {
    const vm = await getStoriesStreamViewModel({
      filter: state.filter,
      query: state.query,
      visibleCount: state.visibleCount
    });

    if (requestId !== state.renderRequestId) return false;

    state.currentContextKeys = vm.allResultKeys;
    appendTrustedHTML(dom.filterChips, renderFilterChips(vm.tabs));
    appendTrustedHTML(dom.summary, renderStreamSummary(vm));
    appendTrustedHTML(dom.list, renderStoriesStream(vm));
    setSearchInputValue();
    return true;
  } catch (error) {
    appendTrustedHTML(dom.list, renderErrorState(error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل القصص.'));
    return false;
  }
}

async function renderReader(storyKey) {
  if (!ensureShell()) return false;

  const session = storiesSessionStore.getState();
  const dom = ensureDom();
  appendTrustedHTML(dom.reader, renderLoadingState('جاري تحميل القصة...'));

  try {
    const vm = await getStoriesReaderViewModel(storyKey, session.contextStoryKeys);
    if (!vm) {
      appendTrustedHTML(dom.reader, renderEmptyState('تعذر فتح القصة.', 'ارجع إلى قائمة القصص وحاول مرة أخرى.'));
      return false;
    }

    appendTrustedHTML(dom.reader, renderStoriesReader(vm));
    return true;
  } catch (error) {
    appendTrustedHTML(dom.reader, renderErrorState(error instanceof Error ? error.message : 'تعذر فتح القصة.'));
    return false;
  }
}

async function openStory(storyKey) {
  if (!storyKey) return false;

  storiesSessionStore.openReader({
    storyKey,
    contextStoryKeys: state.currentContextKeys,
    sourceFilter: state.filter,
    sourceQuery: state.query,
    sourceScrollY: getScrollY()
  });

  const rendered = await renderReader(storyKey);
  if (!rendered) return false;

  openSubview('storyCategoryContent');
  pushHashState({ section: 'stories', sub: true }, '#stories-reader');
  scrollToTop('auto');
  return true;
}

export async function closeStoryReader() {
  closeSubview('storyCategoryContent');
  return true;
}

async function openNextStory() {
  const session = storiesSessionStore.getState();
  const activeIndex = session.contextStoryKeys.indexOf(session.activeStoryKey);
  const nextStoryKey = activeIndex >= 0 ? session.contextStoryKeys[activeIndex + 1] : '';

  if (!nextStoryKey) {
    await closeStoryReader();
    return true;
  }

  storiesSessionStore.setActiveStory(nextStoryKey);
  await renderReader(nextStoryKey);
  scrollToTop('auto');
  return true;
}

async function copyStory(storyKey) {
  const story = await getStoryByKey(storyKey || storiesSessionStore.getState().activeStoryKey);
  if (!story) return false;

  copyToClipboard(buildStoryShareText(story));
  showToast('تم نسخ القصة.', 'success');
  return true;
}

async function shareStory(storyKey) {
  const story = await getStoryByKey(storyKey || storiesSessionStore.getState().activeStoryKey);
  if (!story) return false;

  shareText(buildStoryShareText(story));
  return true;
}

function scheduleQueryRender(value) {
  state.query = String(value || '').trim();
  state.visibleCount = STORIES_PAGE_SIZE;
  setSearchInputValue();

  if (state.inputDebounceTimer) {
    clearTimeout(state.inputDebounceTimer);
  }

  state.inputDebounceTimer = setTimeout(() => {
    state.inputDebounceTimer = null;
    renderStreamContent();
  }, 120);
}

function bindRootEvents() {
  const dom = ensureDom();
  if (!dom.root || state.rootEventsBound) return;

  dom.root.addEventListener('input', (event) => {
    if (!event.target.matches('#storiesSearchInput')) return;
    scheduleQueryRender(event.target.value);
  });

  state.rootEventsBound = true;
}

export async function dispatchStoriesAction(action, payload = {}) {
  const value = payload.value || '';

  switch (action) {
    case 'set-filter':
      state.filter = value || 'all';
      state.visibleCount = STORIES_PAGE_SIZE;
      await renderStreamContent();
      scrollToTop('smooth');
      return true;
    case 'clear-search':
      state.query = '';
      state.visibleCount = STORIES_PAGE_SIZE;
      await renderStreamContent();
      return true;
    case 'load-more':
      state.visibleCount += STORIES_PAGE_SIZE;
      await renderStreamContent();
      return true;
    case 'open-story':
      return openStory(value);
    case 'close-reader':
      return closeStoryReader();
    case 'next-story':
      return openNextStory();
    case 'copy-story':
      return copyStory(value);
    case 'share-story':
      return shareStory(value);
    case 'retry-load':
      await renderStreamContent();
      return true;
    default:
      return false;
  }
}

export function handleStoriesActionTarget(actionTarget) {
  if (!actionTarget) return false;
  return dispatchStoriesAction(actionTarget.dataset.storiesAction, {
    value: actionTarget.dataset.storiesValue || ''
  });
}

export async function initStoriesSection() {
  if (state.initialized) return;

  ensureShell();
  bindRootEvents();
  registerSubviewCloseHandler('storyCategoryContent', () => {
    const session = storiesSessionStore.getState();
    const dom = ensureDom();
    if (dom.reader) clearElement(dom.reader);
    storiesSessionStore.reset();
    replaceSectionRoute('stories', 'قصص وعبر');
    scrollToPosition(session.sourceScrollY || 0, 'auto');
  });

  state.initialized = true;
  await renderStreamContent();
}

export async function renderSection() {
  ensureShell();
  bindRootEvents();
  await renderStreamContent();
}

export function renderStoriesSection() {
  return renderSection();
}

export function openStoryCategory(categoryKey, storyKey = '') {
  state.filter = categoryKey || 'all';
  state.visibleCount = STORIES_PAGE_SIZE;
  return renderStreamContent().then(() => (storyKey ? openStory(storyKey) : true));
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

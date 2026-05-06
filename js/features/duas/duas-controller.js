import { closeSubview, openSubview, registerSubviewCloseHandler } from '../../app/ui/subview-manager.js';
import { pushHashState, scrollToTop } from '../../services/platform/browser-navigation.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { copyToClipboard, shareText } from '../../app/shell/app-shell.js';
import { cacheDuasDom } from './duas-dom.js';
import { appendTrustedHTML, clearElement } from '../../shared/dom/dom-helpers.js';
import {
  renderDuasCatalog,
  renderDuasErrorState,
  renderDuasLoadingState,
  renderDuasSession,
  renderDuasShell
} from './duas-renderers.js';
import { getDuaCategoryBySlug } from '../../domains/duas/duas-repository.js';
import { duasSessionStore } from '../../domains/duas/duas-session-store.js';
import { duasPreferencesStore } from '../../domains/duas/duas-preferences-store.js';
import { duasHistoryStore } from '../../domains/duas/duas-history-store.js';
import {
  getDailyDuaViewModel,
  getDuasCatalogViewModel,
  getDuasSessionViewModel
} from '../../domains/duas/duas-selectors.js';

const SESSION_PAGE_SIZE = 16;

const state = {
  initialized: false,
  dom: null,
  filter: 'all',
  query: '',
  inputBound: false,
  visibleSessionCount: SESSION_PAGE_SIZE,
  renderToken: 0
};

function ensureDom() {
  state.dom = cacheDuasDom();
  return state.dom;
}

function findDuaById(sessionVm, duaId) {
  const idNum = Number(duaId);
  if (!sessionVm || !Number.isFinite(idNum)) return null;
  return sessionVm.items.find((item) => item.id === idNum) || null;
}

function formatDuaForSharing(item) {
  if (!item?.text) return '';
  const reference = item.referenceText ? `\n\n${item.referenceText}` : '';
  return `${item.text}${reference}`;
}

async function renderShell(options = {}) {
  const dom = ensureDom();
  if (!dom.root) return false;

  let dailyDua = null;
  if (options.showCatalogHome !== false) {
    try {
      dailyDua = await getDailyDuaViewModel();
    } catch (_error) {
      dailyDua = null;
    }
  }

  const html = renderDuasShell({
    activeFilter: state.filter,
    searchQuery: state.query,
    dailyDua,
    showCatalogHome: options.showCatalogHome !== false
  });

  appendTrustedHTML(dom.root, html);
  state.dom = cacheDuasDom();
  return true;
}

async function renderCatalogView() {
  const token = ++state.renderToken;
  const dom = ensureDom();
  if (!dom.grid) return;

  appendTrustedHTML(dom.grid, renderDuasLoadingState());

  try {
    const vm = await getDuasCatalogViewModel({ filter: state.filter, query: state.query });
    if (token !== state.renderToken) return;
    appendTrustedHTML(dom.grid, renderDuasCatalog(vm.cards));
  } catch (_error) {
    if (token !== state.renderToken) return;
    appendTrustedHTML(dom.grid, renderDuasErrorState('تعذر تحميل الأدعية الآن. حاول مرة أخرى.'));
  }
}

function updateSessionClasses(sessionVm) {
  const dom = ensureDom();
  if (!dom.root) return;
  dom.root.classList.remove('duas-root--focus-mode');
  dom.root.classList.toggle('duas-root--large-text', Boolean(sessionVm?.largeText));
}

async function renderSessionView(slug) {
  const dom = ensureDom();
  if (!dom.content) return false;

  appendTrustedHTML(dom.content, renderDuasLoadingState('جاري فتح التصنيف...'));

  try {
    const sessionVm = await getDuasSessionViewModel(slug);
    if (!sessionVm) {
      appendTrustedHTML(dom.content, renderDuasErrorState('لم يتم العثور على هذا التصنيف.'));
      return false;
    }

    const visibleCount = Math.max(SESSION_PAGE_SIZE, Number(state.visibleSessionCount) || SESSION_PAGE_SIZE);
    const totalCount = Array.isArray(sessionVm.items) ? sessionVm.items.length : 0;
    const visibleItems = sessionVm.items.slice(0, visibleCount);
    const remainingCount = Math.max(0, totalCount - visibleItems.length);

    appendTrustedHTML(dom.content, renderDuasSession({
      ...sessionVm,
      visibleItems,
      hasMore: remainingCount > 0,
      nextPageCount: Math.min(SESSION_PAGE_SIZE, remainingCount)
    }));
    openSubview('duaCategoryContent');
    updateSessionClasses(sessionVm);
    return true;
  } catch (_error) {
    appendTrustedHTML(dom.content, renderDuasErrorState('تعذر فتح التصنيف الآن.'));
    return false;
  }
}

async function getActiveSessionVm() {
  const sessionState = duasSessionStore.getState();
  return sessionState?.activeCategorySlug
    ? await getDuasSessionViewModel(sessionState.activeCategorySlug)
    : null;
}

function resolveInitialDuaId(category) {
  const items = Array.isArray(category?.items) ? category.items : [];
  if (!items.length) return null;

  const sessionState = duasSessionStore.getState();
  if (sessionState.activeCategorySlug === category.slug) {
    const currentActive = Number(sessionState.activeDuaId);
    if (Number.isFinite(currentActive) && items.some((item) => item.id === currentActive)) {
      return currentActive;
    }
  }

  const historyState = duasHistoryStore.getState();
  if (historyState.lastVisitedSlug === category.slug) {
    const lastViewed = Number(historyState.lastViewedDuaId);
    if (Number.isFinite(lastViewed) && items.some((item) => item.id === lastViewed)) {
      return lastViewed;
    }
  }

  return items[0]?.id || null;
}

function handleRootInput(event) {
  if (!event.target.matches('#duasSearchInput')) return;
  state.query = String(event.target.value || '').trim();
  void renderCatalogView();

  const dom = ensureDom();
  const clearButton = dom.root?.querySelector('.duas-search__clear');
  if (clearButton) {
    clearButton.classList.toggle('is-hidden', !state.query);
  }
}

function bindRootEvents() {
  const dom = ensureDom();
  if (!dom.root || state.inputBound) return;
  dom.root.addEventListener('input', handleRootInput);
  state.inputBound = true;
}

function rerenderWithPreservedSession() {
  void renderSection({ preserveSession: Boolean(duasSessionStore.getState().activeCategorySlug) });
}

function clearSessionContent() {
  const dom = ensureDom();
  if (dom.content) {
    clearElement(dom.content);
  }
  dom.root?.classList.remove('duas-root--focus-mode', 'duas-root--large-text');
}

export async function dispatchDuasAction(action, payload = {}) {
  const value = payload.value || '';

  switch (action) {
    case 'open-category':
      await openDuaCategory(value);
      return true;
    case 'close-category':
      closeDuaCategory();
      return true;
    case 'set-filter':
      state.filter = value || 'all';
      await renderSection();
      return true;
    case 'clear-search':
      state.query = '';
      await renderSection();
      return true;
    case 'open-more': {
      const moreButton = document.getElementById('bottomNav')?.querySelector('[data-bottom-nav-more]');
      if (moreButton instanceof HTMLElement) moreButton.click();
      return true;
    }
    case 'retry-load':
      await renderSection({ preserveSession: Boolean(duasSessionStore.getState().activeCategorySlug) });
      return true;
    case 'load-more':
      state.visibleSessionCount += SESSION_PAGE_SIZE;
      await renderSection({ preserveSession: true });
      return true;
    case 'toggle-favorite':
      duasPreferencesStore.toggleFavorite(value || duasSessionStore.getState().activeCategorySlug);
      rerenderWithPreservedSession();
      return true;
    case 'toggle-large-text': {
      const current = duasPreferencesStore.getState();
      duasPreferencesStore.update({ largeText: !current.largeText });
      await renderSection({ preserveSession: true });
      return true;
    }
    case 'set-active-dua':
      duasSessionStore.setActiveDua(value);
      duasHistoryStore.markVisited(duasSessionStore.getState().activeCategorySlug, value);
      await renderSection({ preserveSession: true });
      return true;
    case 'copy-dua': {
      const sessionVm = await getActiveSessionVm();
      const item = findDuaById(sessionVm, payload.duaId);
      const text = formatDuaForSharing(item);
      if (text) copyToClipboard(text);
      return true;
    }
    case 'share-dua': {
      const sessionVm = await getActiveSessionVm();
      const item = findDuaById(sessionVm, payload.duaId);
      const text = formatDuaForSharing(item);
      if (text) shareText(text);
      return true;
    }
    default:
      return false;
  }
}

export function handleDuasActionTarget(actionTarget) {
  if (!actionTarget) return false;
  return dispatchDuasAction(actionTarget.dataset.duasAction, {
    value: actionTarget.dataset.duasValue,
    duaId: actionTarget.dataset.duasDuaId
  });
}

export function initDuasSection() {
  if (state.initialized) return;
  state.initialized = true;
  void renderSection();
  registerSubviewCloseHandler('duaCategoryContent', () => {
    clearSessionContent();
    duasSessionStore.reset();
    state.visibleSessionCount = SESSION_PAGE_SIZE;
    void renderSection();
  });
}

export async function renderSection(options = {}) {
  const sessionSlug = options.preserveSession ? duasSessionStore.getState().activeCategorySlug : '';
  await renderShell({ showCatalogHome: !sessionSlug });
  bindRootEvents();

  if (sessionSlug) {
    await renderSessionView(sessionSlug);
    return;
  }

  clearSessionContent();
  state.visibleSessionCount = SESSION_PAGE_SIZE;
  await renderCatalogView();
}

export function renderDuasSection() {
  return renderSection();
}

export async function openDuaCategory(categoryKey) {
  const category = await getDuaCategoryBySlug(categoryKey);
  if (!category) return;

  const initialDuaId = resolveInitialDuaId(category);
  state.visibleSessionCount = SESSION_PAGE_SIZE;
  duasSessionStore.openCategory(category, { activeDuaId: initialDuaId });
  duasHistoryStore.markVisited(category, initialDuaId);
  await renderSection({ preserveSession: true });
  pushHashState({ section: 'duas', sub: true }, '#duas-category');
  scrollToTop();
}

export function closeDuaCategory() {
  const closed = closeSubview('duaCategoryContent');
  state.visibleSessionCount = SESSION_PAGE_SIZE;
  if (!closed) {
    duasSessionStore.reset();
    void renderSection();
  }
  replaceSectionRoute('duas');
}

export function resetDuasView() {
  state.filter = 'all';
  state.query = '';
  state.visibleSessionCount = SESSION_PAGE_SIZE;
  duasSessionStore.reset();
  clearSessionContent();
  void renderSection();
}

export const duasFeatureController = {
  init: initDuasSection,
  render: renderDuasSection,
  openCategory: openDuaCategory,
  closeCategory: closeDuaCategory,
  handleActionTarget: handleDuasActionTarget
};

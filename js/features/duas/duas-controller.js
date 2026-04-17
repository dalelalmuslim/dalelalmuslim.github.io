import { closeSubview, openSubview, registerSubviewCloseHandler } from '../../app/ui/subview-manager.js';
import { pushHashState, scrollToTop } from '../../services/platform/browser-navigation.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { copyToClipboard, shareText } from '../../app/shell/app-shell.js';
import { cacheDuasDom } from './duas-dom.js';
import { appendTrustedHTML, clearElement } from '../../shared/dom/dom-helpers.js';
import { renderDuasCatalog, renderDuasSession, renderDuasShell } from './duas-renderers.js';
import { getDuaCategoryBySlug } from '../../domains/duas/duas-repository.js';
import { duasSessionStore } from '../../domains/duas/duas-session-store.js';
import { duasPreferencesStore } from '../../domains/duas/duas-preferences-store.js';
import { duasHistoryStore } from '../../domains/duas/duas-history-store.js';
import { getDuasCatalogViewModel, getDuasSessionViewModel } from '../../domains/duas/duas-selectors.js';

const state = {
  initialized: false,
  dom: null,
  filter: 'all',
  query: '',
  inputBound: false
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

function renderShell(options = {}) {
  const dom = ensureDom();
  if (!dom.root) return false;

  const html = renderDuasShell({
    activeFilter: state.filter,
    searchQuery: state.query,
    showCatalogHome: options.showCatalogHome !== false
  });

  appendTrustedHTML(dom.root, html);
  state.dom = cacheDuasDom();
  return true;
}

function renderCatalogView() {
  const dom = ensureDom();
  if (!dom.grid) return;
  const vm = getDuasCatalogViewModel({ filter: state.filter, query: state.query });
  appendTrustedHTML(dom.grid, renderDuasCatalog(vm.cards));
}

function updateSessionClasses(sessionVm) {
  const dom = ensureDom();
  if (!dom.root) return;
  dom.root.classList.remove('duas-root--focus-mode');
  dom.root.classList.toggle('duas-root--large-text', Boolean(sessionVm?.largeText));
}

function renderSessionView(slug) {
  const dom = ensureDom();
  if (!dom.content) return false;

  const sessionVm = getDuasSessionViewModel(slug);
  if (!sessionVm) return false;

  appendTrustedHTML(dom.content, renderDuasSession(sessionVm));
  openSubview('duaCategoryContent');
  updateSessionClasses(sessionVm);
  return true;
}

function getActiveSessionVm() {
  const sessionState = duasSessionStore.getState();
  return sessionState?.activeCategorySlug
    ? getDuasSessionViewModel(sessionState.activeCategorySlug)
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
  renderCatalogView();

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
  renderSection({ preserveSession: Boolean(duasSessionStore.getState().activeCategorySlug) });
}

function clearSessionContent() {
  const dom = ensureDom();
  if (dom.content) {
    clearElement(dom.content);
  }
  dom.root?.classList.remove('duas-root--focus-mode', 'duas-root--large-text');
}

export function dispatchDuasAction(action, payload = {}) {
  const value = payload.value || '';

  switch (action) {
    case 'open-category':
      openDuaCategory(value);
      return true;
    case 'close-category':
      closeDuaCategory();
      return true;
    case 'set-filter':
      state.filter = value || 'all';
      renderSection();
      return true;
    case 'clear-search':
      state.query = '';
      renderSection();
      return true;
    case 'toggle-favorite':
      duasPreferencesStore.toggleFavorite(value || duasSessionStore.getState().activeCategorySlug);
      rerenderWithPreservedSession();
      return true;
    case 'toggle-large-text': {
      const current = duasPreferencesStore.getState();
      duasPreferencesStore.update({ largeText: !current.largeText });
      renderSection({ preserveSession: true });
      return true;
    }
    case 'set-active-dua':
      duasSessionStore.setActiveDua(value);
      duasHistoryStore.markVisited(duasSessionStore.getState().activeCategorySlug, value);
      renderSection({ preserveSession: true });
      return true;
    case 'copy-dua': {
      const sessionVm = getActiveSessionVm();
      const item = findDuaById(sessionVm, payload.duaId);
      if (item?.text) copyToClipboard(item.text);
      return true;
    }
    case 'share-dua': {
      const sessionVm = getActiveSessionVm();
      const item = findDuaById(sessionVm, payload.duaId);
      if (item?.text) shareText(item.text);
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
  renderShell();
  bindRootEvents();
  registerSubviewCloseHandler('duaCategoryContent', () => {
    clearSessionContent();
    duasSessionStore.reset();
    renderSection();
  });
  state.initialized = true;
}

export function renderSection(options = {}) {
  const sessionSlug = options.preserveSession ? duasSessionStore.getState().activeCategorySlug : '';
  renderShell({ showCatalogHome: !sessionSlug });
  bindRootEvents();

  if (sessionSlug) {
    renderSessionView(sessionSlug);
    return;
  }

  clearSessionContent();
  renderCatalogView();
}

export function renderDuasSection() {
  renderSection();
}

export function openDuaCategory(categoryKey) {
  const category = getDuaCategoryBySlug(categoryKey);
  if (!category) return;

  const initialDuaId = resolveInitialDuaId(category);
  duasSessionStore.openCategory(category, { activeDuaId: initialDuaId });
  duasHistoryStore.markVisited(category, initialDuaId);
  renderSection({ preserveSession: true });
  pushHashState({ section: 'duas', sub: true }, '#duas-category');
  scrollToTop();
}

export function closeDuaCategory() {
  const closed = closeSubview('duaCategoryContent');
  if (!closed) {
    duasSessionStore.reset();
    renderSection();
  }
  replaceSectionRoute('duas');
}

export function resetDuasView() {
  state.filter = 'all';
  state.query = '';
  duasSessionStore.reset();
  clearSessionContent();
  renderSection();
}

export const duasFeatureController = {
  init: initDuasSection,
  render: renderDuasSection,
  openCategory: openDuaCategory,
  closeCategory: closeDuaCategory,
  handleActionTarget: handleDuasActionTarget
};

import { copyToClipboard } from '../../app/shell/app-shell.js';
import { openSubview, closeSubview, registerSubviewCloseHandler } from '../../app/ui/subview-manager.js';
import { pushHashState, scrollToTop } from '../../services/platform/browser-navigation.js';
import { replaceSectionRoute } from '../../router/route-state.js';
import { vibrateDevice } from '../../services/platform/haptics.js';
import { getAzkarCatalog } from '../../domains/azkar/azkar-repository.js';
import {
    getAzkarProgressForCategory,
    incrementAzkarProgress
} from '../../domains/azkar/azkar-progress-actions.js';
import { azkarSessionStore } from '../../domains/azkar/azkar-session-store.js';
import { azkarHistoryStore } from '../../domains/azkar/azkar-history-store.js';
import { azkarPreferencesStore } from '../../domains/azkar/azkar-preferences-store.js';
import {
    getAzkarCatalogSurfaceViewModel,
    getAzkarCategoryViewModel,
    getFavoriteAzkarItemsViewModel,
    getAzkarResumeSummary
} from '../../domains/azkar/azkar-selectors.js';
import { cacheAzkarDom, resolveAzkarElement } from './azkar-dom.js';
import {
    renderAzkarCatalogSurface,
    renderAzkarCategoriesGrid,
    renderAzkarFavoriteItemsGrid,
    renderAzkarResumeMini,
    renderAzkarCategoryList,
    renderAzkarSessionHeader
} from './azkar-renderers.js';

const DEFAULT_FILTER = 'all';

export const azkarController = {
    dom: {},
    currentCategoryKey: null,
    currentFilter: DEFAULT_FILTER,
    showFavoritesOnly: false,
    isRenderingCatalog: false,

    init() {
        this.dom = cacheAzkarDom();
        this.applyPreferenceClasses();

        registerSubviewCloseHandler('azkarListView', () => {
            this.currentCategoryKey = null;
            azkarSessionStore.clearActiveCategory();
        });

        const favBtn = document.getElementById('azkarFavoriteFilterBtn');
        if (favBtn) {
            favBtn.addEventListener('click', () => this.toggleFavoriteFilter());
        }

        const resumeBtn = document.getElementById('azkarResumeMiniBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeCategory());
        }
    },

    async ensureAzkarLoaded() {
        return getAzkarCatalog();
    },

    applyPreferenceClasses() {
        const preferences = azkarPreferencesStore.getState();
        const listView = resolveAzkarElement(this.dom, 'listView', 'azkarListView');
        if (listView) {
            listView.classList.toggle('is-large-text', Boolean(preferences.largeText));
            listView.classList.toggle('is-focus-mode', Boolean(preferences.focusMode));
        }
    },

    async renderAzkarCategories() {
        if (this.isRenderingCatalog) return;
        this.isRenderingCatalog = true;

        const grid = resolveAzkarElement(this.dom, 'categoriesGrid', 'azkarCategoriesGrid');
        const primaryAction = resolveAzkarElement(this.dom, 'primaryAction', 'azkarPrimaryAction');
        if (!grid) {
            this.isRenderingCatalog = false;
            return;
        }

        try {
            await this.ensureAzkarLoaded();
            this.showFavoritesOnly = this.currentFilter === 'favorites';
            const viewModel = await getAzkarCatalogSurfaceViewModel({ filterKey: this.currentFilter });

            renderAzkarCatalogSurface({
                container: primaryAction,
                viewModel,
                activeFilter: this.currentFilter,
                onSetFilter: (filterKey) => this.setFilter(filterKey),
                onActivatePrimary: (slug) => this.openAzkarCategory(slug)
            });

            if (this.currentFilter === 'favorites') {
                const favoriteItems = await getFavoriteAzkarItemsViewModel();
                renderAzkarFavoriteItemsGrid({
                    grid,
                    template: null,
                    items: favoriteItems,
                    onOpenItem: (item) => this.openFavoriteItem(item)
                });
            } else {
                renderAzkarCategoriesGrid({
                    grid,
                    template: null,
                    categories: viewModel.categories,
                    onOpenCategory: (key) => this.openAzkarCategory(key)
                });
            }

            await this.renderResumeMini();
        } catch (error) {
            console.error('[azkar] failed to render catalog', error);
            grid.replaceChildren();
            const message = document.createElement('p');
            message.className = 'azkar-empty-state';
            message.textContent = 'تعذر تحميل الأذكار الآن. حاول مرة أخرى.';
            grid.appendChild(message);
        } finally {
            this.isRenderingCatalog = false;
        }
    },

    async renderResumeMini() {
        const container = document.getElementById('azkarResumeMini');
        const textEl = document.getElementById('azkarResumeMiniText');

        if (this.currentFilter === 'favorites') {
            renderAzkarResumeMini({ container, textEl, summary: null });
            return;
        }

        const summary = await getAzkarResumeSummary();
        renderAzkarResumeMini({ container, textEl, summary });
    },

    focusItemCard(itemId) {
        if (!itemId) return;
        requestAnimationFrame(() => {
            const target = [...document.querySelectorAll('[data-azkar-item-id]')]
                .find((element) => element.dataset.azkarItemId === itemId);
            if (!target) return;
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    },

    async renderOpenCategory(categoryKey, {
        openAsSubview = false,
        markVisited = false,
        activeItemIndex = null,
        activeItemId = ''
    } = {}) {
        const categoryData = await getAzkarCategoryViewModel(categoryKey);
        if (!categoryData) return false;

        const listContainer = resolveAzkarElement(this.dom, 'listContainer', 'azkarList');
        const listHeader = this.dom.listHeader || document.querySelector('#azkarListView .azkar-session-header');
        const categoryProgress = getAzkarProgressForCategory(categoryData.slug);

        if (!listContainer) return false;

        const itemIndexFromId = activeItemId
            ? categoryData.azkar.findIndex((item, index) => (item.id || `${categoryData.slug}-${index + 1}`) === activeItemId)
            : -1;
        const resolvedItemIndex = Number.isInteger(activeItemIndex)
            ? Math.max(0, activeItemIndex)
            : (itemIndexFromId >= 0 ? itemIndexFromId : categoryData.firstIncompleteIndex);
        const resolvedActiveItemId = activeItemId
            || categoryData.azkar[resolvedItemIndex]?.id
            || '';

        renderAzkarSessionHeader({
            container: listHeader,
            categoryData,
            onBack: () => this.closeAzkarCategory(),
            onToggleLargeText: () => this.toggleLargeText(),
            onToggleVibration: () => this.toggleVibration()
        });

        renderAzkarCategoryList({
            listContainer,
            template: null,
            categoryData,
            progress: categoryProgress,
            activeItemId: resolvedActiveItemId,
            onCopy: text => copyToClipboard(text),
            onTick: (index, target) => this.tickAzkarItem(categoryData, index, target),
            onToggleFavoriteItem: itemId => this.toggleFavoriteItem(itemId)
        });

        this.currentCategoryKey = categoryData.slug;
        azkarSessionStore.setActiveCategory(categoryData, resolvedItemIndex);
        if (markVisited) {
            azkarHistoryStore.markCategoryVisited(categoryData);
        }

        this.applyPreferenceClasses();

        if (openAsSubview) {
            openSubview('azkarListView');
            pushHashState({ section: 'azkar', sub: true }, '#azkar-list');
            scrollToTop();
        }

        if (resolvedActiveItemId) {
            this.focusItemCard(resolvedActiveItemId);
        }

        return true;
    },

    async openFavoriteItem(item) {
        if (!item?.categorySlug) return;
        await this.renderOpenCategory(item.categorySlug, {
            openAsSubview: true,
            markVisited: true,
            activeItemIndex: Number.isInteger(item.itemIndex) ? item.itemIndex : 0,
            activeItemId: item.itemId || ''
        });
    },

    async openAzkarCategory(key) {
        await this.renderOpenCategory(key, { openAsSubview: true, markVisited: true });
    },

    async tickAzkarItem(category, index, target) {
        const current = incrementAzkarProgress(category.slug, index, target);
        if (current === null) return;

        const preferences = azkarPreferencesStore.getState();
        if (preferences.vibrationEnabled) {
            vibrateDevice(current >= target ? [100, 50, 100] : 50);
        }

        const categoryState = await getAzkarCategoryViewModel(category.slug);
        if (!categoryState) return;

        const nextIndex = categoryState.azkar.findIndex((item, itemIndex) => {
            const safeTarget = Number(item?.repeatTarget ?? item?.repeat ?? item?.count ?? 1) || 1;
            const safeCurrent = Number(categoryState.progressMap[itemIndex]) || 0;
            return safeCurrent < safeTarget;
        });

        azkarSessionStore.setActiveItemIndex(nextIndex >= 0 ? nextIndex : index);

        if (categoryState.progress.isCompleted) {
            azkarHistoryStore.markCategoryCompleted(categoryState);
        }

        await this.renderOpenCategory(category.slug, {
            openAsSubview: false,
            markVisited: false,
            activeItemIndex: nextIndex >= 0 ? nextIndex : index,
            activeItemId: categoryState.azkar[nextIndex >= 0 ? nextIndex : index]?.id || ''
        });
        await this.renderResumeMini();
        await this.renderAzkarCategories();
    },

    async setFilter(filterKey) {
        const safeFilter = typeof filterKey === 'string' && filterKey.trim() ? filterKey.trim() : DEFAULT_FILTER;
        this.currentFilter = safeFilter;
        this.showFavoritesOnly = safeFilter === 'favorites';
        await this.renderAzkarCategories();
    },

    async toggleFavoriteFilter() {
        await this.setFilter(this.currentFilter === 'favorites' ? DEFAULT_FILTER : 'favorites');
    },

    async resumeCategory() {
        const summary = await getAzkarResumeSummary();
        if (!summary) return;
        await this.openAzkarCategory(summary.slug);
    },

    async toggleFavorite() {
        await this.toggleFavoriteFilter();
    },

    async toggleFavoriteItem(itemId) {
        const safeItemId = typeof itemId === 'string' ? itemId.trim() : '';
        if (!safeItemId || !this.currentCategoryKey) return;

        azkarPreferencesStore.toggleFavoriteItem(safeItemId);
        await this.renderOpenCategory(this.currentCategoryKey, {
            openAsSubview: false,
            markVisited: false,
            activeItemId: safeItemId
        });
        await this.renderResumeMini();
        if (this.currentFilter === 'favorites') {
            await this.renderAzkarCategories();
        }
    },

    async toggleLargeText() {
        const current = azkarPreferencesStore.getState();
        azkarPreferencesStore.update({ largeText: !Boolean(current.largeText) });
        this.applyPreferenceClasses();
        if (this.currentCategoryKey) {
            await this.renderOpenCategory(this.currentCategoryKey, { openAsSubview: false, markVisited: false });
        }
    },

    async toggleFocusMode() {
        const current = azkarPreferencesStore.getState();
        azkarPreferencesStore.update({ focusMode: !Boolean(current.focusMode) });
        this.applyPreferenceClasses();
    },

    async toggleVibration() {
        const current = azkarPreferencesStore.getState();
        azkarPreferencesStore.update({ vibrationEnabled: !Boolean(current.vibrationEnabled) });
        if (this.currentCategoryKey) {
            await this.renderOpenCategory(this.currentCategoryKey, { openAsSubview: false, markVisited: false });
        }
    },

    async cycleReminderWindow() {
        azkarPreferencesStore.cycleReminderWindow();
        await this.renderAzkarCategories();
    },

    async toggleSmartOrdering() {
        azkarPreferencesStore.toggleSmartOrdering();
        await this.renderAzkarCategories();
    },

    async closeAzkarCategory() {
        this.resetAzkarView();
        replaceSectionRoute('azkar', 'الأذكار اليومية');
        await this.renderAzkarCategories();
    },

    resetAzkarView() {
        closeSubview('azkarListView');
        azkarSessionStore.clearActiveCategory();
    },

    async handleAction(action) {
        switch (action) {
            case 'close-category':
                await this.closeAzkarCategory();
                break;
            case 'toggle-favorite':
                await this.toggleFavorite();
                break;
            default:
                break;
        }
    }
};

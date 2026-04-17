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
    getAzkarCategorySummaries,
    getAzkarCategoryViewModel,
    getFavoriteAzkarItemsViewModel,
    getAzkarPrimaryActionViewModel,
    getAzkarResumeSummary
} from '../../domains/azkar/azkar-selectors.js';
import { cacheAzkarDom, resolveAzkarElement } from './azkar-dom.js';
import { setProgressPercent } from '../../shared/dom/dom-helpers.js';
import {
    renderAzkarCategoriesGrid,
    renderAzkarCategoryList,
    renderAzkarFavoriteItemsGrid,
    renderAzkarPrimaryAction,
    renderAzkarResumeMini
} from './azkar-renderers.js';

export const azkarController = {
    dom: {},
    currentCategoryKey: null,
    showFavoritesOnly: false,

    init() {
        this.dom = cacheAzkarDom();
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

    updateFavoriteButtonState() {
        const favBtn = document.getElementById('azkarFavoriteFilterBtn');
        if (!favBtn) return;

        favBtn.setAttribute('aria-pressed', String(this.showFavoritesOnly));
        favBtn.setAttribute('title', this.showFavoritesOnly ? 'عرض كل الأذكار' : 'إظهار الأذكار المفضلة');
        favBtn.setAttribute('aria-label', this.showFavoritesOnly ? 'عرض كل الأذكار' : 'إظهار الأذكار المفضلة');

        const icon = favBtn.querySelector('i');
        if (icon) {
            icon.className = this.showFavoritesOnly ? 'fa-solid fa-star' : 'fa-regular fa-star';
        }
    },

    async renderAzkarCategories() {
        const grid = resolveAzkarElement(this.dom, 'categoriesGrid', 'azkarCategoriesGrid');
        const primaryAction = resolveAzkarElement(this.dom, 'primaryAction', 'azkarPrimaryAction');
        const categoryTemplate = document.getElementById('tpl-azkar-category-card');
        const favoriteItemTemplate = document.getElementById('tpl-azkar-favorite-item-card');
        if (!grid) return;

        await this.ensureAzkarLoaded();
        this.updateFavoriteButtonState();

        if (this.showFavoritesOnly) {
            const favoriteItems = await getFavoriteAzkarItemsViewModel();
            renderAzkarFavoriteItemsGrid({
                grid,
                template: favoriteItemTemplate,
                items: favoriteItems,
                onOpenItem: (item) => this.openFavoriteItem(item)
            });
            if (primaryAction) {
                primaryAction.classList.add('is-hidden');
                primaryAction.replaceChildren();
            }
        } else {
            const categories = await getAzkarCategorySummaries();
            renderAzkarCategoriesGrid({
                grid,
                template: categoryTemplate,
                categories,
                onOpenCategory: (key) => this.openAzkarCategory(key)
            });
            renderAzkarPrimaryAction({
                container: primaryAction,
                viewModel: await getAzkarPrimaryActionViewModel(),
                onActivate: (slug) => this.openAzkarCategory(slug)
            });
        }

        await this.renderResumeMini();
    },

    async renderResumeMini() {
        const container = document.getElementById('azkarResumeMini');
        const textEl = document.getElementById('azkarResumeMiniText');

        if (this.showFavoritesOnly) {
            renderAzkarResumeMini({ container, textEl, summary: null });
            return;
        }

        const summary = await getAzkarResumeSummary();
        renderAzkarResumeMini({
            container,
            textEl,
            summary
        });
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
        const listTitle = resolveAzkarElement(this.dom, 'listTitle', 'azkarListTitle');
        const progressFill = document.getElementById('azkarSessionProgressFill');
        const progressText = document.getElementById('azkarSessionProgressText');
        const template = document.getElementById('tpl-azkar-item-card');
        const categoryProgress = getAzkarProgressForCategory(categoryData.slug);

        if (!listContainer || !template) return false;

        const itemIndexFromId = activeItemId
            ? categoryData.azkar.findIndex((item, index) => (item.id || `${categoryData.slug}-${index + 1}`) === activeItemId)
            : -1;
        const resolvedItemIndex = Number.isInteger(activeItemIndex)
            ? Math.max(0, activeItemIndex)
            : (itemIndexFromId >= 0 ? itemIndexFromId : categoryData.firstIncompleteIndex);
        const resolvedActiveItemId = activeItemId
            || categoryData.azkar[resolvedItemIndex]?.id
            || '';

        if (listTitle) {
            listTitle.textContent = categoryData.title;
        }

        if (progressFill && categoryData.progress) {
            const ratio = categoryData.progress.itemCompletionRatio || 0;
            setProgressPercent(progressFill, ratio * 100);
        }
        if (progressText && categoryData.progress) {
            progressText.textContent = categoryData.progress.progressLabel || '0/0';
        }

        renderAzkarCategoryList({
            listContainer,
            template,
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
            const safeTarget = Number(item?.repeatTarget ?? 1) || 1;
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

    async toggleFavoriteFilter() {
        this.showFavoritesOnly = !this.showFavoritesOnly;
        await this.renderAzkarCategories();
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
        if (this.showFavoritesOnly) {
            await this.renderAzkarCategories();
        }
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

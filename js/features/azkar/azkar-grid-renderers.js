import {
    clearElement,
    createIconElement,
    createTextElement,
    setProgressPercent
} from '../../shared/dom/dom-helpers.js';

function getCategoryIcon(category) {
    if (category?.icon) return category.icon;
    return 'fa-book-open';
}

function getCategoryTone(category) {
    return String(category?.accentTone || 'default').trim() || 'default';
}

export function renderAzkarPrimaryAction({ container, viewModel, onActivate }) {
    if (!container) return false;

    clearElement(container);

    if (!viewModel?.slug) {
        container.classList.add('is-hidden');
        return false;
    }

    container.classList.remove('is-hidden');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'azkar-primary-action__btn';
    button.dataset.tone = getCategoryTone(viewModel);

    const iconWrap = document.createElement('span');
    iconWrap.className = 'azkar-primary-action__icon';
    iconWrap.appendChild(createIconElement(['fa-solid', viewModel.icon || 'fa-sparkles']));

    const content = document.createElement('span');
    content.className = 'azkar-primary-action__content';

    const eyebrow = createTextElement('span', viewModel.helperText || 'الأنسب الآن', 'azkar-primary-action__eyebrow');
    const title = createTextElement('span', viewModel.title || 'افتح الورد', 'azkar-primary-action__title');

    content.append(eyebrow, title);
    button.append(iconWrap, content);

    button.addEventListener('click', () => {
        if (typeof onActivate === 'function') {
            onActivate(viewModel.slug);
        }
    });

    container.appendChild(button);
    return true;
}

export function renderAzkarCategoriesGrid({
    grid,
    template,
    categories,
    onOpenCategory
}) {
    if (!grid || !template) return false;

    clearElement(grid);
    grid.dataset.view = 'categories';

    if (!Array.isArray(categories)) {
        grid.appendChild(createTextElement('p', 'جاري تحميل الأذكار...', 'muted cardx--center azkar-loading-placeholder'));
        return false;
    }

    if (categories.length === 0) {
        grid.appendChild(createTextElement('p', 'لا توجد تصنيفات', 'cardx cardx--center azkar-empty-state'));
        return true;
    }

    categories.forEach(category => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.azkar-category-card');
        const iconEl = clone.querySelector('.azkar-category-card__icon i');
        const eyebrowEl = clone.querySelector('.azkar-category-card__eyebrow');
        const titleEl = clone.querySelector('.azkar-category-card__title');
        const stateEl = clone.querySelector('.azkar-category-card__state');
        const progressFillEl = clone.querySelector('.azkar-category-card__progress-fill');

        const progress = category.progress || {};
        const completionRatio = progress.itemCompletionRatio || 0;

        if (card) {
            card.dataset.azkarCategoryKey = category.slug;
            card.dataset.tone = getCategoryTone(category);
            card.dataset.timeContext = category.timeContextKey || 'day';
            card.classList.toggle('is-recommended-now', Boolean(category.isRecommendedNow));
            card.classList.toggle('is-completed-today', Boolean(progress.isCompleted));
            card.addEventListener('click', () => onOpenCategory(category.slug));
        }
        if (iconEl) {
            iconEl.className = `fa-solid ${getCategoryIcon(category)}`;
        }
        if (eyebrowEl) {
            eyebrowEl.textContent = category.periodLabel || '';
        }
        if (titleEl) {
            titleEl.textContent = category.title;
        }
        if (stateEl) {
            const label = category.categoryStateLabel || '';
            stateEl.textContent = label;
            stateEl.classList.toggle('is-hidden', !label);
        }
        if (progressFillEl) {
            setProgressPercent(progressFillEl, completionRatio * 100);
        }

        grid.appendChild(clone);
    });

    return true;
}

export function renderAzkarFavoriteItemsGrid({
    grid,
    template,
    items,
    onOpenItem
}) {
    if (!grid || !template) return false;

    clearElement(grid);
    grid.dataset.view = 'favorites';

    if (!Array.isArray(items) || items.length === 0) {
        grid.appendChild(createTextElement('p', 'لا توجد أذكار مفضلة بعد.', 'cardx cardx--center azkar-empty-state'));
        return true;
    }

    items.forEach((item) => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.azkar-favorite-item-card');
        const categoryEl = clone.querySelector('.azkar-favorite-item-card__category');
        const snippetEl = clone.querySelector('.azkar-favorite-item-card__snippet');
        const metaEl = clone.querySelector('.azkar-favorite-item-card__meta');

        if (card) {
            card.dataset.tone = getCategoryTone(item);
            card.classList.toggle('is-completed-today', Boolean(item.isCompleted));
            card.classList.toggle('is-recommended-now', Boolean(item.isRecommendedNow));
            card.setAttribute('aria-label', `افتح الذكر المفضل من ${item.categoryTitle || 'الأذكار'}`);
            card.addEventListener('click', () => {
                if (typeof onOpenItem === 'function') {
                    onOpenItem(item);
                }
            });
        }

        if (categoryEl) {
            categoryEl.textContent = `من ${item.categoryTitle || item.categoryPeriodLabel || 'الأذكار'}`;
        }
        if (snippetEl) {
            snippetEl.textContent = item.snippet || item.text || '';
        }
        if (metaEl) {
            metaEl.textContent = item.isCompleted
                ? `${item.progressLabel} • تم اليوم`
                : `${item.progressLabel} • ${item.categoryPeriodLabel || ''}`;
        }

        grid.appendChild(clone);
    });

    return true;
}

export function renderAzkarResumeMini({ container, textEl, summary }) {
    if (!container) return;

    if (!summary || !summary.slug) {
        container.classList.add('is-hidden');
        return;
    }

    container.classList.remove('is-hidden');
    if (textEl) {
        textEl.textContent = summary.title || 'وردك الأخير';
    }
}

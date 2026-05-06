import {
    clearElement,
    createIconElement,
    createTextElement,
    setProgressPercent
} from '../../shared/dom/dom-helpers.js';

function getCategoryIcon(category) {
    if (category?.periodIcon) return category.periodIcon;
    if (category?.icon === 'fa-pray') return 'fa-mosque';
    if (category?.icon) return category.icon;
    return 'fa-book-open';
}

function getCategoryTone(category) {
    return String(category?.tone || category?.accentTone || 'default').trim() || 'default';
}

function appendIcon(parent, classes) {
    parent.appendChild(createIconElement(Array.isArray(classes) ? classes : ['fa-solid', classes]));
}

function createButton(className, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    if (label) button.setAttribute('aria-label', label);
    return button;
}

function createCatalogAppbar() {
    const appbar = document.createElement('div');
    appbar.className = 'azkar-appbar';

    const spacer = document.createElement('span');
    spacer.className = 'azkar-appbar__spacer';
    spacer.setAttribute('aria-hidden', 'true');

    const brand = document.createElement('div');
    brand.className = 'azkar-appbar__brand';
    brand.appendChild(createTextElement('span', 'دليل المسلم'));
    appendIcon(brand, 'fa-mosque');

    const user = createButton('azkar-appbar__icon-btn', 'الحساب');
    appendIcon(user, 'fa-user');

    appbar.append(spacer, brand, user);
    return appbar;
}

function createHero(viewModel, onActivate) {
    const primary = viewModel?.primaryAction || {};
    const hero = document.createElement('article');
    hero.className = 'azkar-hero';
    hero.setAttribute('aria-label', 'قسم الأذكار ووردك الآن');

    const headline = document.createElement('div');
    headline.className = 'azkar-hero__headline';
    headline.append(
        createTextElement('h3', 'الأذكار', 'azkar-hero__title'),
        createTextElement('p', 'ورد الصباح والمساء وما بعد الصلاة', 'azkar-hero__subtitle')
    );

    const card = document.createElement('article');
    card.className = 'azkar-now-card';
    card.dataset.tone = getCategoryTone(primary);

    const content = document.createElement('div');
    content.className = 'azkar-now-card__content';
    const eyebrow = createTextElement('p', 'وردك الآن', 'azkar-now-card__eyebrow');
    const title = createTextElement('p', primary.title || 'ابدأ وردك اليومي', 'azkar-now-card__title');
    const helper = createTextElement('p', primary.helperText || '0 من 0', 'azkar-now-card__title');
    const cta = createButton('azkar-now-card__cta', primary.actionLabel || 'ابدأ الورد');
    cta.append(createTextElement('span', primary.isCompleted ? 'راجع' : 'ابدأ'));
    appendIcon(cta, 'fa-chevron-left');
    cta.addEventListener('click', () => {
        if (primary.slug && typeof onActivate === 'function') onActivate(primary.slug);
    });
    content.append(eyebrow, title, helper, cta);

    const visual = document.createElement('div');
    visual.className = 'azkar-now-card__visual';
    const orb = document.createElement('span');
    orb.className = 'azkar-now-card__orb';
    appendIcon(orb, primary.icon || 'fa-moon');
    const landscape = document.createElement('span');
    landscape.className = 'azkar-now-card__landscape';
    visual.append(orb, landscape);

    card.append(content, visual);
    hero.append(headline, card);
    return hero;
}

function createSectionHeading() {
    const heading = document.createElement('div');
    heading.className = 'azkar-section-heading';

    const icon = document.createElement('span');
    icon.className = 'azkar-section-heading__icon';
    appendIcon(icon, 'fa-calendar-days');

    const copy = document.createElement('div');
    copy.append(
        createTextElement('h3', 'الأوراد اليومية', 'azkar-section-heading__title'),
        createTextElement('p', 'اختر وردك وواظب على ذكر الله.', 'azkar-section-heading__subtitle')
    );

    heading.append(icon, copy);
    return heading;
}

export function renderAzkarCatalogSurface({ container, viewModel, activeFilter, onSetFilter, onActivatePrimary }) {
    if (!container) return false;

    clearElement(container);
    container.classList.remove('is-hidden');

    const surface = document.createElement('div');
    surface.className = 'azkar-catalog-surface';
    surface.append(
        createCatalogAppbar(),
        createHero(viewModel, onActivatePrimary),
        createSectionHeading()
    );

    container.appendChild(surface);
    return true;
}

export function renderAzkarPrimaryAction({ container, viewModel, onActivate }) {
    return renderAzkarCatalogSurface({
        container,
        viewModel: {
            filters: [],
            activeFilter: 'all',
            primaryAction: viewModel
        },
        activeFilter: 'all',
        onSetFilter: null,
        onActivatePrimary: onActivate
    });
}

export function renderAzkarCategoriesGrid({
    grid,
    template,
    categories,
    onOpenCategory
}) {
    if (!grid) return false;

    clearElement(grid);
    grid.dataset.view = 'categories';

    if (!Array.isArray(categories)) {
        grid.appendChild(createTextElement('p', 'جاري تحميل الأذكار...', 'azkar-loading-placeholder'));
        return false;
    }

    if (categories.length === 0) {
        grid.appendChild(createTextElement('p', 'لا توجد أوراد مطابقة.', 'azkar-empty-state'));
        return true;
    }

    categories.forEach(category => {
        const card = createButton('azkar-category-card', `افتح ${category.title}`);
        card.dataset.azkarCategoryKey = category.slug;
        card.dataset.tone = getCategoryTone(category);
        card.dataset.timeContext = category.timeContextKey || 'day';
        card.classList.toggle('is-recommended-now', Boolean(category.isRecommendedNow));
        card.classList.toggle('is-completed-today', Boolean(category.progress?.isCompleted));

        const inner = document.createElement('span');
        inner.className = 'azkar-category-card__inner';

        const icon = document.createElement('span');
        icon.className = 'azkar-category-card__icon';
        appendIcon(icon, getCategoryIcon(category));

        const body = document.createElement('span');
        body.className = 'azkar-category-card__body';
        body.appendChild(createTextElement('span', category.title, 'azkar-category-card__title'));

        const meta = document.createElement('span');
        meta.className = 'azkar-category-card__meta';
        meta.append(
            createTextElement('span', category.progress?.itemCountLabel || ''),
            createTextElement('span', '•'),
            createTextElement('span', category.estimatedMinutesLabel || '')
        );
        body.appendChild(meta);

        const progress = document.createElement('span');
        progress.className = 'azkar-category-card__progress';
        const progressLabel = createTextElement('span', category.progress?.progressLabelReadable || '', 'azkar-category-card__progress-label');
        const track = document.createElement('span');
        track.className = 'azkar-category-card__progress-track';
        const fill = document.createElement('span');
        fill.className = 'azkar-category-card__progress-fill';
        setProgressPercent(fill, (category.progress?.itemCompletionRatio || 0) * 100);
        track.appendChild(fill);
        progress.append(progressLabel, track);
        body.appendChild(progress);

        const side = document.createElement('span');
        side.className = 'azkar-category-card__side';
        if (category.categoryStateLabel) {
            const state = createTextElement('span', category.categoryStateLabel, 'azkar-category-card__state');
            state.classList.toggle('is-now', category.categoryStateKind === 'now');
            state.classList.toggle('is-complete', category.categoryStateKind === 'complete');
            side.appendChild(state);
        }
        const arrow = document.createElement('span');
        arrow.className = 'azkar-category-card__arrow';
        appendIcon(arrow, 'fa-chevron-left');
        side.appendChild(arrow);

        inner.append(icon, body, side);
        card.appendChild(inner);
        card.addEventListener('click', () => onOpenCategory(category.slug));
        grid.appendChild(card);
    });

    return true;
}

export function renderAzkarFavoriteItemsGrid({
    grid,
    template,
    items,
    onOpenItem
}) {
    if (!grid) return false;

    clearElement(grid);
    grid.dataset.view = 'favorites';

    if (!Array.isArray(items) || items.length === 0) {
        grid.appendChild(createTextElement('p', 'لا توجد أذكار مفضلة بعد.', 'azkar-empty-state'));
        return true;
    }

    items.forEach((item) => {
        const card = createButton('azkar-favorite-item-card', `افتح الذكر المفضل من ${item.categoryTitle || 'الأذكار'}`);
        card.dataset.tone = getCategoryTone(item);

        const inner = document.createElement('span');
        inner.className = 'azkar-category-card__inner';

        const icon = document.createElement('span');
        icon.className = 'azkar-category-card__icon';
        appendIcon(icon, 'fa-star');

        const body = document.createElement('span');
        body.className = 'azkar-category-card__body';
        body.append(
            createTextElement('span', item.categoryTitle || 'الأذكار', 'azkar-category-card__title'),
            createTextElement('span', item.snippet || item.text || '', 'azkar-category-card__meta')
        );

        const side = document.createElement('span');
        side.className = 'azkar-category-card__side';
        side.appendChild(createTextElement('span', item.progressLabel || '', 'azkar-category-card__state'));

        inner.append(icon, body, side);
        card.appendChild(inner);
        card.addEventListener('click', () => {
            if (typeof onOpenItem === 'function') onOpenItem(item);
        });
        grid.appendChild(card);
    });

    return true;
}

export function renderAzkarResumeMini({ container, textEl, summary }) {
    if (!container) return;
    container.classList.add('is-hidden');
    if (textEl && summary?.title) textEl.textContent = summary.title;
}

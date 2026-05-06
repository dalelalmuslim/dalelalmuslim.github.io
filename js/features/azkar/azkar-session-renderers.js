import { clearElement, setProgressPercent } from '../../shared/dom/dom-helpers.js';

function createIcon(className) {
    const icon = document.createElement('i');
    icon.className = `fa-solid ${className}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
}

function createText(tag, text, className = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text || '';
    return element;
}

function createButton(className, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    if (label) button.setAttribute('aria-label', label);
    return button;
}

function getCategoryIcon(category) {
    if (category?.periodIcon) return category.periodIcon;
    if (category?.icon === 'fa-pray') return 'fa-mosque';
    if (category?.icon) return category.icon;
    return 'fa-book-open';
}

function getTone(category) {
    return String(category?.tone || category?.accentTone || 'default').trim() || 'default';
}

function getRepeatTarget(item) {
    return Math.max(1, Number(item?.repeatTarget ?? item?.repeat ?? item?.count ?? 1) || 1);
}

function buildCopyText(itemText, itemMeta) {
    return [itemText, itemMeta].filter(Boolean).join('\n');
}

export function renderAzkarSessionHeader({
    container,
    categoryData,
    onBack,
    onToggleLargeText,
    onToggleVibration
}) {
    if (!container || !categoryData) return false;

    clearElement(container);

    const preferences = categoryData.preferences || {};

    const topbar = document.createElement('div');
    topbar.className = 'azkar-reader-topbar';

    const backButton = createButton('azkar-reader-topbar__btn', 'العودة إلى الأذكار');
    backButton.appendChild(createIcon('fa-arrow-right'));
    backButton.addEventListener('click', () => {
        if (typeof onBack === 'function') onBack();
    });

    const title = createText('h3', categoryData.title || 'الأذكار', 'azkar-reader-topbar__title');

    const actions = document.createElement('div');
    actions.className = 'azkar-reader-topbar__actions';

    const textButton = createButton('azkar-reader-topbar__btn', 'تكبير النص');
    textButton.classList.toggle('is-active', Boolean(preferences.largeText));
    textButton.textContent = 'Aa';
    textButton.addEventListener('click', () => {
        if (typeof onToggleLargeText === 'function') onToggleLargeText();
    });

    const vibrationButton = createButton('azkar-reader-topbar__btn', preferences.vibrationEnabled ? 'إيقاف الاهتزاز' : 'تشغيل الاهتزاز');
    vibrationButton.classList.toggle('is-active', Boolean(preferences.vibrationEnabled));
    vibrationButton.appendChild(createIcon(preferences.vibrationEnabled ? 'fa-bell' : 'fa-bell-slash'));
    vibrationButton.addEventListener('click', () => {
        if (typeof onToggleVibration === 'function') onToggleVibration();
    });

    actions.append(textButton, vibrationButton);
    topbar.append(backButton, title, actions);

    const hero = document.createElement('article');
    hero.className = 'azkar-session-hero';
    hero.dataset.tone = getTone(categoryData);
    hero.setAttribute('aria-label', `ورد ${categoryData.title || 'الأذكار'}`);

    const content = document.createElement('div');
    content.className = 'azkar-session-hero__content';
    content.append(
        createText('h2', categoryData.title || 'الأذكار', 'amiri-text azkar-session-title'),
        createText('p', categoryData.description || categoryData.periodLabel || '', 'azkar-session-hero__subtitle')
    );

    const progressWrap = document.createElement('div');
    progressWrap.className = 'azkar-session-progress';
    const progressTrack = document.createElement('div');
    progressTrack.className = 'azkar-progress-track azkar-progress-track--session';
    const progressFill = document.createElement('span');
    progressFill.className = 'azkar-progress-fill';
    progressFill.id = 'azkarSessionProgressFill';
    setProgressPercent(progressFill, (categoryData.progress?.itemCompletionRatio || 0) * 100);
    progressTrack.appendChild(progressFill);
    const progressText = createText('span', categoryData.progress?.progressLabelReadable || '0 من 0', 'azkar-session-progress-text');
    progressText.id = 'azkarSessionProgressText';
    progressWrap.append(progressTrack, progressText);
    content.appendChild(progressWrap);

    const visual = document.createElement('div');
    visual.className = 'azkar-session-hero__visual';
    const visualIcon = document.createElement('span');
    visualIcon.className = 'azkar-session-hero__icon';
    visualIcon.appendChild(createIcon(getCategoryIcon(categoryData)));
    visual.appendChild(visualIcon);

    hero.append(content, visual);
    container.append(topbar, hero);
    return true;
}

export function renderAzkarCategoryList({
    listContainer,
    template,
    categoryData,
    progress,
    activeItemId = '',
    onCopy,
    onTick,
    onToggleFavoriteItem
}) {
    if (!listContainer || !categoryData) return false;

    clearElement(listContainer);

    const items = Array.isArray(categoryData.azkar) ? categoryData.azkar : [];
    const favoriteItemIds = new Set(categoryData?.preferences?.favoriteItemIds || []);

    if (items.length === 0) {
        listContainer.appendChild(createText('p', 'لا توجد أذكار في هذا الورد.', 'azkar-empty-state'));
        return true;
    }

    items.forEach((item, index) => {
        const target = getRepeatTarget(item);
        const current = Number(progress[index]) || 0;
        const safeCurrent = Math.min(current, target);
        const isDone = safeCurrent >= target;
        const ratio = target > 0 ? Math.min(safeCurrent / target, 1) : 0;
        const itemText = item.text || item.zekr || '';
        const itemMeta = item.reference || item.fadl || '';
        const itemId = item.id || `${categoryData.slug}-${index + 1}`;
        const isFavoriteItem = favoriteItemIds.has(itemId);

        const card = document.createElement('article');
        card.className = 'azkar-item-card';
        card.dataset.azkarItemId = itemId;
        card.dataset.azkarItemIndex = String(index);
        card.classList.toggle('azkar-item-card--completed', isDone);
        card.classList.toggle('is-favorite', isFavoriteItem);
        card.classList.toggle('is-targeted', activeItemId === itemId);

        const topline = document.createElement('div');
        topline.className = 'azkar-item-topline';
        topline.appendChild(createText('span', `ذكر ${index + 1}`, 'azkar-item-index-badge'));

        const favoriteBtn = createButton('azkar-item-favorite-btn', isFavoriteItem ? 'إزالة الذكر من المفضلة' : 'إضافة الذكر إلى المفضلة');
        favoriteBtn.setAttribute('aria-pressed', String(isFavoriteItem));
        const favoriteIcon = document.createElement('i');
        favoriteIcon.className = `fa-${isFavoriteItem ? 'solid' : 'regular'} fa-star`;
        favoriteIcon.setAttribute('aria-hidden', 'true');
        favoriteBtn.appendChild(favoriteIcon);
        if (typeof onToggleFavoriteItem === 'function') {
            favoriteBtn.addEventListener('click', () => onToggleFavoriteItem(itemId));
        }
        topline.appendChild(favoriteBtn);

        const textEl = createText('p', itemText, 'amiri-text azkar-item-text');
        const referenceEl = createText('p', itemMeta, 'azkar-item-reference');
        if (!itemMeta) referenceEl.classList.add('is-hidden');

        const sourceRow = document.createElement('div');
        sourceRow.className = 'azkar-item-actions';
        if (itemMeta) {
            const sourceChip = createText('span', itemMeta, 'azkar-item-source-chip');
            sourceChip.prepend(createIcon('fa-book-open'));
            sourceRow.appendChild(sourceChip);
        }

        const progressWrap = document.createElement('div');
        progressWrap.className = 'azkar-item-progress';
        const progressTrack = document.createElement('div');
        progressTrack.className = 'azkar-progress-track azkar-progress-track--item';
        const progressFill = document.createElement('span');
        progressFill.className = 'azkar-progress-fill azkar-item-progress__fill';
        setProgressPercent(progressFill, ratio * 100);
        progressTrack.appendChild(progressFill);
        const percent = createText('span', `${Math.round(ratio * 100)}%`, 'azkar-item-progress__percent');
        progressWrap.append(progressTrack, percent);

        const counterWrap = document.createElement('div');
        counterWrap.className = 'azkar-item-counter-wrapper';
        const counterBtn = createButton('azkar-item-counter-btn', isDone ? 'اكتمل هذا الذكر' : 'عد الذكر');
        counterBtn.disabled = isDone;
        const counterValue = createText('span', String(safeCurrent), 'azkar-item-counter-value');
        const counterLabel = createText('span', `${safeCurrent} / ${target} عدّ الذكر`, 'azkar-item-counter-label');
        counterBtn.append(counterValue, counterLabel);
        if (!isDone && typeof onTick === 'function') {
            counterBtn.addEventListener('click', () => onTick(index, target));
        }
        counterWrap.appendChild(counterBtn);

        const actions = document.createElement('div');
        actions.className = 'azkar-item-actions';
        const copyBtn = createButton('azkar-item-copy-btn', 'نسخ الذكر');
        copyBtn.append(createIcon('fa-copy'), createText('span', 'نسخ'));
        if (typeof onCopy === 'function') {
            copyBtn.addEventListener('click', () => onCopy(buildCopyText(itemText, itemMeta)));
        }
        actions.appendChild(copyBtn);

        card.append(topline, textEl, referenceEl, sourceRow, progressWrap, counterWrap, actions);
        listContainer.appendChild(card);
    });

    return true;
}

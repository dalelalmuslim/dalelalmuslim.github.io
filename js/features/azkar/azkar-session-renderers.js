import { clearElement, setProgressPercent } from '../../shared/dom/dom-helpers.js';

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
    if (!listContainer || !template || !categoryData) return false;

    clearElement(listContainer);

    categoryData.azkar.forEach((item, index) => {
        const target = Number(item.repeatTarget || item.repeat || item.count || 1);
        const current = Number(progress[index]) || 0;
        const isDone = current >= target;
        const ratio = target > 0 ? Math.min(current / target, 1) : 0;

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.azkar-item-card');
        const toplineBadge = clone.querySelector('.azkar-item-index-badge');
        const favoriteBtn = clone.querySelector('.azkar-item-favorite-btn');
        const favoriteIcon = favoriteBtn?.querySelector('i');
        const textEl = clone.querySelector('.azkar-item-text');
        const metaEl = clone.querySelector('.azkar-item-meta');
        const counterBtn = clone.querySelector('.azkar-item-counter-btn');
        const counterValue = clone.querySelector('.azkar-item-counter-value');
        const progressFill = clone.querySelector('.azkar-item-progress__fill');
        const copyBtn = clone.querySelector('.azkar-item-copy-btn');

        const itemText = item.text || item.zekr || '';
        const itemMeta = item.reference || item.fadl || '';
        const itemId = item.id || `${categoryData.slug}-${index + 1}`;
        const favoriteItemIds = new Set(categoryData?.preferences?.favoriteItemIds || []);
        const isFavoriteItem = favoriteItemIds.has(itemId);

        if (card) {
            card.dataset.azkarItemId = itemId;
            card.dataset.azkarItemIndex = String(index);
            card.classList.toggle('azkar-item-card--completed', isDone);
            card.classList.toggle('is-favorite', isFavoriteItem);
            card.classList.toggle('is-targeted', activeItemId === itemId);
        }
        if (toplineBadge) {
            toplineBadge.textContent = `ذكر ${index + 1}`;
        }
        if (favoriteBtn) {
            const favoriteLabel = isFavoriteItem ? 'إزالة الذكر من المفضلة' : 'إضافة الذكر إلى المفضلة';
            favoriteBtn.setAttribute('aria-pressed', String(isFavoriteItem));
            favoriteBtn.setAttribute('aria-label', favoriteLabel);
            favoriteBtn.setAttribute('title', favoriteLabel);
            if (favoriteIcon) {
                favoriteIcon.className = `fa-${isFavoriteItem ? 'solid' : 'regular'} fa-star`;
            }
            if (typeof onToggleFavoriteItem === 'function') {
                favoriteBtn.addEventListener('click', () => onToggleFavoriteItem(itemId));
            }
        }
        if (textEl) {
            textEl.textContent = itemText;
        }
        if (metaEl) {
            metaEl.textContent = itemMeta;
        }
        if (counterValue) {
            counterValue.textContent = `${current} / ${target}`;
        }
        if (progressFill) {
            setProgressPercent(progressFill, ratio * 100);
        }
        if (counterBtn) {
            counterBtn.disabled = isDone;
            if (!isDone) {
                counterBtn.addEventListener('click', () => onTick(index, target));
            }
        }
        if (copyBtn) {
            copyBtn.setAttribute('title', 'نسخ الذكر');
            copyBtn.addEventListener('click', () => onCopy(itemText));
        }

        listContainer.appendChild(clone);
    });

    return true;
}

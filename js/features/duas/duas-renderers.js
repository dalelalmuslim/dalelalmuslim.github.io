function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFilterButton(filter, activeFilter) {
  const labels = {
    all: 'الكل',
    featured: 'مختارة',
    quran: 'من القرآن',
    hadith: 'من السنة'
  };

  return `
    <button
      type="button"
      class="duas-filter-chip${activeFilter === filter ? ' is-active' : ''}"
      data-duas-action="set-filter"
      data-duas-value="${filter}"
      aria-pressed="${activeFilter === filter ? 'true' : 'false'}"
    >${labels[filter]}</button>
  `;
}

export function renderDuasShell({ activeFilter, searchQuery, showCatalogHome = true }) {
  return `
    <div class="duas-shell${showCatalogHome ? '' : ' duas-shell--session-active'}">
      <div id="duasCatalogHome" class="duas-catalog-home${showCatalogHome ? '' : ' is-hidden'}">
        <section class="cardx duas-toolbar" aria-label="البحث والتصفية في الأدعية">
          <div class="duas-toolbar__search">
            <div class="duas-search-wrap">
              <input id="duasSearchInput" class="input duas-search" type="search" value="${escapeHtml(searchQuery || '')}" placeholder="ابحث عن دعاء أو تصنيف" aria-label="ابحث في الأدعية" />
              <button type="button" class="btn btn--ghost duas-search__clear${searchQuery ? '' : ' is-hidden'}" data-duas-action="clear-search" aria-label="مسح البحث"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>
          </div>
          <div id="duasFilters" class="duas-filters" role="tablist" aria-label="فلاتر الأدعية">
            ${['all', 'featured', 'quran', 'hadith'].map((filter) => renderFilterButton(filter, activeFilter)).join('')}
          </div>
        </section>

        <div id="duaCategoriesGrid" class="duas-categories-grid" aria-live="polite"></div>
      </div>

      <div id="duaCategoryContent" class="duas-category-content${showCatalogHome ? ' is-hidden' : ''}" aria-live="polite"></div>
    </div>
  `;
}

export function renderDuasCatalog(cards = []) {
  if (!cards.length) {
    return `
      <div class="cardx duas-empty-state">
        <p class="muted">لا توجد نتائج مطابقة الآن. امسح البحث أو غيّر الفلتر.</p>
      </div>
    `;
  }

  return cards.map((card) => `
    <button type="button" class="duas-category-card duas-tone--${escapeHtml(card.accentTone)}" data-duas-action="open-category" data-duas-value="${escapeHtml(card.slug)}">
      <span class="duas-category-card__top">
        <span class="duas-category-card__headline">
          <span class="duas-category-card__title">${escapeHtml(card.title)}</span>
          <span class="duas-category-card__meta-inline">
            <span>${card.itemCount} دعاء</span>
            <span aria-hidden="true">•</span>
            <span>${escapeHtml(card.sourceMeta)}</span>
          </span>
        </span>
        <span class="duas-category-card__icon"><i class="fa-solid ${escapeHtml(card.icon)}" aria-hidden="true"></i></span>
      </span>
    </button>
  `).join('');
}

export function renderDuasSession(sessionVm) {
  const itemsHtml = sessionVm.items.map((item, index) => `
    <article class="cardx dua-item-card${sessionVm.activeDuaId === item.id ? ' is-active' : ''}" data-duas-action="set-active-dua" data-duas-value="${item.id}">
      <div class="dua-item-card__header">
        <div class="dua-item-card__top">
          <span class="duas-badge">دعاء ${index + 1}</span>
          ${item.repeat > 1 ? `<span class="duas-badge">يكرر ${item.repeat}</span>` : ''}
          ${item.source ? `<span class="dua-item-card__source">${escapeHtml(item.source === 'Quran' ? 'من القرآن' : 'من السنة')}</span>` : ''}
        </div>
      </div>
      <p class="amiri-text dua-item-card__text">${escapeHtml(item.text)}</p>
      <div class="dua-item-card__footer">
        ${item.referenceText ? `<p class="dua-item-card__reference muted">${escapeHtml(item.referenceText)}</p>` : '<span></span>'}
        <div class="dua-item-card__actions">
          <button type="button" class="btn btn--ghost" data-duas-action="copy-dua" data-duas-dua-id="${item.id}"><i class="fa-solid fa-copy" aria-hidden="true"></i> نسخ</button>
          <button type="button" class="btn btn--ghost" data-duas-action="share-dua" data-duas-dua-id="${item.id}"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i> مشاركة</button>
        </div>
      </div>
    </article>
  `).join('');

  return `
    <div class="duas-session${sessionVm.largeText ? ' is-large-text' : ''}">
      <section class="cardx duas-session-panel">
        <div class="duas-session-panel__top">
          <button type="button" class="btn btn--ghost duas-session-panel__close" data-duas-action="close-category" aria-label="إغلاق التصنيف والعودة للواجهة الرئيسية">
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
          <div class="duas-session-panel__content">
            <h2 class="amiri-text cardx__title duas-session-panel__title">${escapeHtml(sessionVm.title)}</h2>
            ${sessionVm.description ? `<p class="muted duas-session-panel__description">${escapeHtml(sessionVm.description)}</p>` : ''}
            <div class="duas-session-panel__meta">
              <span class="duas-chip">${sessionVm.itemCount} دعاء</span>
              <span class="duas-chip">${escapeHtml(sessionVm.sourceMeta)}</span>
            </div>
          </div>
        </div>
      </section>
      <div class="duas-session-list">${itemsHtml}</div>
    </div>
  `;
}

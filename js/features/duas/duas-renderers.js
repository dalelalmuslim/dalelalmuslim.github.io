function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFavoriteIcon(isFavorite) {
  return isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
}

function renderFilterButton(filter, activeFilter) {
  const labels = {
    all: 'الكل',
    featured: 'مختارة',
    quran: 'من القرآن',
    hadith: 'من السنة',
    favorites: 'المفضلة'
  };

  const icons = {
    favorites: '<i class="fa-regular fa-star" aria-hidden="true"></i>'
  };

  return `
    <button
      type="button"
      class="duas-filter-chip${activeFilter === filter ? ' is-active' : ''}"
      data-duas-action="set-filter"
      data-duas-value="${escapeHtml(filter)}"
      aria-pressed="${activeFilter === filter ? 'true' : 'false'}"
    >${icons[filter] || ''}<span>${labels[filter]}</span></button>
  `;
}

function renderDailyDuaCard(dailyDua) {
  if (!dailyDua?.text) return '';

  return `
    <button
      type="button"
      class="duas-daily-card"
      data-duas-action="open-category"
      data-duas-value="${escapeHtml(dailyDua.categorySlug || '')}"
      aria-label="عرض دعاء نفحة اليوم"
    >
      <span class="duas-daily-card__icon" aria-hidden="true"><i class="fa-solid fa-box-open"></i></span>
      <span class="duas-daily-card__body">
        <span class="duas-daily-card__title">${escapeHtml(dailyDua.title || 'نفحة اليوم')}</span>
        <span class="amiri-text duas-daily-card__text">${escapeHtml(dailyDua.shortText || dailyDua.text)}</span>
        <span class="duas-daily-card__action"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i> عرض الدعاء</span>
      </span>
    </button>
  `;
}

export function renderDuasShell({ activeFilter, searchQuery, dailyDua = null, showCatalogHome = true }) {
  return `
    <div class="duas-shell${showCatalogHome ? '' : ' duas-shell--session-active'}">
      <div id="duasCatalogHome" class="duas-catalog-home${showCatalogHome ? '' : ' is-hidden'}">
        <section class="duas-hero" aria-labelledby="duasHeroTitle">
          <div class="duas-hero__scene" aria-hidden="true">
            <span class="duas-hero__moon"></span>
            <span class="duas-hero__dome duas-hero__dome--main"></span>
            <span class="duas-hero__dome duas-hero__dome--small"></span>
            <span class="duas-hero__minaret"></span>
            <span class="duas-hero__leaf duas-hero__leaf--one"></span>
            <span class="duas-hero__leaf duas-hero__leaf--two"></span>
          </div>
          <div class="duas-hero__ornament" aria-hidden="true"></div>
          <div class="duas-hero__content">
            <p class="duas-hero__eyebrow">قسم الأدعية</p>
            <h2 id="duasHeroTitle" class="duas-hero__title">الأدعية</h2>
            <p class="duas-hero__subtitle">أدعية مختارة لوقتك ويومك</p>
          </div>
          ${renderDailyDuaCard(dailyDua)}
        </section>

        <section class="duas-toolbar" aria-label="البحث والتصفية في الأدعية">
          <div class="duas-toolbar__search">
            <div class="duas-search-wrap">
              <input id="duasSearchInput" class="input duas-search" type="search" value="${escapeHtml(searchQuery || '')}" placeholder="ابحث عن دعاء أو تصنيف" aria-label="ابحث في الأدعية" />
              <button type="button" class="btn btn--ghost duas-search__clear${searchQuery ? '' : ' is-hidden'}" data-duas-action="clear-search" aria-label="مسح البحث"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>
          </div>
          <div id="duasFilters" class="duas-filters" role="group" aria-label="فلاتر الأدعية">
            ${['all', 'featured', 'quran', 'hadith', 'favorites'].map((filter) => renderFilterButton(filter, activeFilter)).join('')}
          </div>
        </section>

        <div id="duaCategoriesGrid" class="duas-categories-grid" aria-live="polite"></div>
      </div>

      <div id="duaCategoryContent" class="duas-category-content${showCatalogHome ? ' is-hidden' : ''}" aria-live="polite"></div>
    </div>
  `;
}

export function renderDuasLoadingState(message = 'جاري تحميل الأدعية...') {
  return `
    <div class="duas-skeleton-stack" aria-busy="true" aria-label="${escapeHtml(message)}">
      <div class="duas-skeleton-card"></div>
      <div class="duas-skeleton-card"></div>
      <div class="duas-skeleton-card"></div>
    </div>
  `;
}

export function renderDuasErrorState(message = 'تعذر تحميل الأدعية الآن.') {
  return `
    <div class="duas-empty-state duas-empty-state--error">
      <span class="duas-empty-state__icon" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
      <p>${escapeHtml(message)}</p>
      <button type="button" class="btn btn--ghost" data-duas-action="retry-load">إعادة المحاولة</button>
    </div>
  `;
}

export function renderDuasCatalog(cards = []) {
  if (!cards.length) {
    return `
      <div class="duas-empty-state">
        <span class="duas-empty-state__icon" aria-hidden="true"><i class="fa-regular fa-face-smile"></i></span>
        <p>لا توجد نتائج مطابقة الآن. امسح البحث أو غيّر الفلتر.</p>
      </div>
    `;
  }

  return cards.map((card) => `
    <article class="duas-category-card duas-tone--${escapeHtml(card.accentTone)}${card.isFavorite ? ' is-favorite' : ''}">
      <button type="button" class="duas-category-card__main" data-duas-action="open-category" data-duas-value="${escapeHtml(card.slug)}">
        <span class="duas-category-card__icon" aria-hidden="true"><i class="fa-solid ${escapeHtml(card.icon)}"></i></span>
        <span class="duas-category-card__copy">
          <span class="duas-category-card__title">${escapeHtml(card.title)}</span>
          ${card.description ? `<span class="duas-category-card__description">${escapeHtml(card.description)}</span>` : ''}
          <span class="duas-category-card__source"><span aria-hidden="true"></span>${escapeHtml(card.sourceMeta)}</span>
        </span>
        <span class="duas-category-card__count">${card.itemCount} دعاء</span>
      </button>
      <button
        type="button"
        class="duas-category-card__favorite"
        data-duas-action="toggle-favorite"
        data-duas-value="${escapeHtml(card.slug)}"
        aria-label="${card.isFavorite ? 'إزالة التصنيف من المفضلة' : 'إضافة التصنيف إلى المفضلة'}"
        aria-pressed="${card.isFavorite ? 'true' : 'false'}"
      ><i class="${getFavoriteIcon(card.isFavorite)}" aria-hidden="true"></i></button>
    </article>
  `).join('');
}

function renderDuaSourceBadge(item) {
  if (!item.sourceMeta) return '';
  return `<span class="dua-item-card__source"><span aria-hidden="true"></span>${escapeHtml(item.sourceMeta)}</span>`;
}

function renderRepeatBadge(item) {
  if (!Number.isFinite(Number(item.repeat)) || Number(item.repeat) <= 1) return '';
  return `<span class="duas-badge duas-badge--repeat"><i class="fa-solid fa-rotate" aria-hidden="true"></i> يكرر ${Number(item.repeat)}</span>`;
}

function renderDuaItem(item, index, sessionVm) {
  const isActive = sessionVm.activeDuaId === item.id;
  return `
    <article class="dua-item-card${isActive ? ' is-active' : ''}" data-duas-action="set-active-dua" data-duas-value="${escapeHtml(item.id)}">
      <div class="dua-item-card__meta-row">
        <span class="duas-badge">دعاء ${index + 1}</span>
        ${renderRepeatBadge(item)}
        ${renderDuaSourceBadge(item)}
      </div>
      <p class="amiri-text dua-item-card__text">${escapeHtml(item.text)}</p>
      ${item.referenceText ? `<p class="dua-item-card__reference">${escapeHtml(item.referenceText)}</p>` : ''}
      <div class="dua-item-card__footer">
        <button type="button" class="dua-action-btn" data-duas-action="share-dua" data-duas-dua-id="${escapeHtml(item.id)}"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i> مشاركة</button>
        <span class="dua-item-card__divider" aria-hidden="true"></span>
        <button type="button" class="dua-action-btn" data-duas-action="copy-dua" data-duas-dua-id="${escapeHtml(item.id)}"><i class="fa-regular fa-copy" aria-hidden="true"></i> نسخ</button>
      </div>
    </article>
  `;
}

export function renderDuasSession(sessionVm) {
  const visibleItems = Array.isArray(sessionVm.visibleItems) ? sessionVm.visibleItems : sessionVm.items;
  const itemsHtml = visibleItems.length
    ? visibleItems.map((item, index) => renderDuaItem(item, index, sessionVm)).join('')
    : `
      <div class="duas-empty-state">
        <span class="duas-empty-state__icon" aria-hidden="true"><i class="fa-regular fa-note-sticky"></i></span>
        <p>لا توجد أدعية داخل هذا التصنيف حاليًا.</p>
      </div>
    `;

  return `
    <div class="duas-session duas-tone--${escapeHtml(sessionVm.accentTone)}${sessionVm.largeText ? ' is-large-text' : ''}">
      <header class="duas-reader-bar">
        <button type="button" class="duas-reader-bar__back" data-duas-action="close-category" aria-label="العودة إلى قسم الأدعية">
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
        <h2 class="duas-reader-bar__title">${escapeHtml(sessionVm.title)}</h2>
        <div class="duas-reader-bar__actions">
          <button
            type="button"
            class="duas-reader-action${sessionVm.isFavorite ? ' is-active' : ''}"
            data-duas-action="toggle-favorite"
            data-duas-value="${escapeHtml(sessionVm.slug)}"
            aria-label="${sessionVm.isFavorite ? 'إزالة التصنيف من المفضلة' : 'إضافة التصنيف إلى المفضلة'}"
            aria-pressed="${sessionVm.isFavorite ? 'true' : 'false'}"
          ><i class="${getFavoriteIcon(sessionVm.isFavorite)}" aria-hidden="true"></i></button>
          <button
            type="button"
            class="duas-reader-action${sessionVm.largeText ? ' is-active' : ''}"
            data-duas-action="toggle-large-text"
            aria-label="تبديل حجم خط الأدعية"
            aria-pressed="${sessionVm.largeText ? 'true' : 'false'}"
          ><span aria-hidden="true">A<span>A</span></span></button>
        </div>
      </header>

      <section class="duas-session-hero" aria-labelledby="duasSessionTitle">
        <div class="duas-session-hero__art" aria-hidden="true">
          <span><i class="fa-solid ${escapeHtml(sessionVm.icon)}"></i></span>
          <i></i>
        </div>
        <div class="duas-session-hero__ornament" aria-hidden="true"></div>
        <div class="duas-session-hero__content">
          <h3 id="duasSessionTitle" class="duas-session-hero__title">${escapeHtml(sessionVm.title)}</h3>
          ${sessionVm.description ? `<p class="duas-session-hero__description">${escapeHtml(sessionVm.description)}</p>` : ''}
          <div class="duas-session-hero__meta">
            <span class="duas-chip"><i class="fa-solid fa-book-open" aria-hidden="true"></i>${escapeHtml(sessionVm.sourceMeta)}</span>
            <span class="duas-chip"><i class="fa-solid fa-list-check" aria-hidden="true"></i>${sessionVm.itemCount} دعاء</span>
          </div>
        </div>
      </section>

      <div class="duas-session-list">${itemsHtml}</div>

      ${sessionVm.hasMore ? `
        <button type="button" class="duas-load-more" data-duas-action="load-more">
          عرض ${sessionVm.nextPageCount} دعاء أخرى
        </button>
      ` : ''}
    </div>
  `;
}

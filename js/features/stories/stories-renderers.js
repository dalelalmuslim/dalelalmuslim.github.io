function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderIcon(name) {
  return `<i class="fa-solid ${escapeHtml(name)}" aria-hidden="true"></i>`;
}

export function renderStoriesShell({ query = '' } = {}) {
  return `
    <div class="stories-root">
      <div id="storyCategoriesGrid" class="stories-stream-view">
        <section class="stories-intro" aria-labelledby="storiesIntroTitle">
          <div>
            <h3 id="storiesIntroTitle" class="stories-intro__title">قصص قصيرة، بعبرة واضحة.</h3>
            <p class="stories-intro__desc">اختر تصنيفًا أو ابحث عن فائدة تقرأها الآن دون زحمة.</p>
          </div>
        </section>

        <section class="stories-search-panel" aria-label="البحث في القصص">
          <label class="sr-only" for="storiesSearchInput">ابحث عن قصة أو فائدة</label>
          <div class="stories-search-control">
            ${renderIcon('fa-magnifying-glass')}
            <input
              id="storiesSearchInput"
              class="input stories-search-input"
              type="search"
              placeholder="ابحث عن قصة أو فائدة..."
              value="${escapeHtml(query)}"
              autocomplete="off"
            />
            <button type="button" class="stories-clear-search is-hidden" data-stories-action="clear-search" aria-label="مسح البحث">
              ${renderIcon('fa-xmark')}
            </button>
          </div>
        </section>

        <nav id="storiesFilterChips" class="stories-filter-chips" aria-label="تصنيفات القصص"></nav>
        <div id="storiesStreamSummary" class="stories-stream-summary" aria-live="polite"></div>
        <div id="storiesStreamList" class="stories-stream-list" aria-live="polite"></div>
      </div>
      <div id="storyCategoryContent" class="stories-reader-host is-hidden"></div>
    </div>
  `;
}

export function renderFilterChips(tabs = []) {
  return tabs.map((tab) => `
    <button
      type="button"
      class="stories-filter-chip ${tab.isActive ? 'is-active' : ''}"
      data-stories-action="set-filter"
      data-stories-value="${escapeHtml(tab.value)}"
      aria-pressed="${tab.isActive ? 'true' : 'false'}"
    >
      <span>${escapeHtml(tab.label)}</span>
      <small>${Number(tab.count || 0)}</small>
    </button>
  `).join('');
}

export function renderStreamSummary(vm) {
  const showCategoryHint = !vm.isSearchActive && vm.filter !== 'all';
  return `
    <section class="stories-summary-card ${showCategoryHint ? 'stories-summary-card--category' : ''}">
      <div>
        <p class="stories-summary-card__eyebrow">${vm.isSearchActive ? 'بحث' : 'القصص'}</p>
        <h3 class="stories-summary-card__title">${escapeHtml(vm.summaryText)}</h3>
        ${showCategoryHint ? `<p class="stories-summary-card__desc">${escapeHtml(vm.activeTab.description)}</p>` : ''}
      </div>
    </section>
  `;
}

export function renderLoadingState(message = 'جاري تحميل القصص...') {
  return `
    <div class="stories-state stories-state--loading">
      <span class="stories-state__spinner" aria-hidden="true"></span>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderEmptyState(title = 'لا توجد قصص متاحة الآن.', hint = '') {
  return `
    <section class="stories-state stories-state--empty">
      <h3>${escapeHtml(title)}</h3>
      ${hint ? `<p>${escapeHtml(hint)}</p>` : ''}
    </section>
  `;
}

export function renderErrorState(message = 'تعذر تحميل القصص.') {
  return `
    <section class="stories-state stories-state--error">
      <h3>تعذر تحميل القصص.</h3>
      <p>${escapeHtml(message)}</p>
      <button type="button" class="btn btn--primary" data-stories-action="retry-load">إعادة المحاولة</button>
    </section>
  `;
}

function renderStoryCard(story) {
  const meta = [story.categoryTitle, story.readingTimeLabel].filter(Boolean).join(' • ');
  return `
    <button
      type="button"
      class="stories-stream-card stories-stream-card--${escapeHtml(story.categoryAccentTone || 'emerald')}"
      data-stories-action="open-story"
      data-stories-value="${escapeHtml(story.storyKey)}"
      aria-label="اقرأ ${escapeHtml(story.title)}"
    >
      <span class="stories-stream-card__benefit-label">الفائدة</span>
      <span class="stories-stream-card__benefit">${escapeHtml(story.benefit)}</span>
      <span class="stories-stream-card__title">${escapeHtml(story.title)}</span>
      <span class="stories-stream-card__meta">${escapeHtml(meta)}</span>
      <span class="stories-stream-card__cta">اقرأ <i class="fa-solid fa-arrow-left" aria-hidden="true"></i></span>
    </button>
  `;
}

export function renderStoriesStream(vm) {
  if (!vm || vm.isEmpty) {
    return renderEmptyState(vm?.emptyTitle, vm?.emptyHint);
  }

  const cards = vm.visibleStories.map(renderStoryCard).join('');
  const more = vm.hasMore
    ? `
      <button type="button" class="btn btn--ghost btn--full stories-load-more" data-stories-action="load-more">
        عرض المزيد
        <span>${Number(vm.visibleCount || 0)} من ${Number(vm.totalCount || 0)}</span>
      </button>
    `
    : '';

  return `${cards}${more}`;
}

function formatStoryShareText(story) {
  if (!story) return '';
  return [
    story.title,
    story.categoryTitle,
    '',
    story.story,
    story.lesson ? `\nالعبرة: ${story.lesson}` : '',
    story.source ? `\nالمصدر: ${story.source}` : ''
  ].filter(Boolean).join('\n').trim();
}

export function buildStoryShareText(story) {
  return formatStoryShareText(story);
}

export function renderStoriesReader(vm) {
  if (!vm?.activeStory) {
    return renderEmptyState('تعذر فتح القصة.', 'ارجع إلى قائمة القصص وحاول مرة أخرى.');
  }

  const story = vm.activeStory;
  const meta = [story.categoryTitle, story.readingTimeLabel].filter(Boolean).join(' • ');
  const source = story.source ? `<p class="stories-reader-source">المصدر: ${escapeHtml(story.source)}</p>` : '';
  const lesson = story.lesson
    ? `
      <section class="stories-reader-lesson">
        <h3>العبرة</h3>
        <p>${escapeHtml(story.lesson)}</p>
      </section>
    `
    : '<div class="stories-reader-soft-divider" aria-hidden="true"></div>';
  const nextButton = vm.hasNext
    ? `<button type="button" class="btn btn--primary stories-reader-next" data-stories-action="next-story">القصة التالية</button>`
    : `<button type="button" class="btn btn--primary stories-reader-next" data-stories-action="close-reader">العودة إلى القصص</button>`;

  return `
    <article class="stories-reader" aria-labelledby="storiesReaderTitle">
      <header class="stories-reader-head">
        <button type="button" class="btn btn--ghost stories-reader-back" data-stories-action="close-reader">
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          رجوع
        </button>
        <span class="stories-reader-counter">${escapeHtml(vm.counterText)}</span>
      </header>

      <section class="stories-reader-title-block">
        <h2 id="storiesReaderTitle" class="stories-reader-title">${escapeHtml(story.title)}</h2>
        <p class="stories-reader-meta">${escapeHtml(meta)}</p>
      </section>

      <div class="stories-reader-divider" aria-hidden="true"></div>

      <div class="stories-reader-body amiri-text">${escapeHtml(story.story)}</div>

      ${lesson}
      ${source}

      <div class="stories-reader-actions">
        <button type="button" class="btn btn--ghost" data-stories-action="copy-story" data-stories-value="${escapeHtml(story.storyKey)}">
          <i class="fa-solid fa-copy" aria-hidden="true"></i>
          نسخ
        </button>
        <button type="button" class="btn btn--ghost" data-stories-action="share-story" data-stories-value="${escapeHtml(story.storyKey)}">
          <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
          مشاركة
        </button>
      </div>

      <div class="stories-reader-bottom-nav">
        ${nextButton}
      </div>
    </article>
  `;
}

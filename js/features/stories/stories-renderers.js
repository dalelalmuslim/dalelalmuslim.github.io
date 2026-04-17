import { buildProgressClassName, clampProgressPercent } from '../../shared/dom/dom-helpers.js';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderFilterChip(value, label, activeFilter) {
  return `
    <button type="button" class="stories-filter-chip ${activeFilter === value ? 'is-active' : ''}" data-stories-action="set-filter" data-stories-value="${value}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderReaderMiniCard(story, label = '') {
  if (!story) return '';
  return `
    <article class="stories-mini-card stories-mini-card--${label ? 'linked' : 'plain'}">
      ${label ? `<span class="stories-mini-card__label">${escapeHtml(label)}</span>` : ''}
      <h3 class="stories-mini-card__title">${escapeHtml(story.title)}</h3>
      <p class="stories-mini-card__excerpt">${escapeHtml(story.excerpt)}</p>
      <button type="button" class="btn btn--ghost" data-stories-action="open-story" data-stories-value="${escapeHtml(story.storyKey)}">${label === 'القصة التالية' ? 'انتقل إليها' : 'افتح القصة'}</button>
    </article>
  `;
}

function renderReaderListCard(story) {
  return `
    <article class="stories-list-card ${story.isActive ? 'is-active' : ''}">
      <div class="stories-list-card__main">
        <div class="stories-list-card__meta-row">
          <span class="stories-chip stories-chip--soft">${escapeHtml(story.source || story.categoryTitle)}</span>
          <span class="stories-chip stories-chip--soft">${Number(story.readingMinutes || 1)} دقائق</span>
        </div>
        <h3 class="stories-list-card__title">${escapeHtml(story.title)}</h3>
        <p class="stories-list-card__excerpt">${escapeHtml(story.excerpt)}</p>
      </div>
      <div class="stories-list-card__actions">
        <button type="button" class="btn btn--ghost btn--icon" data-stories-action="toggle-favorite-story" data-stories-value="${escapeHtml(story.storyKey)}" aria-label="${story.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}">
          <i class="fa-${story.isFavorite ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn btn--ghost btn--icon" data-stories-action="toggle-bookmark" data-stories-value="${escapeHtml(story.storyKey)}" aria-label="${story.isBookmarked ? 'إزالة العلامة' : 'حفظ العلامة'}">
          <i class="fa-${story.isBookmarked ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i>
        </button>
        <button type="button" class="btn ${story.isActive ? 'btn--primary' : 'btn--ghost'}" data-stories-action="open-story" data-stories-value="${escapeHtml(story.storyKey)}">
          ${story.isActive ? 'أنت هنا الآن' : 'اقرأ الآن'}
        </button>
      </div>
    </article>
  `;
}

function renderRetentionStoryCard(story, label = '') {
  if (!story) return '';
  return `
    <article class="stories-retention-card stories-surface cardx">
      <div class="stories-retention-card__head">
        ${label ? `<span class="stories-badge stories-badge--accent">${escapeHtml(label)}</span>` : `<span class="stories-chip stories-chip--soft">${escapeHtml(story.categoryTitle || '')}</span>`}
        <span class="stories-chip stories-chip--soft">${Number(story.readingMinutes || 1)} دقائق</span>
      </div>
      <h3 class="stories-retention-card__title">${escapeHtml(story.title)}</h3>
      <p class="stories-retention-card__excerpt">${escapeHtml(story.excerpt)}</p>
      ${story.reason ? `<p class="stories-retention-card__reason">${escapeHtml(story.reason)}</p>` : ''}
      <div class="stories-retention-card__actions">
        <button type="button" class="btn btn--primary stories-action-btn" data-stories-action="open-story" data-stories-value="${escapeHtml(story.storyKey)}">${label === 'تابع القراءة' ? 'تابع الآن' : 'افتح الآن'}</button>
        <button type="button" class="btn btn--ghost btn--icon" data-stories-action="toggle-favorite-story" data-stories-value="${escapeHtml(story.storyKey)}" aria-label="إضافة إلى المفضلة">
          <i class="fa-${story.isFavorite ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i>
        </button>
      </div>
    </article>
  `;
}

function renderPinnedCategoryCard(card) {
  return `
    <article class="stories-pinned-card stories-pinned-card--${escapeHtml(card.accentTone || 'default')} stories-surface cardx">
      <div class="stories-pinned-card__head">
        <span class="stories-category-card__icon"><i class="fa-solid ${escapeHtml(card.icon || 'fa-book-open') }" aria-hidden="true"></i></span>
        <button type="button" class="btn btn--ghost btn--icon stories-pin-btn is-active" data-stories-action="toggle-pin-category" data-stories-value="${escapeHtml(card.slug)}" aria-label="إلغاء تثبيت التصنيف">
          <i class="fa-solid fa-thumbtack" aria-hidden="true"></i>
        </button>
      </div>
      <h3 class="stories-pinned-card__title">${escapeHtml(card.title)}</h3>
      <p class="stories-pinned-card__desc">${escapeHtml(card.description)}</p>
      ${card.previewTitle ? `<div class="stories-pinned-card__preview">${escapeHtml(card.previewTitle)}</div>` : ''}
      <div class="stories-pinned-card__meta">
        <span class="stories-chip stories-chip--soft">${Number(card.storyCount || 0)} قصة</span>
        <span class="stories-chip stories-chip--soft">${Number(card.estimatedMinutes || 1)} دقائق</span>
      </div>
      <button type="button" class="btn btn--ghost stories-action-btn" data-stories-action="open-category" data-stories-value="${escapeHtml(card.slug)}">افتح التصنيف</button>
    </article>
  `;
}

export function renderStoriesShell({ resume, storyOfDay, insights, retention, activeFilter = 'all', searchQuery = '' }) {
  const recentStories = retention?.recentStories || [];
  const pinnedCategories = retention?.pinnedCategories || [];
  const recommendations = retention?.recommendations || [];
  const weeklyReflection = retention?.weeklyReflection || null;

  const resumeMarkup = resume
    ? `
      <section class="cardx stories-resume stories-surface">
        <div class="stories-badge">تابع القراءة</div>
        <h2 class="stories-resume__title">${escapeHtml(resume.title)}</h2>
        <p class="stories-resume__subtitle">${escapeHtml(resume.subtitle)}</p>
        <p class="stories-resume__helper">${escapeHtml(resume.helperText)}</p>
        <div class="stories-resume__meta">${escapeHtml(resume.meta)}</div>
        <button type="button" class="btn btn--primary stories-action-btn" data-stories-action="continue-story" data-stories-value="${escapeHtml(resume.storyKey)}" data-stories-category="${escapeHtml(resume.categorySlug)}">${escapeHtml(resume.actionLabel)}</button>
      </section>
    `
    : '';

  const storyOfDayMarkup = storyOfDay
    ? `
      <section class="cardx stories-daily stories-surface">
        <div class="stories-badge stories-badge--accent">${escapeHtml(storyOfDay.title)}</div>
        <h2 class="stories-daily__title">${escapeHtml(storyOfDay.storyTitle)}</h2>
        <p class="stories-daily__excerpt">${escapeHtml(storyOfDay.excerpt)}</p>
        <div class="stories-daily__meta">${escapeHtml(storyOfDay.categoryTitle)}</div>
        <button type="button" class="btn btn--ghost stories-action-btn" data-stories-action="open-story-of-day" data-stories-value="${escapeHtml(storyOfDay.storyKey)}" data-stories-category="${escapeHtml(storyOfDay.categorySlug)}">${escapeHtml(storyOfDay.actionLabel)}</button>
      </section>
    `
    : '';

  return `
    <div class="stories-shell">
      <div id="storyCategoriesGrid" class="stories-main-view">
        <section class="cardx stories-hero stories-surface">
          <div class="stories-hero__content">
            <div class="stories-hero__eyebrow"><span class="stories-badge">قصص وعبر</span><span class="stories-chip stories-chip--soft">قراءة هادئة • بلا تشتيت</span></div>
            <h1 class="stories-hero__title">اقرأ قصة قصيرة، وخذ منها معنى يبقى معك.</h1>
            <p class="stories-hero__desc muted">واجهة قراءة هادئة مع متابعة آخر قصة، بحث سريع، ومفضلة وعلامات مرجعية لتبقى العودة سهلة كل يوم.</p>
            <div class="stories-hero__actions">
              ${resume ? `<button type="button" class="btn btn--primary stories-action-btn" data-stories-action="continue-story" data-stories-value="${escapeHtml(resume.storyKey)}" data-stories-category="${escapeHtml(resume.categorySlug)}"><i class="fa-solid fa-book-open-reader" aria-hidden="true"></i> تابع القراءة</button>` : `<button type="button" class="btn btn--primary stories-action-btn" data-stories-action="set-filter" data-stories-value="featured"><i class="fa-solid fa-sparkles" aria-hidden="true"></i> ابدأ بالمقترحات</button>`}
              ${storyOfDay ? `<button type="button" class="btn btn--ghost stories-action-btn" data-stories-action="open-story-of-day" data-stories-value="${escapeHtml(storyOfDay.storyKey)}" data-stories-category="${escapeHtml(storyOfDay.categorySlug)}"><i class="fa-solid fa-star" aria-hidden="true"></i> قصة اليوم</button>` : ''}
            </div>
            <div class="stories-hero__microstats">
              <span class="stories-chip stories-chip--soft">${Number(insights?.activeDays || 0)} أيام قراءة</span>
              <span class="stories-chip stories-chip--soft">${Number(insights?.favoriteCount || 0)} مفضلة</span>
              <span class="stories-chip stories-chip--soft">${Number(insights?.streak || 0)} أيام متتابعة</span>
            </div>
          </div>
          <div class="stories-top-grid">
            ${resumeMarkup}
            ${storyOfDayMarkup}
          </div>
        </section>

        <section class="cardx stories-insight stories-surface">
          <div class="stories-insight__grid">
            <div class="stories-insight__metric"><span class="stories-insight__value">${Number(insights?.activeDays || 0)}</span><span class="stories-insight__label">أيام قراءة</span></div>
            <div class="stories-insight__metric"><span class="stories-insight__value">${Number(insights?.favoriteCount || 0)}</span><span class="stories-insight__label">مفضلة</span></div>
            <div class="stories-insight__metric"><span class="stories-insight__value">${Number(insights?.bookmarkCount || 0)}</span><span class="stories-insight__label">علامات</span></div>
            <div class="stories-insight__metric"><span class="stories-insight__value">${Number(insights?.pinnedCount || 0)}</span><span class="stories-insight__label">مثبتة</span></div>
          </div>
          <div class="stories-insight__chips">
            <span class="stories-chip stories-chip--soft">${Number(insights?.streak || 0)} أيام متتابعة</span>
            <span class="stories-chip stories-chip--soft">${Number(insights?.featuredCount || 0)} تصنيفات مختارة</span>
          </div>
          <p class="stories-insight__hint">${escapeHtml(insights?.hint || '')}</p>
        </section>

        ${weeklyReflection ? `
          <section class="cardx stories-reflection stories-surface">
            <div class="stories-reflection__head">
              <div>
                <span class="stories-badge stories-badge--accent">${escapeHtml(weeklyReflection.title)}</span>
                <h2 class="stories-reflection__title">${escapeHtml(weeklyReflection.label)}</h2>
              </div>
              <span class="stories-chip stories-chip--soft">${escapeHtml(weeklyReflection.mood)}</span>
            </div>
            <p class="stories-reflection__detail">${escapeHtml(weeklyReflection.detail)}</p>
            <div class="stories-reflection__meta">
              <span class="stories-chip stories-chip--soft">${Number(weeklyReflection.activeDays || 0)} أيام نشطة</span>
              <span class="stories-chip stories-chip--soft">${Number(weeklyReflection.totalVisits || 0)} زيارة هذا الأسبوع</span>
            </div>
          </section>
        ` : ''}

        <section class="cardx stories-toolbar stories-surface">
          <div class="stories-toolbar__search">
            <div class="stories-search-wrap flex-1">
              <input id="storiesSearchInput" class="input stories-search" type="search" placeholder="ابحث عن قصة أو عبرة أو مصدر..." value="${escapeHtml(searchQuery)}" />
              <button type="button" class="btn btn--ghost btn--icon stories-search__clear ${searchQuery ? '' : 'is-hidden'}" data-stories-action="clear-search" aria-label="مسح البحث">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="stories-filters">
            ${renderFilterChip('all', 'الكل', activeFilter)}
            ${renderFilterChip('featured', 'مقترحة', activeFilter)}
            ${renderFilterChip('favorites', 'المفضلة', activeFilter)}
            ${renderFilterChip('recent', 'الأخيرة', activeFilter)}
            ${renderFilterChip('pinned', 'المثبتة', activeFilter)}
          </div>
          <p id="storiesSummaryText" class="stories-toolbar__summary muted"></p>
        </section>

        ${recentStories.length ? `
          <section class="stories-retention-block stories-retention-block--recent">
            <div class="stories-block-head">
              <div>
                <h2 class="stories-block-title">آخر ما قرأته</h2>
                <p class="stories-block-hint">ارجع بسرعة لآخر القصص التي مررت عليها مؤخرًا.</p>
              </div>
            </div>
            <div class="stories-retention-grid">
              ${recentStories.map((story, index) => renderRetentionStoryCard(story, index === 0 ? 'تابع القراءة' : 'زيارة أخيرة')).join('')}
            </div>
          </section>
        ` : ''}

        ${pinnedCategories.length ? `
          <section class="stories-retention-block stories-retention-block--pinned">
            <div class="stories-block-head">
              <div>
                <h2 class="stories-block-title">التصنيفات المثبتة</h2>
                <p class="stories-block-hint">التصنيفات التي تريد الوصول إليها دائمًا في الأعلى.</p>
              </div>
            </div>
            <div class="stories-pinned-grid">
              ${pinnedCategories.map(renderPinnedCategoryCard).join('')}
            </div>
          </section>
        ` : ''}

        ${recommendations.length ? `
          <section class="stories-retention-block stories-retention-block--recommendations">
            <div class="stories-block-head">
              <div>
                <h2 class="stories-block-title">ماذا تقرأ بعد ذلك؟</h2>
                <p class="stories-block-hint">ترشيحات هادئة مبنية على آخر قراءة والمفضلات والتصنيفات المثبتة.</p>
              </div>
            </div>
            <div class="stories-retention-grid">
              ${recommendations.map((story) => renderRetentionStoryCard(story, story.reason || 'مقترحة لك')).join('')}
            </div>
          </section>
        ` : ''}

        <section id="storiesCardsGrid" class="stories-categories-grid"></section>
      </div>
      <div id="storyCategoryContent" class="is-hidden"></div>
    </div>
  `;
}

export function renderStoriesCatalog(cards) {
  return cards.map((card) => `
    <article class="stories-category-card stories-category-card--${escapeHtml(card.accentTone || 'default')} ${card.isResume ? 'is-resume' : ''} ${card.isPinned ? 'is-pinned' : ''}">
      <div class="stories-category-card__top">
        <span class="stories-category-card__icon"><i class="fa-solid ${escapeHtml(card.icon || 'fa-book-open') }" aria-hidden="true"></i></span>
        <div class="stories-category-card__top-actions">
          <span class="stories-category-card__badge">${escapeHtml(card.badgeLabel)}</span>
          <button type="button" class="btn btn--ghost btn--icon stories-pin-btn ${card.isPinned ? 'is-active' : ''}" data-stories-action="toggle-pin-category" data-stories-value="${escapeHtml(card.slug)}" aria-label="${card.isPinned ? 'إلغاء تثبيت التصنيف' : 'تثبيت التصنيف'}">
            <i class="fa-${card.isPinned ? 'solid' : 'regular'} fa-thumbtack" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <button type="button" class="stories-category-card__open" data-stories-action="open-category" data-stories-value="${escapeHtml(card.slug)}">
        <div class="stories-category-card__body">
          <div class="stories-category-card__eyebrow">
            <span class="stories-chip stories-chip--soft">${escapeHtml(card.sourceBadge)}</span>
            <span class="stories-chip stories-chip--soft">${escapeHtml(card.moodLabel)}</span>
            ${card.favoriteCount ? `<span class="stories-chip stories-chip--soft">${Number(card.favoriteCount)} مفضلة</span>` : ''}
          </div>
          <strong class="stories-category-card__title">${escapeHtml(card.title)}</strong>
          <span class="stories-category-card__description">${escapeHtml(card.description)}</span>
          ${card.previewTitle ? `<span class="stories-category-card__preview">${escapeHtml(card.previewTitle)}</span>` : ''}
        </div>
        <div class="stories-category-card__progress">
          <span class="stories-category-card__progress-label">${card.readCount ? `تم فتح ${card.readCount} من ${card.storyCount}` : `جاهزة للقراءة`}</span>
          <span class="stories-category-card__progress-track"><span class="stories-category-card__progress-fill ${buildProgressClassName((card.progressRatio || 0) * 100)}"></span></span>
        </div>
        <div class="stories-category-card__footer">
          <span>${Number(card.storyCount || 0)} قصة</span>
          <span>${Number(card.estimatedMinutes || 1)} دقائق</span>
        </div>
      </button>
    </article>
  `).join('');
}

export function renderStoriesReader(sessionVm) {
  if (!sessionVm || !sessionVm.activeStory) return '';
  const activeStory = sessionVm.activeStory;
  const progressText = `${Number(sessionVm.progressCurrent || 1)} من ${Number(sessionVm.storyCount || 1)}`;
  return `
    <div class="stories-reader ${sessionVm.focusMode ? 'stories-reader--focus-mode' : ''} ${sessionVm.largeText ? 'stories-reader--large-text' : ''}">
      <div class="stories-reader__backbar">
        <button type="button" class="btn back-btn" data-stories-action="close-category"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> العودة</button>
      </div>
      <section class="cardx stories-session-panel stories-surface mb-15">
        <div class="stories-session-panel__top">
          <div>
            <div class="stories-session-panel__eyebrow"><span class="stories-badge">قراءة هادئة</span><span class="stories-chip stories-chip--soft">${progressText}</span><span class="stories-chip stories-chip--soft">${escapeHtml(sessionVm.groupLabel)}</span>${sessionVm.isPinned ? '<span class="stories-chip stories-chip--soft">مثبت</span>' : ''}</div>
            <h2 class="stories-session-panel__title">${escapeHtml(sessionVm.title)}</h2>
            <p class="stories-session-panel__desc">${escapeHtml(sessionVm.description)}</p>
          </div>
          <div class="stories-session-panel__toggles">
            <button type="button" class="btn btn--ghost ${sessionVm.focusMode ? 'is-active' : ''}" data-stories-action="toggle-focus-mode"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i> وضع التركيز</button>
            <button type="button" class="btn btn--ghost ${sessionVm.largeText ? 'is-active' : ''}" data-stories-action="toggle-large-text"><i class="fa-solid fa-text-height" aria-hidden="true"></i> خط كبير</button>
            <button type="button" class="btn btn--ghost ${sessionVm.isPinned ? 'is-active' : ''}" data-stories-action="toggle-pin-category" data-stories-value="${escapeHtml(sessionVm.slug)}"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i> ${sessionVm.isPinned ? 'مثبت' : 'ثبّت التصنيف'}</button>
          </div>
        </div>
        <div class="stories-session-panel__meta">
          <span class="stories-chip stories-chip--soft">${Number(sessionVm.storyCount || 0)} قصة</span>
          <span class="stories-chip stories-chip--soft">${Number(sessionVm.estimatedMinutes || 1)} دقائق تقريبًا</span>
          <span class="stories-chip stories-chip--soft">${escapeHtml(sessionVm.moodLabel)}</span>
          ${sessionVm.remainingStoriesCount ? `<span class="stories-chip stories-chip--soft">متبقي ${sessionVm.remainingStoriesCount} قصص</span>` : '<span class="stories-chip stories-chip--soft">أكملت هذا التصنيف</span>'}
        </div>
        <div class="stories-progress">
          <div class="stories-progress__head"><span>تقدم القراءة</span><strong>${sessionVm.progressPercent}%</strong></div>
          <div class="stories-progress__track"><span class="stories-progress__fill ${buildProgressClassName(clampProgressPercent(sessionVm.progressPercent))}"></span></div>
        </div>
      </section>

      <article class="cardx story-reader-card stories-surface ${activeStory.isFavorite ? 'is-favorite' : ''}">
        <div class="story-reader-card__comfort">
          <span class="stories-chip stories-chip--soft">${progressText}</span>
          <span class="stories-chip stories-chip--soft">${Number(activeStory.readingMinutes || 1)} دقائق قراءة</span>
          <span class="stories-chip stories-chip--soft">متبقي تقريبًا ${Number(sessionVm.estimatedRemainingMinutes || 1)} دقائق</span>
        </div>
        <div class="story-reader-card__head">
          <div>
            <div class="story-reader-card__meta-row">
              <span class="stories-chip stories-chip--soft">${escapeHtml(activeStory.source || activeStory.categoryTitle)}</span>
              <span class="stories-chip stories-chip--soft">${escapeHtml(sessionVm.groupLabel)}</span>
              <span class="stories-chip stories-chip--soft">${escapeHtml(sessionVm.moodLabel)}</span>
            </div>
            <h3 class="story-reader-card__title">${escapeHtml(activeStory.title)}</h3>
            <p class="story-reader-card__excerpt">${escapeHtml(activeStory.excerpt)}</p>
          </div>
          <div class="story-reader-card__actions">
            <button type="button" class="btn btn--ghost btn--icon" data-stories-action="toggle-favorite-story" data-stories-value="${escapeHtml(activeStory.storyKey)}" aria-label="${activeStory.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}"><i class="fa-${activeStory.isFavorite ? 'solid' : 'regular'} fa-heart" aria-hidden="true"></i></button>
            <button type="button" class="btn btn--ghost btn--icon" data-stories-action="toggle-bookmark" data-stories-value="${escapeHtml(activeStory.storyKey)}" aria-label="${activeStory.isBookmarked ? 'إزالة العلامة' : 'حفظ العلامة'}"><i class="fa-${activeStory.isBookmarked ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i></button>
            <button type="button" class="btn btn--ghost btn--icon" data-stories-action="share-story" data-stories-value="${escapeHtml(activeStory.storyKey)}" aria-label="مشاركة القصة"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i></button>
            <button type="button" class="btn btn--ghost btn--icon" data-stories-action="copy-story" data-stories-value="${escapeHtml(activeStory.storyKey)}" aria-label="نسخ القصة"><i class="fa-solid fa-copy" aria-hidden="true"></i></button>
          </div>
        </div>
        <div class="story-reader-card__body amiri-text">${escapeHtml(activeStory.story)}</div>
        ${activeStory.lesson ? `<div class="story-reader-card__lesson"><span class="stories-badge stories-badge--accent">العبرة</span><p>${escapeHtml(activeStory.lesson)}</p></div>` : ''}
        <div class="story-reader-card__footer">
          ${sessionVm.previousStory ? `<button type="button" class="btn btn--ghost" data-stories-action="open-story" data-stories-value="${escapeHtml(sessionVm.previousStory.storyKey)}"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> السابقة</button>` : '<span></span>'}
          ${sessionVm.nextStory ? `<button type="button" class="btn btn--primary stories-action-btn" data-stories-action="open-story" data-stories-value="${escapeHtml(sessionVm.nextStory.storyKey)}">القصة التالية <i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>` : `<button type="button" class="btn btn--primary stories-action-btn" data-stories-action="close-category">عودة للتصنيف</button>`}
        </div>
      </article>

      ${(sessionVm.nextStory || sessionVm.previousStory) ? `
        <section class="stories-mini-grid">
          ${renderReaderMiniCard(sessionVm.previousStory, 'القصة السابقة')}
          ${renderReaderMiniCard(sessionVm.nextStory, 'القصة التالية')}
        </section>
      ` : ''}

      ${sessionVm.recommendedNext.length ? `
        <section class="stories-retention-block stories-retention-block--reader">
          <div class="stories-block-head">
            <div>
              <h3 class="stories-block-title">اقرأ بعد ذلك</h3>
              <p class="stories-block-hint">ترشيحات هادئة مبنية على آخر قراءتك والمفضلات والتصنيفات المثبتة.</p>
            </div>
          </div>
          <div class="stories-retention-grid">
            ${sessionVm.recommendedNext.map((story) => renderRetentionStoryCard(story, story.reason || 'مقترحة لك')).join('')}
          </div>
        </section>
      ` : ''}

      ${sessionVm.relatedStories.length ? `
        <section class="stories-related stories-surface cardx">
          <div class="stories-related__head">
            <h3 class="stories-related__title">قصص أخرى من نفس التصنيف</h3>
            <p class="stories-related__hint">انتقل مباشرة إلى قصة أخرى من نفس السلسلة.</p>
          </div>
          <div class="stories-related__list">
            ${sessionVm.relatedStories.map(renderReaderListCard).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;
}

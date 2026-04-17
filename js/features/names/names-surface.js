import { appLogger } from '../../shared/logging/app-logger.js';
import {
    ensureNamesDataLoaded,
    getNamesData
} from '../../shared/content/catalog-data-loader.js';
import { setElementHiddenState } from '../../app/ui/visibility.js';
import { createIconElement, createTextElement } from '../../shared/dom/dom-helpers.js';
import { namesStore } from '../../domains/names/names-store.js';
import {
    getActiveFilter,
    getActiveNameEntry,
    getDailyPracticeState,
    getFavoriteCount,
    getNamesSummary,
    getQuizProgress,
    getResumeNameEntry,
    getVisibleNamesEntries,
    getWirdCount,
    getWirdPreviewEntries,
    isFavoriteIndex,
    isWirdIndex,
    resolveDailyNameEntry
} from '../../domains/names/names-selectors.js';
import { getNameDetailContent } from './names-detail-content.js';
import { buildNamesQuizCard } from './names-quiz-content.js';

const dom = {};
let namesSource = [];
let namesBound = false;
let renderedGridKeys = [];
const namesCardCache = new Map();

export function getNamesSource() {
    return namesSource;
}

export function cacheDom() {
    dom.section = document.getElementById('names');
    dom.dailyCard = document.getElementById('namesDailyCard');
    dom.dailyTitle = document.getElementById('namesDailyTitle');
    dom.dailyDesc = document.getElementById('namesDailyDesc');
    dom.dailyFavoriteBtn = document.getElementById('namesDailyFavoriteBtn');
    dom.dailyWirdBtn = document.getElementById('namesDailyWirdBtn');
    dom.dailyPracticeBtn = document.getElementById('namesDailyPracticeBtn');
    dom.resumeCard = document.getElementById('namesResumeCard');
    dom.resumeTitle = document.getElementById('namesResumeTitle');
    dom.resumeHint = document.getElementById('namesResumeHint');
    dom.resumeButton = document.getElementById('namesResumeButton');
    dom.focusCard = document.getElementById('namesFocusCard');
    dom.focusCount = document.getElementById('namesFocusCount');
    dom.focusHint = document.getElementById('namesFocusHint');
    dom.focusButton = document.getElementById('namesFocusButton');
    dom.wirdCard = document.getElementById('namesWirdCard');
    dom.wirdCount = document.getElementById('namesWirdCount');
    dom.wirdList = document.getElementById('namesWirdList');
    dom.wirdButton = document.getElementById('namesWirdButton');
    dom.detailCard = document.getElementById('namesDetailCard');
    dom.detailTitle = document.getElementById('namesDetailTitle');
    dom.detailTransliteration = document.getElementById('namesDetailTransliteration');
    dom.detailMeaning = document.getElementById('namesDetailMeaning');
    dom.detailReflection = document.getElementById('namesDetailReflection');
    dom.detailPractice = document.getElementById('namesDetailPractice');
    dom.detailCopyBtn = document.getElementById('namesDetailCopyBtn');
    dom.detailWirdBtn = document.getElementById('namesDetailWirdBtn');
    dom.quizCard = document.getElementById('namesLearnCard');
    dom.quizTitle = document.getElementById('namesLearnTitle');
    dom.quizMeta = document.getElementById('namesLearnMeta');
    dom.quizPromptLabel = document.getElementById('namesLearnPromptLabel');
    dom.quizPrompt = document.getElementById('namesLearnPrompt');
    dom.quizAnswerPanel = document.getElementById('namesLearnAnswerPanel');
    dom.quizAnswerLabel = document.getElementById('namesLearnAnswerLabel');
    dom.quizAnswer = document.getElementById('namesLearnAnswer');
    dom.quizAnswerHint = document.getElementById('namesLearnAnswerHint');
    dom.quizRevealBtn = document.getElementById('namesLearnRevealBtn');
    dom.quizKnownBtn = document.getElementById('namesLearnKnownBtn');
    dom.quizReviewBtn = document.getElementById('namesLearnReviewBtn');
    dom.quizOpenBtn = document.getElementById('namesLearnOpenBtn');
    dom.quizRestartBtn = document.getElementById('namesLearnRestartBtn');
    dom.quizWeakBtn = document.getElementById('namesLearnWeakBtn');
    dom.quizWeakChips = document.getElementById('namesLearnWeakChips');
    dom.quizModeButtons = Array.from(document.querySelectorAll('[data-name-quiz-mode]'));
    dom.catalogSummary = document.getElementById('namesCatalogSummary');
    dom.filters = document.getElementById('namesFilters');
    dom.grid = document.getElementById('namesGrid');
}

function getPrimaryEntry() {
    return getActiveNameEntry(namesSource)
        || getResumeNameEntry(namesSource)
        || resolveDailyNameEntry(namesSource);
}

export function getActiveDetailContent() {
    const entry = getPrimaryEntry();
    if (!entry) {
        return null;
    }

    return getNameDetailContent(entry.index, namesSource);
}

export async function ensureNamesLoaded() {
    try {
        await ensureNamesDataLoaded();
        const source = getNamesData();
        namesSource = Array.isArray(source) ? source : (Array.isArray(source?.ar) ? source.ar : []);
    } catch (error) {
        appLogger.error('[Names] ensureNamesLoaded error:', error);
        namesSource = [];
    }

    return namesSource;
}

function ensureLearningState() {
    if (!namesSource.length) return;
    namesStore.ensureQuizQueue(namesSource.length);
}

function buildFilterButton({ label, value, active }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--ghost names-filter${active ? ' is-active' : ''}`;
    button.dataset.namesAction = 'set-filter';
    button.dataset.nameFilter = value;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(Boolean(active)));
    return button;
}

function renderFilters() {
    if (!dom.filters) return;

    dom.filters.replaceChildren(
        buildFilterButton({ label: 'الكل', value: 'all', active: getActiveFilter() === 'all' }),
        buildFilterButton({ label: `المفضلة (${getFavoriteCount()})`, value: 'favorites', active: getActiveFilter() === 'favorites' }),
        buildFilterButton({ label: `وردي (${getWirdCount()})`, value: 'wird', active: getActiveFilter() === 'wird' })
    );
}

function renderCatalogSummary() {
    if (!dom.catalogSummary) return;

    const summary = getNamesSummary(namesSource);
    const dailyLabel = summary.dailyCompleted ? 'تم اسم اليوم' : 'اسم اليوم لم يكتمل بعد';
    const quizLabel = summary.quizAttempts ? `تعلم ${summary.quizCorrect}/${summary.quizAttempts} • يحتاج مراجعة ${summary.quizWeak}` : 'ابدأ جولة التعلم';
    dom.catalogSummary.textContent = `المفضلة ${summary.favorites} • وردي ${summary.wird} • تمت معاينة ${summary.viewed}/${summary.total} • ${dailyLabel} • ${quizLabel}`;
}

function createCardActionButton({ label, action, index, variant = 'ghost' }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--${variant} names-card__action`;
    button.dataset.namesAction = action;
    button.dataset.nameIndex = String(index);
    button.textContent = label;
    return button;
}

function appendButtonIconLabel(button, iconClasses, label) {
    button.replaceChildren(
        createIconElement(iconClasses),
        createTextElement('span', label)
    );
}

function createFavoriteButton(index, isFavorite, compact = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--ghost names-favorite-btn${compact ? ' names-favorite-btn--compact' : ''}${isFavorite ? ' is-active' : ''}`;
    button.dataset.namesAction = 'toggle-favorite';
    button.dataset.nameIndex = String(index);
    button.setAttribute('aria-pressed', String(Boolean(isFavorite)));
    button.setAttribute('aria-label', isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة');
    appendButtonIconLabel(button, [`fa-${isFavorite ? 'solid' : 'regular'}`, 'fa-star'], isFavorite ? 'مفضلة' : 'أضف للمفضلة');
    return button;
}

function createWirdButton(index, isWird, compact = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn--ghost names-wird-btn${compact ? ' names-wird-btn--compact' : ''}${isWird ? ' is-active' : ''}`;
    button.dataset.namesAction = 'toggle-wird';
    button.dataset.nameIndex = String(index);
    button.setAttribute('aria-pressed', String(Boolean(isWird)));
    button.setAttribute('aria-label', isWird ? 'إزالة من الورد' : 'إضافة إلى الورد');
    appendButtonIconLabel(button, ['fa-solid', 'fa-book-open-reader'], isWird ? 'ضمن وردي' : 'أضف لوردي');
    return button;
}

function createNameCard(item) {
    const article = document.createElement('article');
    article.className = `cardx names-card${item.isActive ? ' is-active' : ''}`;
    article.dataset.nameCardIndex = String(item.index);

    const top = document.createElement('div');
    top.className = 'names-card__top';

    const badge = document.createElement('span');
    badge.className = 'names-card__index';
    badge.textContent = String(item.index + 1).padStart(2, '0');

    const quickActions = document.createElement('div');
    quickActions.className = 'names-card__quick-actions';
    quickActions.append(
        createFavoriteButton(item.index, item.isFavorite, true),
        createWirdButton(item.index, item.isWird, true)
    );

    top.append(badge, quickActions);

    const title = document.createElement('h3');
    title.className = 'amiri-text name-title color-primary mb-8';
    title.textContent = item.name || '';

    const desc = document.createElement('p');
    desc.className = 'muted name-desc names-card__desc';
    desc.textContent = item.desc || item.meaning || '';

    const meta = document.createElement('div');
    meta.className = 'names-card__meta';
    if (item.isFavorite) {
        const fav = document.createElement('span');
        fav.className = 'names-chip names-chip--favorite';
        fav.textContent = 'مفضلة';
        meta.appendChild(fav);
    }
    if (item.isWird) {
        const wird = document.createElement('span');
        wird.className = 'names-chip names-chip--wird';
        wird.textContent = 'ضمن وردي';
        meta.appendChild(wird);
    }

    const actions = document.createElement('div');
    actions.className = 'names-card__actions';
    actions.append(
        createCardActionButton({
            label: item.isActive ? 'مفتوح الآن' : 'تأمل الاسم',
            action: 'select-name',
            index: item.index,
            variant: item.isActive ? 'primary' : 'ghost'
        })
    );

    article.append(top, title, desc);
    if (meta.childNodes.length) {
        article.append(meta);
    }
    article.append(actions);
    return article;
}

function getNameCardRenderSignature(item) {
    return `${item.isActive ? '1' : '0'}|${item.isFavorite ? '1' : '0'}|${item.isWird ? '1' : '0'}`;
}

function buildEmptyGridState() {
    const empty = document.createElement('div');
    empty.className = 'cardx cardx--center names-empty-state';
    empty.append(
        createTextElement('h3', 'لا توجد أسماء في هذا العرض بعد', 'cardx__title mb-8'),
        createTextElement('p', 'أضف بعض الأسماء إلى المفضلة أو إلى وردك لتظهر هنا بسرعة.', 'muted')
    );
    return empty;
}

function getOrCreateRenderedNameCard(item) {
    const key = String(item.index);
    const signature = getNameCardRenderSignature(item);
    const cached = namesCardCache.get(key);
    if (cached && cached.dataset.renderSignature === signature) {
        return cached;
    }

    const card = createNameCard(item);
    card.dataset.renderSignature = signature;
    namesCardCache.set(key, card);
    return card;
}

function syncRenderedGridKeys(nextKeys) {
    renderedGridKeys = nextKeys.slice();
    const nextKeySet = new Set(nextKeys);
    Array.from(namesCardCache.keys()).forEach((key) => {
        if (!nextKeySet.has(key) && !isFavoriteIndex(Number(key)) && !isWirdIndex(Number(key))) {
            namesCardCache.delete(key);
        }
    });
}

function renderGrid() {
    if (!dom.grid) return;

    const items = getVisibleNamesEntries(namesSource);
    if (items.length === 0) {
        renderedGridKeys = [];
        dom.grid.replaceChildren(buildEmptyGridState());
        return;
    }

    const nextKeys = items.map((item) => String(item.index));
    const sameOrder = renderedGridKeys.length === nextKeys.length
        && renderedGridKeys.every((key, index) => key === nextKeys[index]);

    if (!sameOrder || dom.grid.querySelector('.names-empty-state')) {
        const fragment = document.createDocumentFragment();
        items.forEach((item) => fragment.appendChild(getOrCreateRenderedNameCard(item)));
        dom.grid.replaceChildren(fragment);
        syncRenderedGridKeys(nextKeys);
        return;
    }

    items.forEach((item, index) => {
        const expectedCard = getOrCreateRenderedNameCard(item);
        const currentCard = dom.grid.children[index];
        if (currentCard !== expectedCard) {
            dom.grid.replaceChild(expectedCard, currentCard);
        }
    });
    syncRenderedGridKeys(nextKeys);
}

function renderDailyCard() {
    if (!dom.dailyCard || !dom.dailyTitle || !dom.dailyDesc || !dom.dailyFavoriteBtn || !dom.dailyWirdBtn || !dom.dailyPracticeBtn) return;

    const entry = resolveDailyNameEntry(namesSource);
    const practiceState = getDailyPracticeState();
    if (!entry) {
        setElementHiddenState(dom.dailyCard, true);
        return;
    }

    setElementHiddenState(dom.dailyCard, false);
    dom.dailyTitle.textContent = entry.name;
    dom.dailyDesc.textContent = entry.desc || entry.meaning || '';
    dom.dailyFavoriteBtn.replaceWith(createFavoriteButton(entry.index, isFavoriteIndex(entry.index)));
    dom.dailyFavoriteBtn = dom.dailyCard.querySelector('[data-names-action="toggle-favorite"]');
    dom.dailyWirdBtn.replaceWith(createWirdButton(entry.index, isWirdIndex(entry.index)));
    dom.dailyWirdBtn = dom.dailyCard.querySelector('[data-names-action="toggle-wird"]');
    dom.dailyPracticeBtn.dataset.nameIndex = String(entry.index);
    dom.dailyPracticeBtn.classList.toggle('is-active', Boolean(practiceState.completed));
    dom.dailyPracticeBtn.setAttribute('aria-pressed', String(Boolean(practiceState.completed)));
    dom.dailyPracticeBtn.textContent = practiceState.completed ? 'تم تسجيل اسم اليوم' : 'سجل هذا الاسم ضمن إنجازك اليومي';
}

function renderResumeCard() {
    if (!dom.resumeCard || !dom.resumeTitle || !dom.resumeHint || !dom.resumeButton) return;

    const entry = getResumeNameEntry(namesSource);
    if (!entry) {
        setElementHiddenState(dom.resumeCard, true);
        return;
    }

    setElementHiddenState(dom.resumeCard, false);
    dom.resumeTitle.textContent = entry.name;
    dom.resumeHint.textContent = entry.desc || entry.meaning || 'تابع التأمل في الاسم الذي فتحته أخيرًا.';
    dom.resumeButton.dataset.nameIndex = String(entry.index);
}

function renderFocusCard() {
    if (!dom.focusCard || !dom.focusCount || !dom.focusHint || !dom.focusButton) return;

    const summary = getNamesSummary(namesSource);
    const hasWeakNames = summary.quizWeak > 0;
    setElementHiddenState(dom.focusCard, !hasWeakNames);
    if (!hasWeakNames) return;

    dom.focusCount.textContent = String(summary.quizWeak);
    dom.focusHint.textContent = summary.quizWeak === 1
        ? 'يوجد اسم واحد يحتاج مراجعة.'
        : `يوجد ${summary.quizWeak} أسماء تحتاج مراجعة.`;
    dom.focusButton.disabled = !hasWeakNames;
}

function renderWirdCard() {
    if (!dom.wirdCard || !dom.wirdCount || !dom.wirdList || !dom.wirdButton) return;

    const previewEntries = getWirdPreviewEntries(namesSource);
    const count = getWirdCount();
    if (!count) {
        setElementHiddenState(dom.wirdCard, true);
        dom.wirdList.replaceChildren();
        return;
    }

    setElementHiddenState(dom.wirdCard, false);
    dom.wirdCount.textContent = String(count);
    const fragment = document.createDocumentFragment();
    previewEntries.forEach((entry) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'names-chip names-chip--wird';
        chip.dataset.namesAction = 'select-name';
        chip.dataset.nameIndex = String(entry.index);
        chip.textContent = entry.name;
        fragment.appendChild(chip);
    });
    dom.wirdList.replaceChildren(fragment);
    dom.wirdButton.disabled = !count;
}

function renderDetailCard() {
    if (!dom.detailCard || !dom.detailTitle || !dom.detailTransliteration || !dom.detailMeaning || !dom.detailReflection || !dom.detailPractice || !dom.detailCopyBtn || !dom.detailWirdBtn) {
        return;
    }

    const detail = getActiveDetailContent();
    if (!detail) {
        setElementHiddenState(dom.detailCard, true);
        return;
    }

    setElementHiddenState(dom.detailCard, false);
    dom.detailTitle.textContent = detail.name;
    dom.detailTransliteration.textContent = detail.transliteration || '';
    dom.detailMeaning.textContent = detail.desc || detail.englishSummary || '';
    dom.detailReflection.textContent = detail.reflectionPrompt || '';
    dom.detailPractice.textContent = detail.practicePrompt || '';
    dom.detailCopyBtn.dataset.nameIndex = String(detail.index);
    dom.detailWirdBtn.replaceWith(createWirdButton(detail.index, isWirdIndex(detail.index)));
    dom.detailWirdBtn = dom.detailCard.querySelector('[data-names-action="toggle-wird"]');
}

function setModeButtonState(activeMode) {
    dom.quizModeButtons.forEach((button) => {
        const isActive = button.dataset.nameQuizMode === activeMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function renderWeakQuizChips(progress) {
    if (!dom.quizWeakChips) return;

    const weakEntries = Array.isArray(progress.weakEntries) ? progress.weakEntries : [];
    if (!weakEntries.length) {
        dom.quizWeakChips.replaceChildren();
        return;
    }

    const fragment = document.createDocumentFragment();
    weakEntries.forEach((entry) => {
        const chip = document.createElement('span');
        chip.className = 'names-chip names-chip--review';
        chip.textContent = entry.name;
        fragment.appendChild(chip);
    });
    dom.quizWeakChips.replaceChildren(fragment);
}

function renderQuizCard() {
    if (!dom.quizCard || !dom.quizTitle || !dom.quizMeta || !dom.quizPromptLabel || !dom.quizPrompt || !dom.quizAnswerPanel || !dom.quizAnswerLabel || !dom.quizAnswer || !dom.quizAnswerHint || !dom.quizRevealBtn || !dom.quizKnownBtn || !dom.quizReviewBtn || !dom.quizOpenBtn || !dom.quizRestartBtn || !dom.quizWeakBtn) {
        return;
    }

    const progress = getQuizProgress(namesSource);
    const quizCard = buildNamesQuizCard(progress);

    setElementHiddenState(dom.quizCard, false);
    setModeButtonState(progress.mode);
    dom.quizTitle.textContent = quizCard.title;
    dom.quizMeta.textContent = quizCard.meta;
    dom.quizPromptLabel.textContent = quizCard.promptLabel;
    dom.quizPrompt.textContent = quizCard.prompt;
    dom.quizAnswerLabel.textContent = quizCard.answerLabel;
    dom.quizAnswer.textContent = quizCard.answer;
    dom.quizAnswerHint.textContent = quizCard.answerHint;
    dom.quizAnswerPanel.classList.toggle('is-revealed', quizCard.revealed);
    dom.quizRevealBtn.disabled = !quizCard.canReveal;
    dom.quizKnownBtn.disabled = !quizCard.canAnswer;
    dom.quizReviewBtn.disabled = !quizCard.canAnswer;
    dom.quizOpenBtn.disabled = !quizCard.currentIndex && quizCard.currentIndex !== 0;
    dom.quizRestartBtn.disabled = !quizCard.canRestart;
    dom.quizWeakBtn.disabled = !quizCard.canReviewWeak;
    if (quizCard.currentIndex || quizCard.currentIndex === 0) {
        dom.quizOpenBtn.dataset.nameIndex = String(quizCard.currentIndex);
    } else {
        delete dom.quizOpenBtn.dataset.nameIndex;
    }
    renderWeakQuizChips(progress);
}

export function ensureCardVisible(index) {
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || !dom.grid) return;
    const card = dom.grid.querySelector(`[data-name-card-index="${safeIndex}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}

export function ensureCardFilterVisibility(index) {
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0) return;
    if (getActiveFilter() === 'favorites' && !isFavoriteIndex(safeIndex)) {
        namesStore.setFilter('all');
    }
    if (getActiveFilter() === 'wird' && !isWirdIndex(safeIndex)) {
        namesStore.setFilter('all');
    }
}

export function renderNamesUI({ skipGrid = false } = {}) {
    ensureLearningState();
    renderDailyCard();
    renderResumeCard();
    renderFocusCard();
    renderWirdCard();
    renderDetailCard();
    renderQuizCard();
    renderCatalogSummary();
    renderFilters();
    if (!skipGrid) {
        renderGrid();
    }
}

function bindNamesEvents() {
    if (!dom.section || namesBound) return;

    namesBound = true;
    dom.section.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const target = event.target.closest('[data-name-card-index]');
        if (!target) return;
        const selectButton = target.querySelector('[data-names-action="select-name"]');
        if (!selectButton) return;
        event.preventDefault();
        selectButton.click();
    });
}

export async function initNamesSection() {
    cacheDom();
    bindNamesEvents();
    await ensureNamesLoaded();
    ensureLearningState();
}

export async function renderNamesSection() {
    cacheDom();
    await ensureNamesLoaded();
    ensureLearningState();
    renderNamesUI();
}

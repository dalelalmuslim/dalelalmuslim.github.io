// js/features/masbaha/masbaha-renderers.js
//
// Responsibility: pure DOM mutation for Masbaha visual state.
// No side-effects outside DOM. No business logic.
// Hot-path optimised: batch dots toggle only the changed dot on normal increment.

// ── Batch dots state ──────────────────────────────────────

// Track last built target to avoid rebuilding the dot set unnecessarily.
let builtForTarget = -1;
// Track previous batch count to do single-dot updates on the hot path.
let prevBatchCount = -1;

const DOTS_THRESHOLD = 50; // targets ≤ this use individual dots

function buildBatchDots(container, target) {
    if (builtForTarget === target) return; // Already correct — skip rebuild.
    builtForTarget = target;
    prevBatchCount = -1; // Reset tracking after rebuild.

    // Fast clear without layout recalculation storm.
    container.replaceChildren();
    container.setAttribute('aria-valuemax', String(target));

    if (target <= DOTS_THRESHOLD) {
        container.dataset.batchMode = 'dots';
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < target; i++) {
            const dot = document.createElement('span');
            dot.className = 'masbaha-dot';
            dot.setAttribute('aria-hidden', 'true');
            fragment.appendChild(dot);
        }
        container.appendChild(fragment);
    } else {
        container.dataset.batchMode = 'bar';
        const track = document.createElement('div');
        track.className = 'masbaha-batch-bar-track';
        const fill = document.createElement('div');
        fill.className = 'masbaha-batch-bar-fill';
        track.appendChild(fill);
        container.appendChild(track);
    }
}

function updateBatchDots(container, batch, target) {
    const mode = container.dataset.batchMode;
    container.setAttribute('aria-valuenow', String(batch));

    if (mode === 'dots') {
        const dots = container.children;
        if (!dots.length) return;

        if (batch === 0) {
            // Full clear (after reset or batch rollover).
            if (prevBatchCount !== 0) {
                for (let i = 0; i < dots.length; i++) dots[i].classList.remove('is-filled');
                prevBatchCount = 0;
            }
        } else if (batch > prevBatchCount && prevBatchCount >= 0) {
            // Hot path: only fill newly added dot(s).
            const fillTo = Math.min(batch, dots.length);
            for (let i = prevBatchCount; i < fillTo; i++) {
                dots[i].classList.add('is-filled');
            }
            prevBatchCount = batch;
        } else {
            // Edge case: target changed mid-session or state jumped. Full sync.
            const fillTo = Math.min(batch, dots.length);
            for (let i = 0; i < dots.length; i++) {
                dots[i].classList.toggle('is-filled', i < fillTo);
            }
            prevBatchCount = batch;
        }
    } else {
        // Bar mode: direct style update (avoids u-progress-* class churn).
        const fill = container.querySelector('.masbaha-batch-bar-fill');
        if (!fill) return;
        const pct = target > 0 ? (batch / target) * 100 : 0;
        fill.style.width = `${Math.min(100, pct).toFixed(1)}%`;
        prevBatchCount = batch;
    }
}

function triggerBatchCompleteAnimation(container) {
    container.classList.add('is-batch-complete');
    setTimeout(() => container.classList.remove('is-batch-complete'), 500);
}

// ── Public renderers ──────────────────────────────────────

/**
 * Main UI update — called on every increment and on init.
 * @param {{ dom, sessionCount, target, isCustomEntryActive, currentEntryText,
 *           dailyCount, dailyTarget, streakCount, nextEntryText }} params
 */
export function updateMasbahaSummaryUI({
    dom,
    sessionCount,
    target,
    isCustomEntryActive,
    currentEntryText,
    dailyCount,
    dailyTarget,
    streakCount,
    nextEntryText,
}) {
    const batch = sessionCount % target;
    const isBatchComplete = sessionCount > 0 && batch === 0;

    // ── Counter text ─────────────────────────────────────
    if (dom.totalCounter) dom.totalCounter.textContent = String(sessionCount);
    if (dom.batchCounter) dom.batchCounter.textContent = `${batch} / ${target}`;

    // ── Current zikr text ─────────────────────────────────
    if (dom.currentEntryDisplay && !isCustomEntryActive) {
        dom.currentEntryDisplay.textContent = currentEntryText;
    }

    // ── Next zikr hint ─────────────────────────────────────
    if (dom.nextHint) {
        const showHint = !isCustomEntryActive && Boolean(nextEntryText);
        dom.nextHint.hidden = !showHint;
        dom.nextHint.setAttribute('aria-hidden', String(!showHint));
        if (showHint && dom.nextText) {
            dom.nextText.textContent = nextEntryText;
        }
    }

    // ── Batch progress ─────────────────────────────────────
    if (dom.batchProgress) {
        buildBatchDots(dom.batchProgress, target);

        if (isBatchComplete) {
            triggerBatchCompleteAnimation(dom.batchProgress);
            updateBatchDots(dom.batchProgress, 0, target);
        } else {
            updateBatchDots(dom.batchProgress, batch, target);
        }
    }

    // ── Daily goal ─────────────────────────────────────────
    if (dom.dailyFill) {
        const ratio = dailyTarget > 0 ? Math.min(dailyCount / dailyTarget, 1) : 0;
        dom.dailyFill.style.width = `${(ratio * 100).toFixed(1)}%`;
        dom.dailyFill.setAttribute('aria-valuenow', String(dailyCount));
        dom.dailyFill.setAttribute('aria-valuemax', String(dailyTarget));
    }

    if (dom.dailyLabel) {
        dom.dailyLabel.textContent = `${dailyCount} / ${dailyTarget} اليوم`;
    }

    // ── Streak ─────────────────────────────────────────────
    if (dom.streakCount) {
        dom.streakCount.textContent = String(streakCount);
    }
}

// ── Zikr list renderer (for selection sheet) ──────────────

/**
 * Renders the zikr selection list inside the sheet.
 * Uses DOM construction (not innerHTML) for XSS safety.
 */
export function renderMasbahaZikrList({
    container,
    azkarCycle,
    customAzkar,
    activeEntryText,
    isCustomEntryActive,
    onSelectBase,
    onSelectCustom,
    onDeleteCustom,
}) {
    if (!container) return;
    container.replaceChildren();

    // ── Base cycle items ─────────────────────────────────
    azkarCycle.forEach((text, idx) => {
        const isActive = !isCustomEntryActive && text === activeEntryText;
        const item = buildZikrItem({
            text,
            isActive,
            showDelete: false,
            onSelect: () => onSelectBase(idx),
        });
        container.appendChild(item);
    });

    // ── Custom items ─────────────────────────────────────
    if (customAzkar.length > 0) {
        const divider = document.createElement('p');
        divider.className = 'masbaha-zikr-divider';
        divider.textContent = 'أذكاري المضافة';
        container.appendChild(divider);

        customAzkar.forEach((text, idx) => {
            const isActive = isCustomEntryActive && text === activeEntryText;
            const item = buildZikrItem({
                text,
                isActive,
                showDelete: true,
                onSelect: () => onSelectCustom(text),
                onDelete: (e) => {
                    e.stopPropagation();
                    onDeleteCustom(idx);
                },
            });
            container.appendChild(item);
        });
    }
}

function buildZikrItem({ text, isActive, showDelete, onSelect, onDelete }) {
    const item = document.createElement('div');
    item.className = 'masbaha-zikr-item' + (isActive ? ' is-active' : '');
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(isActive));

    const textEl = document.createElement('span');
    textEl.className = 'masbaha-zikr-item__text';
    textEl.textContent = text;
    textEl.addEventListener('click', onSelect);
    item.appendChild(textEl);

    if (isActive) {
        const check = document.createElement('i');
        check.className = 'fa-solid fa-check masbaha-zikr-item__check';
        check.setAttribute('aria-hidden', 'true');
        item.appendChild(check);
    }

    if (showDelete) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'masbaha-zikr-item__delete';
        delBtn.setAttribute('aria-label', 'حذف هذا الذكر');
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-trash-can';
        icon.setAttribute('aria-hidden', 'true');
        delBtn.appendChild(icon);
        delBtn.addEventListener('click', onDelete);
        item.appendChild(delBtn);
    }

    return item;
}

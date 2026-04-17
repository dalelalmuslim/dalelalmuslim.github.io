import { copyToClipboard, showToast } from '../../app/shell/app-shell.js';
import { namesStore } from '../../domains/names/names-store.js';
import {
    getNextWirdEntry,
    getQuizProgress,
    getQuizState,
    getResumeNameEntry,
    isWirdIndex,
    resolveDailyNameEntry
} from '../../domains/names/names-selectors.js';
import {
    ensureCardFilterVisibility,
    ensureCardVisible,
    getActiveDetailContent,
    getNamesSource,
    renderNamesUI
} from './names-surface.js';

export async function setNamesFilter(filter) {
    namesStore.setFilter(filter);
    renderNamesUI();
}

export async function toggleNameFavorite(index) {
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0) return;

    const isFavorite = namesStore.toggleFavorite(safeIndex);
    renderNamesUI();
    showToast(isFavorite ? 'تمت إضافة الاسم إلى المفضلة.' : 'تمت إزالة الاسم من المفضلة.', 'success');
}

export async function toggleNameWird(index) {
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0) return;

    const isWird = namesStore.toggleWird(safeIndex);
    renderNamesUI();
    showToast(isWird ? 'تمت إضافة الاسم إلى وردك.' : 'تمت إزالة الاسم من وردك.', 'success');
}

export async function toggleActiveNameWird() {
    const detail = getActiveDetailContent();
    if (!detail) {
        showToast('اختر اسمًا أولًا.', 'info');
        return;
    }

    await toggleNameWird(detail.index);
}

export async function selectName(index, { keepFilter = false } = {}) {
    const safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0) return;

    if (!keepFilter) {
        ensureCardFilterVisibility(safeIndex);
    }

    namesStore.markViewed(safeIndex);
    if (isWirdIndex(safeIndex)) {
        namesStore.markWirdOpened(safeIndex);
    }
    renderNamesUI();
    requestAnimationFrame(() => ensureCardVisible(safeIndex));
}

export async function openDailyName() {
    const entry = resolveDailyNameEntry(getNamesSource());
    if (!entry) {
        showToast('لا يتوفر اسم يومي حاليًا.', 'info');
        return;
    }

    await selectName(entry.index);
}

export async function markDailyNameCompleted(index) {
    const safeIndex = Number(index);
    const dailyEntry = resolveDailyNameEntry(getNamesSource());
    const targetIndex = Number.isInteger(safeIndex) && safeIndex >= 0 ? safeIndex : dailyEntry?.index;

    if (!Number.isInteger(targetIndex) || targetIndex < 0) {
        showToast('لا يوجد اسم يومي صالح الآن.', 'info');
        return;
    }

    const result = namesStore.markDailyCompleted(targetIndex);
    renderNamesUI({ skipGrid: true });
    showToast(result.alreadyCompleted ? 'اسم اليوم مكتمل بالفعل.' : 'تم تسجيل اسم اليوم ضمن إنجازك اليومي.', 'success');
}

export async function openNextWirdName() {
    const nextEntry = getNextWirdEntry(getNamesSource());
    if (!nextEntry) {
        showToast('أضف أسماءً إلى وردك أولًا.', 'info');
        return;
    }

    namesStore.setFilter('wird');
    await selectName(nextEntry.index, { keepFilter: true });
}

export async function resumeLastViewedName() {
    const entry = getResumeNameEntry(getNamesSource());
    if (!entry) {
        showToast('ابدأ بتأمل اسم أولًا ليظهر هنا لاحقًا.', 'info');
        return;
    }

    await selectName(entry.index);
}

export async function copyActiveNameDetail() {
    const detail = getActiveDetailContent();
    if (!detail) {
        showToast('اختر اسمًا أولًا.', 'info');
        return;
    }

    const parts = [detail.name];
    if (detail.transliteration) {
        parts.push(`Transliteration: ${detail.transliteration}`);
    }
    if (detail.desc) {
        parts.push(detail.desc);
    }
    if (detail.englishSummary) {
        parts.push(`Meaning: ${detail.englishSummary}`);
    }
    if (detail.reflectionPrompt) {
        parts.push(`تأمل: ${detail.reflectionPrompt}`);
    }

    await copyToClipboard(parts.join('\n\n'));
}

export async function setNamesQuizMode(mode) {
    const namesSource = getNamesSource();
    if (!namesSource.length) return;

    const nextMode = namesStore.setQuizMode(mode);
    namesStore.startQuiz(namesSource.length);
    renderNamesUI({ skipGrid: true });
    showToast(nextMode === 'meaning-to-name' ? 'تم تفعيل وضع: المعنى ثم الاسم.' : 'تم تفعيل وضع: الاسم ثم المعنى.', 'success');
}

export async function revealNamesQuizAnswer() {
    const progress = getQuizProgress(getNamesSource());
    if (!progress.currentEntry) {
        showToast('لا توجد بطاقة تعلم نشطة الآن.', 'info');
        return;
    }

    namesStore.revealQuizAnswer();
    renderNamesUI({ skipGrid: true });
}

async function answerNamesQuiz({ known }) {
    const progress = getQuizProgress(getNamesSource());
    if (!progress.currentEntry) {
        showToast('ابدأ جولة تعلم أولًا.', 'info');
        return;
    }

    if (!progress.revealed) {
        showToast('اكشف الإجابة أولًا ثم قيّم نفسك.', 'info');
        return;
    }

    const result = namesStore.answerCurrentQuiz({ known });
    renderNamesUI({ skipGrid: true });
    if (!result.advanced) {
        showToast('تعذر تحديث جولة التعلم الآن.', 'error');
        return;
    }

    if (result.completed) {
        showToast(known ? 'أحسنت. انتهت الجولة.' : 'تم حفظ الاسم ضمن قائمة المراجعة وأنهيت الجولة.', 'success');
        return;
    }

    showToast(known ? 'ممتاز. انتقل إلى البطاقة التالية.' : 'تمت إضافته إلى قائمة الضعيف للمراجعة.', 'success');
}

export async function markNamesQuizKnown() {
    return answerNamesQuiz({ known: true });
}

export async function markNamesQuizNeedsReview() {
    return answerNamesQuiz({ known: false });
}

export async function restartNamesQuiz() {
    const namesSource = getNamesSource();
    if (!namesSource.length) {
        showToast('تعذر إعادة الجولة الآن.', 'error');
        return;
    }

    namesStore.startQuiz(namesSource.length);
    renderNamesUI({ skipGrid: true });
    showToast('تمت إعادة جولة التعلم من البداية.', 'success');
}

export async function reviewWeakNamesQuiz() {
    const weakIndices = getQuizState().weakIndices;
    const namesSource = getNamesSource();
    if (!weakIndices.length) {
        showToast('لا توجد أسماء ضعيفة محفوظة الآن.', 'info');
        return;
    }

    namesStore.startQuiz(namesSource.length, { source: 'weak', sourceIndices: weakIndices });
    renderNamesUI({ skipGrid: true });
    showToast('بدأت الآن جولة مراجعة الأسماء الضعيفة.', 'success');
}

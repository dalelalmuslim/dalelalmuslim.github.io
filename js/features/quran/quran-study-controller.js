import { copyToClipboard, showToast } from '../../app/shell/app-shell.js';
import { getSurahName } from './quran-metadata.js';

const COPY_BUTTON_IDLE_LABEL = 'نسخ';
const COPY_BUTTON_DONE_LABEL = 'تم النسخ';

function createAyahContext(ayahNode) {
    if (!ayahNode) {
        return null;
    }

    const surahNum = Number(ayahNode.dataset.surahNum || 0);
    const verseNum = Number(ayahNode.dataset.verseNum || 0);
    const text = String(ayahNode.dataset.ayahText || '').trim();

    if (!surahNum || !verseNum || !text) {
        return null;
    }

    return {
        surahNum,
        verseNum,
        text,
        surahName: getSurahName(surahNum)
    };
}

function setCopyButtonState(button, state) {
    if (!button) {
        return;
    }

    const icon = button.querySelector('i');
    const label = button.querySelector('span');
    const isDone = state === 'done';

    button.disabled = isDone;
    button.dataset.copyState = isDone ? 'done' : 'idle';

    if (icon) {
        icon.classList.toggle('fa-copy', !isDone);
        icon.classList.toggle('fa-check', isDone);
    }

    if (label) {
        label.textContent = isDone ? COPY_BUTTON_DONE_LABEL : COPY_BUTTON_IDLE_LABEL;
    } else {
        button.textContent = isDone ? COPY_BUTTON_DONE_LABEL : COPY_BUTTON_IDLE_LABEL;
    }
}

function resetCopyButton(button) {
    setCopyButtonState(button, 'idle');
}

function markCopyButtonDone(button) {
    setCopyButtonState(button, 'done');
}

export function createQuranStudyController() {
    return {
        setActiveAyah(ayahNode) {
            if (!ayahNode) {
                this.clearActiveAyah();
                return;
            }

            if (this.activeAyahNode === ayahNode && this.activeAyahContext) {
                this.openStudyPanel(this.activeAyahContext);
                return;
            }

            if (this.activeAyahNode && this.activeAyahNode !== ayahNode) {
                this.activeAyahNode.classList.remove('is-active');
                this.activeAyahNode.setAttribute('aria-pressed', 'false');
            }

            const nextContext = createAyahContext(ayahNode);
            ayahNode.classList.add('is-active');
            ayahNode.setAttribute('aria-pressed', 'true');
            this.activeAyahNode = ayahNode;
            this.activeAyahContext = nextContext;

            document.dispatchEvent(new CustomEvent('quran:ayah-selected', {
                detail: this.activeAyahContext
            }));
        },

        clearActiveAyah() {
            if (this.activeAyahNode) {
                this.activeAyahNode.classList.remove('is-active');
                this.activeAyahNode.setAttribute('aria-pressed', 'false');
            }

            this.activeAyahNode = null;
            this.activeAyahContext = null;
            this.closeStudyPanel();
        },

        getActiveAyahContext() {
            return this.activeAyahContext;
        },

        renderStudyPanelContent(context = this.activeAyahContext) {
            const panel = this.getDom('quranStudyPanel');
            const titleEl = this.getDom('quranStudyPanelTitle');
            const metaEl = this.getDom('quranStudyPanelMeta');
            const textEl = this.getDom('quranStudyPanelText');
            const copyButton = this.getDom('quranCopyAyahBtn');

            if (!panel || !titleEl || !metaEl || !textEl) {
                return false;
            }

            if (!context?.surahNum || !context?.verseNum || !context?.text) {
                return false;
            }

            const surahName = context.surahName || getSurahName(Number(context.surahNum));
            titleEl.textContent = 'الآية المختارة';
            metaEl.textContent = `${surahName} • الآية ${context.verseNum}`;
            textEl.textContent = context.text;
            resetCopyButton(copyButton);
            panel.classList.remove('is-hidden');
            panel.setAttribute('aria-hidden', 'false');
            return true;
        },

        openStudyPanel(context = this.activeAyahContext) {
            try {
                const normalizedContext = context?.surahNum && context?.verseNum && context?.text
                    ? {
                        surahNum: Number(context.surahNum),
                        surahName: context.surahName || getSurahName(Number(context.surahNum)),
                        verseNum: Number(context.verseNum),
                        text: String(context.text).trim()
                    }
                    : null;

                if (!normalizedContext) {
                    this.closeStudyPanel();
                    return;
                }

                this.activeAyahContext = normalizedContext;
                this.activeStudyContent = null;
                this.studyPanelRequestId += 1;
                this.renderStudyPanelContent(normalizedContext);
            } catch (error) {
                this.reportUnexpectedError('تعذر فتح خيارات الآية الآن.', error);
            }
        },

        closeStudyPanel() {
            const panel = this.getDom('quranStudyPanel');
            const titleEl = this.getDom('quranStudyPanelTitle');
            const metaEl = this.getDom('quranStudyPanelMeta');
            const textEl = this.getDom('quranStudyPanelText');
            const copyButton = this.getDom('quranCopyAyahBtn');

            if (!panel || !titleEl || !metaEl || !textEl) {
                return;
            }

            this.studyPanelRequestId += 1;
            this.activeStudyContent = null;
            panel.classList.add('is-hidden');
            panel.setAttribute('aria-hidden', 'true');
            titleEl.textContent = 'الآية المختارة';
            metaEl.textContent = '';
            textEl.textContent = '';
            resetCopyButton(copyButton);
        },

        buildAyahStudyText(context = this.activeAyahContext) {
            if (!context?.surahNum || !context?.verseNum || !context?.text) {
                return '';
            }

            const surahName = context.surahName || getSurahName(Number(context.surahNum));
            return [
                context.text,
                `${surahName} — الآية ${context.verseNum}`
            ].join('\n\n');
        },

        async copyActiveAyah() {
            try {
                const requestId = this.studyPanelRequestId;
                const text = this.buildAyahStudyText();
                const copyButton = this.getDom('quranCopyAyahBtn');
                if (!text) {
                    showToast('اختر آية أولًا.', 'info');
                    return;
                }

                const copied = await copyToClipboard(text);
                if (!copied || requestId !== this.studyPanelRequestId) {
                    return;
                }

                markCopyButtonDone(copyButton);
                window.setTimeout(() => {
                    if (requestId !== this.studyPanelRequestId) {
                        return;
                    }

                    this.clearActiveAyah();
                }, 700);
            } catch (error) {
                this.reportUnexpectedError('تعذر نسخ الآية الآن.', error);
            }
        },

        findAyahNode(verseNum) {
            const ayahsContainer = this.getDom('ayahsContainer');
            if (!ayahsContainer || !Number.isFinite(Number(verseNum)) || Number(verseNum) <= 0) {
                return null;
            }

            return ayahsContainer.querySelector(`[data-quran-ayah="true"][data-verse-num="${Number(verseNum)}"]`);
        },

        focusAyahVerse(verseNum, { behavior = 'smooth', openPanel = true } = {}) {
            const ayahNode = this.findAyahNode(verseNum);
            if (!ayahNode) {
                return false;
            }

            if (openPanel) {
                this.setActiveAyah(ayahNode);
            }

            ayahNode.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
            return true;
        }
    };
}

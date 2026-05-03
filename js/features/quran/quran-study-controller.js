import { copyToClipboard, showToast } from '../../app/shell/app-shell.js';
import { getSurahName } from './quran-metadata.js';

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
            this.syncHifzActionState();

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
            this.syncHifzActionState();
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
            panel.classList.remove('is-hidden');
            panel.setAttribute('aria-hidden', 'false');
            this.syncHifzActionState();
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
            this.syncHifzActionState();
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
                const text = this.buildAyahStudyText();
                if (!text) {
                    showToast('اختر آية أولًا.', 'info');
                    return;
                }

                await copyToClipboard(text);
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

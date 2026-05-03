import { appLogger } from '../../shared/logging/app-logger.js';
import { copyToClipboard, shareText, showToast } from '../../app/shell/app-shell.js';
import { getAyahStudyContent } from './quran-study-content.js';
import { createQuranAudioPlayer } from './quran-audio-player.js';
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
        ensureAudioPlayer() {
            if (!this.audioPlayer) {
                this.audioPlayer = createQuranAudioPlayer({
                    onStateChange: state => this.renderAudioState(state)
                });
            }

            return this.audioPlayer;
        },

        getAyahAudioKey(context = this.activeAyahContext) {
            if (!context?.surahNum || !context?.verseNum) {
                return '';
            }

            return `${Number(context.surahNum)}:${Number(context.verseNum)}`;
        },

        renderAudioState(state = this.audioPlayer?.getState?.() || null) {
            const audioStatusEl = this.getDom('quranStudyAudioStatus');
            const repeatBtn = this.getDom('quranRepeatAyahBtn');
            const currentKey = this.getAyahAudioKey();
            const isCurrentAyahPlaying = Boolean(currentKey && state?.currentKey === currentKey && (state?.status === 'starting' || state?.status === 'playing'));

            if (audioStatusEl) {
                const defaultMessage = this.activeAyahContext?.verseNum
                    ? 'المعاينة الصوتية تستخدم القراءة المدمجة في الجهاز حتى تُضاف تلاوة مسجلة داخل التطبيق.'
                    : '';
                audioStatusEl.textContent = String(state?.message || defaultMessage || '');
                audioStatusEl.dataset.audioState = String(state?.status || 'idle');
            }

            if (repeatBtn) {
                repeatBtn.disabled = !this.activeAyahContext?.verseNum;
                repeatBtn.classList.toggle('is-active', isCurrentAyahPlaying);
                repeatBtn.setAttribute('aria-pressed', String(isCurrentAyahPlaying));
                repeatBtn.textContent = isCurrentAyahPlaying ? 'إيقاف التكرار' : 'تكرار صوتي ×3';
            }
        },

        stopActiveAyahAudio(options = {}) {
            if (!this.audioPlayer) {
                this.renderAudioState();
                return { ok: true, stopped: false };
            }

            const result = this.audioPlayer.stop(options);
            this.renderAudioState(result?.state);
            return result;
        },

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
            const currentKey = this.getAyahAudioKey();
            const nextKey = this.getAyahAudioKey(nextContext);
            if (currentKey && nextKey && currentKey !== nextKey) {
                this.stopActiveAyahAudio({ silent: true });
            }

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
            this.stopActiveAyahAudio({ silent: true });

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

        renderStudyPanelLoading(context = this.activeAyahContext) {
            const panel = this.getDom('quranStudyPanel');
            const titleEl = this.getDom('quranStudyPanelTitle');
            const metaEl = this.getDom('quranStudyPanelMeta');
            const statusEl = this.getDom('quranStudyPanelStatus');
            const audioStatusEl = this.getDom('quranStudyAudioStatus');
            const textEl = this.getDom('quranStudyPanelText');
            const reflectionEl = this.getDom('quranStudyReflection');

            if (!panel || !titleEl || !metaEl || !statusEl || !audioStatusEl || !textEl || !reflectionEl) {
                return false;
            }

            if (!context?.surahNum || !context?.verseNum || !context?.text) {
                return false;
            }

            titleEl.textContent = `تأمل الآية ${context.verseNum}`;
            metaEl.textContent = `${context.surahName} • الآية ${context.verseNum}`;
            statusEl.textContent = 'جاري تجهيز مفتاح التدبر...';
            audioStatusEl.textContent = '';
            textEl.textContent = context.text;
            reflectionEl.textContent = 'جاري التحميل...';
            panel.classList.remove('is-hidden');
            panel.setAttribute('aria-hidden', 'false');
            this.renderAudioState();
            this.syncHifzActionState();
            return true;
        },

        renderStudyPanelContent(context = this.activeAyahContext, content = this.activeStudyContent) {
            const panel = this.getDom('quranStudyPanel');
            const titleEl = this.getDom('quranStudyPanelTitle');
            const metaEl = this.getDom('quranStudyPanelMeta');
            const statusEl = this.getDom('quranStudyPanelStatus');
            const audioStatusEl = this.getDom('quranStudyAudioStatus');
            const textEl = this.getDom('quranStudyPanelText');
            const reflectionEl = this.getDom('quranStudyReflection');

            if (!panel || !titleEl || !metaEl || !statusEl || !audioStatusEl || !textEl || !reflectionEl) {
                return false;
            }

            if (!context?.surahNum || !context?.verseNum || !context?.text) {
                return false;
            }

            titleEl.textContent = `تأمل الآية ${context.verseNum}`;
            metaEl.textContent = `${context.surahName} • الآية ${context.verseNum}`;
            statusEl.textContent = String(content?.summary || '');
            textEl.textContent = context.text;
            reflectionEl.textContent = String(content?.reflection?.body || '');
            panel.classList.remove('is-hidden');
            panel.setAttribute('aria-hidden', 'false');
            this.renderAudioState();
            this.syncHifzActionState();
            return true;
        },

        async openStudyPanel(context = this.activeAyahContext) {
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

                const previousAudioKey = this.audioPlayer?.getState?.()?.currentKey || '';
                const nextAudioKey = this.getAyahAudioKey(normalizedContext);
                if (previousAudioKey && nextAudioKey && previousAudioKey !== nextAudioKey) {
                    this.stopActiveAyahAudio({ silent: true });
                }

                this.activeAyahContext = normalizedContext;
                this.activeStudyContent = null;
                const requestId = ++this.studyPanelRequestId;
                this.renderStudyPanelLoading(normalizedContext);

                try {
                    const studyContent = await getAyahStudyContent(normalizedContext);
                    if (requestId !== this.studyPanelRequestId) {
                        return;
                    }

                    this.activeStudyContent = studyContent;
                    this.renderStudyPanelContent(normalizedContext, studyContent);
                } catch (error) {
                    appLogger.error('[Quran] Failed to load ayah study content:', error);
                    if (requestId !== this.studyPanelRequestId) {
                        return;
                    }

                    this.activeStudyContent = {
                        status: 'error',
                        summary: 'تعذر تجهيز مفتاح التدبر الآن.',
                        reflection: {
                            status: 'error',
                            body: 'حاول إعادة اختيار الآية مرة أخرى.'
                        }
                    };
                    this.renderStudyPanelContent(normalizedContext, this.activeStudyContent);
                }
            } catch (error) {
                this.reportUnexpectedError('تعذر فتح لوحة الدراسة الآن.', error);
            }
        },

        closeStudyPanel() {
            const panel = this.getDom('quranStudyPanel');
            const titleEl = this.getDom('quranStudyPanelTitle');
            const metaEl = this.getDom('quranStudyPanelMeta');
            const statusEl = this.getDom('quranStudyPanelStatus');
            const audioStatusEl = this.getDom('quranStudyAudioStatus');
            const textEl = this.getDom('quranStudyPanelText');
            const reflectionEl = this.getDom('quranStudyReflection');

            if (!panel || !titleEl || !metaEl || !statusEl || !audioStatusEl || !textEl || !reflectionEl) {
                return;
            }

            this.studyPanelRequestId += 1;
            this.stopActiveAyahAudio({ silent: true });
            this.activeStudyContent = null;
            panel.classList.add('is-hidden');
            panel.setAttribute('aria-hidden', 'true');
            titleEl.textContent = 'تأمل الآية';
            metaEl.textContent = '';
            statusEl.textContent = '';
            audioStatusEl.textContent = '';
            textEl.textContent = '';
            reflectionEl.textContent = '';
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

        async shareActiveAyah() {
            try {
                const text = this.buildAyahStudyText();
                if (!text) {
                    showToast('اختر آية أولًا.', 'info');
                    return;
                }

                await shareText(text);
            } catch (error) {
                this.reportUnexpectedError('تعذر مشاركة الآية الآن.', error);
            }
        },

        repeatActiveAyah() {
            if (!this.activeAyahContext?.verseNum) {
                showToast('اختر آية أولًا.', 'info');
                return;
            }

            const player = this.ensureAudioPlayer();
            const result = player.toggleAyah(this.activeAyahContext, { repeatCount: 3 });
            this.renderAudioState(player.getState());

            if (!result?.ok) {
                const state = player.getState();
                showToast(state?.message || 'تعذر تشغيل المعاينة الصوتية.', 'error');
                return;
            }

            if (result?.stopped) {
                showToast('تم إيقاف التكرار الصوتي.', 'info');
                return;
            }

            const mode = player.getState()?.mode;
            if (mode === 'speech-fallback') {
                showToast('تم تشغيل المعاينة الصوتية للآية باستخدام القراءة المدمجة في الجهاز.', 'info');
                return;
            }

            showToast('تم تشغيل تكرار الآية.', 'success');
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

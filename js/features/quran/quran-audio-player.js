function hasSpeechSynthesisSupport() {
    return typeof window !== 'undefined'
        && typeof window.speechSynthesis !== 'undefined'
        && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

function getAyahKey(context) {
    return context?.surahNum && context?.verseNum
        ? `${Number(context.surahNum)}:${Number(context.verseNum)}`
        : '';
}

let cachedArabicVoice = null;
let voicesListenerRegistered = false;

function resolveVoiceFromList(voices = []) {
    if (!Array.isArray(voices) || !voices.length) {
        return null;
    }

    return voices.find(voice => String(voice?.lang || '').toLowerCase().startsWith('ar')) || voices[0] || null;
}

function registerVoicesListener() {
    if (!hasSpeechSynthesisSupport() || voicesListenerRegistered) {
        return;
    }

    voicesListenerRegistered = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
        cachedArabicVoice = resolveVoiceFromList(window.speechSynthesis.getVoices());
    });
}

function resolveArabicVoice() {
    if (!hasSpeechSynthesisSupport()) {
        return null;
    }

    registerVoicesListener();

    if (cachedArabicVoice) {
        return cachedArabicVoice;
    }

    try {
        cachedArabicVoice = resolveVoiceFromList(window.speechSynthesis.getVoices());
        return cachedArabicVoice;
    } catch {
        return null;
    }
}

function createState(partial = {}) {
    return {
        status: 'idle',
        mode: hasSpeechSynthesisSupport() ? 'speech-fallback' : 'unsupported',
        currentKey: '',
        repeatTarget: 0,
        repeatRemaining: 0,
        currentIteration: 0,
        message: '',
        ...partial
    };
}

export function createQuranAudioPlayer({ onStateChange } = {}) {
    let state = createState();
    let currentUtterance = null;
    let currentContext = null;

    function emit(nextPartial = {}) {
        state = createState({
            ...state,
            ...nextPartial
        });

        if (typeof onStateChange === 'function') {
            onStateChange({ ...state });
        }

        return { ...state };
    }

    function stopSpeech() {
        if (!hasSpeechSynthesisSupport()) {
            return false;
        }

        try {
            window.speechSynthesis.cancel();
            currentUtterance = null;
            return true;
        } catch {
            currentUtterance = null;
            return false;
        }
    }

    function speakCurrentIteration() {
        if (!hasSpeechSynthesisSupport() || !currentContext?.text || !state.currentKey) {
            emit({
                status: 'error',
                message: 'لا تتوفر معاينة صوتية على هذا المتصفح.'
            });
            return { ok: false, reason: 'unsupported' };
        }

        stopSpeech();

        const utterance = new window.SpeechSynthesisUtterance(currentContext.text);
        utterance.lang = 'ar';
        utterance.dir = 'rtl';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        const voice = resolveArabicVoice();
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'ar';
        }

        utterance.onstart = () => {
            emit({
                status: 'playing',
                message: `جاري تشغيل معاينة صوتية للآية (${state.currentIteration}/${state.repeatTarget}).`
            });
        };

        utterance.onend = () => {
            if (!state.currentKey) {
                return;
            }

            if (state.repeatRemaining > 1) {
                emit({
                    status: 'starting',
                    repeatRemaining: state.repeatRemaining - 1,
                    currentIteration: state.currentIteration + 1,
                    message: `إعادة تشغيل الآية (${state.currentIteration + 1}/${state.repeatTarget}).`
                });
                speakCurrentIteration();
                return;
            }

            currentUtterance = null;
            currentContext = null;
            emit({
                status: 'idle',
                currentKey: '',
                repeatRemaining: 0,
                currentIteration: 0,
                repeatTarget: 0,
                message: 'انتهت المعاينة الصوتية للآية.'
            });
        };

        utterance.onerror = () => {
            currentUtterance = null;
            currentContext = null;
            emit({
                status: 'error',
                currentKey: '',
                repeatRemaining: 0,
                currentIteration: 0,
                repeatTarget: 0,
                message: 'تعذر تشغيل المعاينة الصوتية للآية على هذا الجهاز.'
            });
        };

        currentUtterance = utterance;

        try {
            window.speechSynthesis.speak(utterance);
            return { ok: true, mode: state.mode };
        } catch {
            currentUtterance = null;
            currentContext = null;
            emit({
                status: 'error',
                currentKey: '',
                repeatRemaining: 0,
                currentIteration: 0,
                repeatTarget: 0,
                message: 'فشل بدء المعاينة الصوتية للآية.'
            });
            return { ok: false, reason: 'speak_failed' };
        }
    }

    function playAyah(context, { repeatCount = 3 } = {}) {
        const key = getAyahKey(context);
        const safeRepeatCount = Math.max(1, Number(repeatCount) || 1);

        if (!key || !String(context?.text || '').trim()) {
            emit({
                status: 'error',
                message: 'لا توجد آية صالحة للتشغيل.'
            });
            return { ok: false, reason: 'invalid_context' };
        }

        if (!hasSpeechSynthesisSupport()) {
            emit({
                status: 'error',
                mode: 'unsupported',
                message: 'المعاينة الصوتية غير مدعومة في هذا المتصفح.'
            });
            return { ok: false, reason: 'unsupported' };
        }

        currentContext = {
            surahNum: Number(context.surahNum),
            verseNum: Number(context.verseNum),
            text: String(context.text).trim()
        };

        emit({
            status: 'starting',
            mode: 'speech-fallback',
            currentKey: key,
            repeatTarget: safeRepeatCount,
            repeatRemaining: safeRepeatCount,
            currentIteration: 1,
            message: `جاري تجهيز المعاينة الصوتية للآية (1/${safeRepeatCount}).`
        });

        return speakCurrentIteration();
    }

    function stop({ silent = false } = {}) {
        const hadActivePlayback = Boolean(state.currentKey || currentUtterance);
        stopSpeech();
        currentContext = null;
        const nextState = emit({
            status: 'idle',
            currentKey: '',
            repeatRemaining: 0,
            currentIteration: 0,
            repeatTarget: 0,
            message: silent ? '' : 'تم إيقاف المعاينة الصوتية.'
        });

        return {
            ok: true,
            stopped: hadActivePlayback,
            state: nextState
        };
    }

    function toggleAyah(context, { repeatCount = 3 } = {}) {
        const key = getAyahKey(context);
        if (!key) {
            emit({ status: 'error', message: 'لا توجد آية صالحة للتشغيل.' });
            return { ok: false, reason: 'invalid_context' };
        }

        if (state.currentKey === key && (state.status === 'starting' || state.status === 'playing')) {
            return {
                ok: true,
                stopped: true,
                state: stop().state
            };
        }

        return playAyah(context, { repeatCount });
    }

    return {
        getState() {
            return { ...state };
        },
        playAyah,
        toggleAyah,
        stop
    };
}

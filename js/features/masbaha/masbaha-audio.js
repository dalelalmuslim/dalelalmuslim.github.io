import { appLogger } from '../../shared/logging/app-logger.js';

export function createMasbahaAudioPlayer() {
    try {
        const audio = new Audio('./assets/audio/tasbeeh-click.mp3');
        audio.preload = 'auto';
        return audio;
    } catch (error) {
        return null;
    }
}

export function playMasbahaClick(audio, { isSilent }) {
    if (isSilent || !audio) return;

    try {
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    } catch (error) {
        appLogger.error(error);
    }
}

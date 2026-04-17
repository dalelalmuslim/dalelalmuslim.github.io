// js/features/masbaha/masbaha-session-actions.js
//
// Responsibility: counting, silent toggle, target update, reset, UI sync.

import { APP_CONFIG } from '../../app/app-config.js';
import { scheduleRender } from '../../shared/render/render-scheduler.js';
import { vibrateDevice } from '../../services/platform/haptics.js';
import { emitStatsChanged } from '../../domains/stats/stats-events.js';
import { achievements } from '../../services/engagement/index.js';
import { showToast } from '../../app/shell/app-shell.js';
import { closeModal, openModal } from '../../app/ui/modal-manager.js';
import { setAriaPressed } from '../../shared/dom/dom-helpers.js';
import {
    loadMasbahaPreferences,
    persistMasbahaTarget,
    persistSilentMode,
    loadCustomAzkarList,
    resetCurrentSession,
    incrementMasbaha,
    getCurrentSessionTasbeeh,
} from '../../domains/masbaha/masbaha-store.js';
import { masbahaProgressStore } from '../../domains/masbaha/masbaha-progress-store.js';
import {
    createMasbahaAudioPlayer,
    playMasbahaClick,
} from './masbaha-audio.js';
import { updateMasbahaSummaryUI } from './masbaha-renderers.js';
import {
    cacheMasbahaDom,
    resolveMashabaElement,
    restoreMasbahaPrimaryButton,
} from './masbaha-dom.js';

export function createMasbahaSessionActions(controller) {
    return {

        queueMasbahaRerender() {
            scheduleRender('masbaha-ui', () => controller.updateUI());
            emitStatsChanged({ source: 'masbaha' });
        },

        init() {
            controller.dom = cacheMasbahaDom();
            controller.loadSettings();
            controller.setupAudio();
            controller.updateSilentIcon();
            controller.updateUI();
        },

        loadSettings() {
            const { currentTarget, isSilent } = loadMasbahaPreferences({
                defaultTarget: APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
                defaultSilent: APP_CONFIG.DEFAULTS.SILENT_MODE,
            });

            controller.currentTarget = currentTarget;
            controller.isSilent = isSilent;
            controller.customAzkar = loadCustomAzkarList();

            // Sync target input in the zikr sheet.
            const targetInput = resolveMashabaElement(controller.dom, 'targetInput', 'masbahaTargetInput');
            if (targetInput) targetInput.value = controller.currentTarget;
        },

        setupAudio() {
            controller.audio = createMasbahaAudioPlayer();
        },

        playClickSound() {
            playMasbahaClick(controller.audio, { isSilent: controller.isSilent });
        },

        updateTarget() {
            const targetInput = resolveMashabaElement(controller.dom, 'targetInput', 'masbahaTargetInput');
            const raw = Number(targetInput?.value);
            const next = Number.isFinite(raw) && raw >= 1
                ? Math.floor(raw)
                : APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET;

            controller.currentTarget = next;
            persistMasbahaTarget(next);

            // Normalize input to the clamped value.
            if (targetInput) targetInput.value = next;

            controller.queueMasbahaRerender();
            showToast('تم تحديث هدف الدورة 🎯');
        },

        toggleSilent() {
            controller.isSilent = !controller.isSilent;
            persistSilentMode(controller.isSilent);
            controller.updateSilentIcon();
            showToast(controller.isSilent ? 'وضع صامت 🔇' : 'الصوت مُفعَّل 🔊');
        },

        updateSilentIcon() {
            const icon = resolveMashabaElement(controller.dom, 'silentIcon', 'silentIcon');
            if (icon) {
                icon.className = controller.isSilent
                    ? 'fa-solid fa-volume-xmark'
                    : 'fa-solid fa-volume-high';
            }
            setAriaPressed(
                resolveMashabaElement(controller.dom, 'silentToggle', 'mashabaSilentToggle'),
                controller.isSilent,
            );
        },

        async increment() {
            const snapshot = incrementMasbaha(1);
            if (!snapshot) return;

            controller.playClickSound();

            // Batch completion → stronger haptic.
            if (snapshot.currentSessionTasbeeh % controller.currentTarget === 0) {
                vibrateDevice([80, 40, 80]);
            } else {
                vibrateDevice(30);
            }

            achievements?.checkAchievements?.();
            controller.queueMasbahaRerender();
        },

        reset() {
            openModal(resolveMashabaElement(controller.dom, 'resetModal', 'resetMasbahaModal'));
        },

        closeResetModal() {
            closeModal(resolveMashabaElement(controller.dom, 'resetModal', 'resetMasbahaModal'));
        },

        confirmReset() {
            resetCurrentSession();
            controller.isCustomEntryActive = false;
            restoreMasbahaPrimaryButton();
            controller.queueMasbahaRerender();
            controller.closeResetModal();
            showToast('تم تصفير جلسة المسبحة 🔄');
        },

        updateUI() {
            const sessionCount = getCurrentSessionTasbeeh();
            const target = controller.currentTarget;
            const currentPhase = Math.floor(sessionCount / target) % controller.azkarCycle.length;
            const nextPhase = (currentPhase + 1) % controller.azkarCycle.length;

            const dailyCount = masbahaProgressStore.getDailyTasbeeh?.() ?? 0;
            const dailyTarget = masbahaProgressStore.getDailyTasbeehTarget?.()
                ?? APP_CONFIG.DEFAULTS.DAILY_TASBEEH_TARGET;
            const streakCount = masbahaProgressStore.getStreakCount?.() ?? 0;

            updateMasbahaSummaryUI({
                dom: controller.dom,
                sessionCount,
                target,
                isCustomEntryActive: controller.isCustomEntryActive,
                currentEntryText: controller.azkarCycle[currentPhase],
                // Show next only when cycle has more than one distinct option.
                nextEntryText: controller.azkarCycle.length > 1
                    ? controller.azkarCycle[nextPhase]
                    : null,
                dailyCount,
                dailyTarget,
                streakCount,
            });
        },
    };
}

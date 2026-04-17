// js/features/masbaha/masbaha-custom-actions.js
//
// Responsibility: zikr selection sheet + custom zikr CRUD.
// Replaces the old masbahaCustomEntriesModal with a bottom-sheet pattern.

import { closeModal, openModal } from '../../app/ui/modal-manager.js';
import { showToast } from '../../app/shell/app-shell.js';
import {
    loadCustomAzkarList,
    persistCustomAzkarList,
    resetCurrentSession,
} from '../../domains/masbaha/masbaha-store.js';
import { renderMasbahaZikrList } from './masbaha-renderers.js';
import { focusMashabaInput, resolveMashabaElement } from './masbaha-dom.js';

const MAX_ZIKR_LENGTH = 200;

// ── Sheet open/close ──────────────────────────────────────

function getSheet(dom) {
    return resolveMashabaElement(dom, 'zikrSheet', 'masbahaZikrSheet');
}

export function createMasbahaCustomActions(controller) {
    // Backdrop click listener — bound once per init.
    let backdropListenerBound = false;

    function bindBackdropOnce() {
        if (backdropListenerBound) return;
        backdropListenerBound = true;
        const backdrop = resolveMashabaElement(controller.dom, 'zikrBackdrop', 'masbahaZikrBackdrop');
        backdrop?.addEventListener('click', () => controller.closeZikrSheet());
    }

    return {

        // ── Sheet lifecycle ─────────────────────────────

        openZikrSheet() {
            const sheet = getSheet(controller.dom);
            if (!sheet) return;

            bindBackdropOnce();
            controller.renderZikrList();
            sheet.classList.add('is-open');
            sheet.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';

            // Focus the new entry input after sheet slides in.
            focusMashabaInput(controller.dom, 'newEntryInput', 'newMasbahaEntryInput', 320);
        },

        closeZikrSheet() {
            const sheet = getSheet(controller.dom);
            if (!sheet) return;
            sheet.classList.remove('is-open');
            sheet.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        },

        // ── Zikr list render ────────────────────────────

        renderZikrList() {
            controller.customAzkar = loadCustomAzkarList();
            const container = resolveMashabaElement(controller.dom, 'zikrList', 'masbahaZikrList');

            // Determine active text for highlighting.
            const sessionCount = controller.updateUI
                ? (() => {
                    // Read current entry text from DOM (avoids coupling to store import here).
                    const el = resolveMashabaElement(
                        controller.dom, 'currentEntryDisplay', 'masbahaCurrentEntryDisplay',
                    );
                    return el?.textContent?.trim() ?? '';
                })()
                : '';

            renderMasbahaZikrList({
                container,
                azkarCycle: controller.azkarCycle,
                customAzkar: controller.customAzkar,
                activeEntryText: sessionCount,
                isCustomEntryActive: controller.isCustomEntryActive,
                onSelectBase: (idx) => controller.selectBaseEntry(idx),
                onSelectCustom: (text) => controller.selectCustomEntry(text),
                onDeleteCustom: (idx) => controller.deleteCustomEntry(idx),
            });
        },

        // ── Base zikr selection ─────────────────────────

        selectBaseEntry(idx) {
            const targetEntry = controller.azkarCycle[idx];
            if (!targetEntry) return;

            // Rotate cycle so selected item is at index 0.
            const rotated = [
                ...controller.azkarCycle.slice(idx),
                ...controller.azkarCycle.slice(0, idx),
            ];
            controller.azkarCycle = rotated;
            controller.isCustomEntryActive = false;

            const el = resolveMashabaElement(
                controller.dom, 'currentEntryDisplay', 'masbahaCurrentEntryDisplay',
            );
            if (el) el.textContent = targetEntry;

            resetCurrentSession();
            controller.queueMasbahaRerender();
            controller.closeZikrSheet();
        },

        // ── Custom zikr ─────────────────────────────────

        selectCustomEntry(text) {
            controller.isCustomEntryActive = true;
            const el = resolveMashabaElement(
                controller.dom, 'currentEntryDisplay', 'masbahaCurrentEntryDisplay',
            );
            if (el) el.textContent = text;

            resetCurrentSession();
            controller.queueMasbahaRerender();
            controller.closeZikrSheet();
        },

        saveCustomEntry() {
            const input = resolveMashabaElement(controller.dom, 'newEntryInput', 'newMasbahaEntryInput');
            if (!input) return;

            const text = input.value.trim();
            if (!text) return;

            if (text.length > MAX_ZIKR_LENGTH) {
                showToast(`الحد الأقصى ${MAX_ZIKR_LENGTH} حرفاً`, 'error');
                return;
            }

            if (controller.azkarCycle.includes(text)) {
                showToast('هذا الذكر موجود بالفعل في الأذكار الأساسية', 'error');
                return;
            }

            if (!controller.customAzkar.includes(text)) {
                controller.customAzkar.unshift(text);
                persistCustomAzkarList(controller.customAzkar);
            }

            input.value = '';
            controller.selectCustomEntry(text);
            showToast('تمت الإضافة ✨');
        },

        deleteCustomEntry(idx) {
            controller.entryToDeleteIndex = idx;
            openModal(
                resolveMashabaElement(controller.dom, 'deleteEntryModal', 'masbahaDeleteEntryModal'),
            );
        },

        closeDeleteEntryModal() {
            closeModal(
                resolveMashabaElement(controller.dom, 'deleteEntryModal', 'masbahaDeleteEntryModal'),
            );
            controller.entryToDeleteIndex = null;
        },

        confirmDeleteEntry() {
            if (controller.entryToDeleteIndex === null) return;
            controller.customAzkar.splice(controller.entryToDeleteIndex, 1);
            persistCustomAzkarList(controller.customAzkar);
            controller.renderZikrList();
            controller.closeDeleteEntryModal();
            showToast('تم حذف الذكر 🗑️');
        },

        // ── Cleanup ─────────────────────────────────────

        closeAllMasbahaOverlays() {
            controller.closeZikrSheet();
            controller.closeDeleteEntryModal();
            controller.closeResetModal?.();
        },

        // ── Legacy shim (kept for any lingering references) ──
        openCustomEntriesModal() { controller.openZikrSheet(); },
        closeCustomEntriesModal() { controller.closeZikrSheet(); },
        renderCustomEntriesList() { controller.renderZikrList(); },
    };
}

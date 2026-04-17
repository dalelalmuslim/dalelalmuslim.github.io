import { emitStatsChanged } from '../../domains/stats/stats-events.js';
import { settingsStore } from '../../domains/settings/settings-store.js';

export function initTheme() {
    const themeName = settingsStore.getTheme();
    this.setTheme(themeName, false);
}

export function setTheme(themeName, persist = true) {
    const themeToApply = typeof themeName === 'string' && themeName.trim()
        ? themeName.trim()
        : settingsStore.getTheme();

    if (persist) {
        settingsStore.setTheme(themeToApply);
    }

    if (themeToApply === 'default') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', themeToApply);
    }
}

export function loadUserProfile() {
    const targetInput = this.getElement('dailyTargetInput');
    const currentTarget = settingsStore.getDailyTasbeehTarget();

    if (targetInput) {
        targetInput.value = currentTarget;
    }
}

export function saveUserProfile() {
    const targetInput = this.getElement('dailyTargetInput');
    const nextTarget = settingsStore.setDailyTasbeehTarget(targetInput?.value);

    if (targetInput) {
        targetInput.value = nextTarget;
    }

    emitStatsChanged({ source: 'settings' });

    this.showToast('تم حفظ هدف التسبيح اليومي ✅', 'success');
}

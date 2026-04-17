// js/features/masbaha/masbaha-controller.js
//
// Responsibility: compose session + custom actions into a single controller.
// Owns mutable runtime state. No DOM access directly — delegates to actions.

import { APP_CONFIG } from '../../app/app-config.js';
import { createMasbahaSessionActions } from './masbaha-session-actions.js';
import { createMasbahaCustomActions } from './masbaha-custom-actions.js';

const BASE_AZKAR_CYCLE = Object.freeze([
    'سبحان الله',
    'الحمد لله',
    'الله أكبر',
    'لا إله إلا الله',
    'اللهم صل على محمد',
    'أستغفر الله',
    'لا حول ولا قوة إلا بالله',
    'حسبنا الله ونعم الوكيل',
]);

const masbahaController = {
    isSilent: APP_CONFIG.DEFAULTS.SILENT_MODE,
    isCustomEntryActive: false,
    currentTarget: APP_CONFIG.DEFAULTS.MASBAHA_BATCH_TARGET,
    customAzkar: [],
    entryToDeleteIndex: null,
    dom: {},
    audio: null,
    // Mutable cycle — base entries are rotated on selection; starts as copy.
    azkarCycle: [...BASE_AZKAR_CYCLE],
};

Object.assign(
    masbahaController,
    createMasbahaSessionActions(masbahaController),
    createMasbahaCustomActions(masbahaController),
);

export const masbahaControllerApi = masbahaController;
export const masbaha = masbahaController;

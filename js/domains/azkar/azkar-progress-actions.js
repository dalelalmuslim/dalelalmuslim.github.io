import { azkarProgressStore } from './azkar-progress-store.js';

export function getAzkarProgressForCategory(categoryKey) {
    return azkarProgressStore.getAzkarProgressForCategory(categoryKey);
}

export function incrementAzkarProgress(categoryKey, index, target) {
    return azkarProgressStore.incrementAzkarProgress(categoryKey, index, target);
}

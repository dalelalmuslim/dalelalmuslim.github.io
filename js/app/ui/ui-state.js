export const uiState = {
    currentSection: 'home',
    activeModal: null,
    activeSubview: null,
    isRendering: false,
    lastRenderAt: 0
};

export function setCurrentSection(sectionName) {
    if (typeof sectionName === 'string' && sectionName.trim()) {
        uiState.currentSection = sectionName.trim();
    }
}

export function getCurrentSection() {
    return uiState.currentSection;
}

export function isHomeSection() {
    return uiState.currentSection === 'home';
}

export function setActiveModal(modalName) {
    uiState.activeModal = typeof modalName === 'string' && modalName.trim() ? modalName.trim() : null;
}

export function clearActiveModal() {
    uiState.activeModal = null;
}

export function getActiveModal() {
    return uiState.activeModal;
}

export function isActiveModal(modalName) {
    return uiState.activeModal === modalName;
}

export function setActiveSubview(subviewName) {
    uiState.activeSubview = typeof subviewName === 'string' && subviewName.trim() ? subviewName.trim() : null;
}

export function clearActiveSubview() {
    uiState.activeSubview = null;
}

export function getActiveSubview() {
    return uiState.activeSubview;
}

export function isActiveSubview(subviewName) {
    return uiState.activeSubview === subviewName;
}

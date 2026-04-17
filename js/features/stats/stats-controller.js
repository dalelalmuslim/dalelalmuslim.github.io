import { renderStatsSurface } from './stats-renderers.js';

export const statsController = {
    initialized: false,

    init() {
        if (!this.initialized) {
            this.initialized = true;
        }
        this.refreshSurface();
    },

    refreshSurface() {
        renderStatsSurface();
    },

    render() {
        this.refreshSurface();
    }
};

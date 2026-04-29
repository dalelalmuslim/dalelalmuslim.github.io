import {
  initDuasSection,
  renderDuasSection,
  resetDuasView,
  openDuaCategory,
  closeDuaCategory,
  handleDuasActionTarget,
  dispatchDuasAction
} from './duas-controller.js';
import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';

function renderDuasSurface() {
  return renderDuasSection();
}

export const duasFeature = defineFeatureApi({
  id: 'duas',
  title: 'الأدعية',
  init({ app }) {
    app.safeInit('feature:duas:init', initDuasSection);
  },
  enter({ app }) {
    app.safeInit('feature:duas:render', renderDuasSurface);
  },
  refresh({ app }) {
    app.safeInit('feature:duas:refresh', renderDuasSurface);
  },
  leave() {
    resetDuasView();
  },
  capabilities: {
    renderCatalog: renderDuasSurface,
    resetView: resetDuasView,
    openCategory: openDuaCategory,
    closeCategory: closeDuaCategory,
    handleActionTarget: handleDuasActionTarget,
    dispatchAction: dispatchDuasAction
  }
});

export const duasSection = duasFeature;

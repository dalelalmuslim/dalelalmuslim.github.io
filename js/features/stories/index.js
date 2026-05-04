import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';
import {
  initStoriesSection,
  renderStoriesSection,
  resetStoriesView,
  handleStoriesActionTarget,
  dispatchStoriesAction,
  openStoryCategory,
  closeStoryReader
} from './stories-controller.js';

export const storiesFeature = defineFeatureApi({
  id: 'stories',
  title: 'قصص وعبر',
  init({ app }) {
    app.safeInit('feature:stories:init', initStoriesSection);
  },
  enter({ app }) {
    app.safeInit('feature:stories:render', renderStoriesSection);
  },
  refresh({ app }) {
    app.safeInit('feature:stories:refresh', renderStoriesSection);
  },
  leave({ app }) {
    app.safeInit('feature:stories:leave', resetStoriesView);
  },
  capabilities: {
    renderCatalog: renderStoriesSection,
    resetView: resetStoriesView,
    openCategory: openStoryCategory,
    closeStoryReader,
    handleActionTarget: handleStoriesActionTarget,
    dispatchAction: dispatchStoriesAction
  }
});

export const storiesSection = storiesFeature;

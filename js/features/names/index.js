import {
  copyActiveNameDetail,
  initNamesSection,
  markDailyNameCompleted,
  markNamesQuizKnown,
  markNamesQuizNeedsReview,
  openDailyName,
  openNextWirdName,
  renderNamesSection,
  restartNamesQuiz,
  resumeLastViewedName,
  reviewWeakNamesQuiz,
  revealNamesQuizAnswer,
  selectName,
  setNamesFilter,
  setNamesQuizMode,
  toggleActiveNameWird,
  toggleNameFavorite,
  toggleNameWird
} from './names-controller.js';
import { defineFeatureApi } from '../../shared/contracts/define-feature-api.js';

function renderNamesSurface() {
  return renderNamesSection();
}

export const namesFeature = defineFeatureApi({
  id: 'names',
  title: 'أسماء الله الحسنى',
  init({ app }) {
    app.safeInit('feature:names:init', initNamesSection);
  },
  enter() {
    return renderNamesSurface();
  },
  refresh() {
    return renderNamesSurface();
  },
  capabilities: {
    renderCatalog: renderNamesSurface,
    toggleFavorite: toggleNameFavorite,
    toggleWird: toggleNameWird,
    toggleActiveWird: toggleActiveNameWird,
    setFilter: setNamesFilter,
    selectName,
    openDailyName,
    markDailyComplete: markDailyNameCompleted,
    openNextWird: openNextWirdName,
    resumeName: resumeLastViewedName,
    copyDetail: copyActiveNameDetail,
    setQuizMode: setNamesQuizMode,
    revealQuizAnswer: revealNamesQuizAnswer,
    markQuizKnown: markNamesQuizKnown,
    markQuizReview: markNamesQuizNeedsReview,
    restartQuiz: restartNamesQuiz,
    reviewWeakQuiz: reviewWeakNamesQuiz
  }
});

export const namesSection = namesFeature;

function createMockStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

globalThis.localStorage = createMockStorage();

const { APP_CONFIG } = await import('./js/app/app-config.js');
const { storage } = await import('./js/services/storage/index.js');
const { namesStore } = await import('./js/domains/names/names-store.js');
const selectors = await import('./js/domains/names/names-selectors.js');
const { ALLAH_NAMES } = await import('./data/names/names-data.js');

const namesArray = Array.isArray(ALLAH_NAMES?.ar) ? ALLAH_NAMES.ar : [];
const todayKey = '2026-04-06';
storage.getLocalDateKey = () => todayKey;
storage.getLocalMonthKey = () => '2026-04';

const legacyState = {
  schemaVersion: 11,
  namesState: {
    favorites: [1, 4],
    wird: { indices: [2, 5], lastOpenedIndex: 2 },
    dailyName: { index: 3, date: todayKey },
    dailyPractice: { completedDate: todayKey, lastCompletedIndex: 3, totalCompletedDays: 7 },
    learningProgress: { viewedIndices: [4, 7], lastViewedIndex: 7, lastViewedAt: '2026-04-05T10:00:00.000Z' },
    view: { activeFilter: 'favorites', activeNameIndex: 7 }
  }
};

globalThis.localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(legacyState));
storage.init();

const migrated = namesStore.getState();
assert(storage.state.schemaVersion === 12, 'schemaVersion should migrate to 12');
assert(Array.isArray(migrated.favorites) && migrated.favorites.length === 2, 'favorites should survive migration');
assert(Array.isArray(migrated.wird.indices) && migrated.wird.indices.length === 2, 'wird should survive migration');
assert(migrated.quiz.mode === 'name-to-meaning', 'quiz mode should default correctly');
assert(Array.isArray(migrated.quiz.queueIndices) && migrated.quiz.queueIndices.length === 0, 'quiz queue should default empty');
assert(migrated.dailyPractice.totalCompletedDays === 7, 'daily practice total should survive migration');

namesStore.setQuizMode('meaning-to-name');
let quiz = namesStore.startQuiz(namesArray.length);
assert(quiz.mode === 'meaning-to-name', 'quiz mode should update');
assert(quiz.queueIndices.length === namesArray.length, 'full quiz queue should cover all names');

quiz = namesStore.revealQuizAnswer();
assert(quiz.revealed === true, 'reveal should mark current quiz as revealed');

const currentIndex = selectors.getCurrentQuizIndex();
const firstAnswer = namesStore.answerCurrentQuiz({ known: false });
assert(firstAnswer.advanced === true, 'first answer should advance the quiz');
assert(firstAnswer.currentIndex === currentIndex, 'first answer should report the current index');
assert(namesStore.getState().quiz.attemptCount === 1, 'attempt count should increase after answer');
assert(namesStore.getState().quiz.weakIndices.includes(currentIndex), 'weak indices should capture failed card');
assert(namesStore.getState().learningProgress.lastViewedIndex === currentIndex, 'quiz answer should mark entry as viewed');

const weakReview = namesStore.startQuiz(namesArray.length, { source: 'weak', sourceIndices: namesStore.getState().quiz.weakIndices });
assert(weakReview.queueIndices.length === 1, 'weak review queue should contain only weak entries');
const weakIndex = weakReview.queueIndices[0];
assert(weakIndex === currentIndex, 'weak review should target the failed card');
const weakProgressBefore = selectors.getQuizProgress(namesArray);
assert(weakProgressBefore.currentEntry?.index === weakIndex, 'quiz selector should expose current weak entry');

namesStore.revealQuizAnswer();
namesStore.answerCurrentQuiz({ known: true });
assert(!namesStore.getState().quiz.weakIndices.includes(weakIndex), 'known answer should clear entry from weak list');

const progress = selectors.getQuizProgress(namesArray);
assert(progress.attemptCount >= 1, 'quiz progress should expose attempts');
assert(progress.correctCount >= 1, 'quiz progress should expose correct answers');
assert(typeof selectors.getNamesSummary(namesArray).quizWeak === 'number', 'names summary should expose quiz weak count');

const report = {
  schemaVersion: storage.state.schemaVersion,
  quizAttempts: progress.attemptCount,
  quizCorrect: progress.correctCount,
  weakRemaining: progress.weakCount,
  dailyCompleted: selectors.getDailyPracticeState(namesArray).isCompletedToday,
  viewedCount: selectors.getNamesSummary(namesArray).viewed,
  status: 'PASS'
};

console.log(JSON.stringify(report, null, 2));

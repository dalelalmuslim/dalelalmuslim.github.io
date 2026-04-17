
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.window = undefined;
globalThis.document = undefined;

const { storage } = await import('./js/services/storage/storage-manager.js');
const { createBaseStorageState } = await import('./js/services/storage/storage-schema.js');

function freshState(overrides = {}) {
  return {
    ...createBaseStorageState(),
    ...overrides,
    azkarSession: {
      ...createBaseStorageState().azkarSession,
      ...(overrides.azkarSession || {})
    }
  };
}

function resetStorageState(state, { today = '2026-04-08', month = '2026-04', diff = 1 } = {}) {
  storage.cancelPendingQuickSave?.();
  storage.pendingQuickSaveDirty = false;
  storage.state = state;
  storage.getLocalDateKey = () => today;
  storage.getLocalMonthKey = () => month;
  storage.getDayDifference = () => diff;
}

// same day: no destructive reset
resetStorageState(freshState({
  lastDate: '2026-04-08',
  lastMonthKey: '2026-04',
  streakCount: 3,
  dailyTasbeeh: 77,
  currentSessionTasbeeh: 11,
  azkarProgress: { morning: true },
  tasks: [{ id: '1', text: 'x', completed: true }],
  completedTasks: ['1']
}), { today: '2026-04-08', month: '2026-04' });
let changed = storage.checkNewDay();
assert(changed === false, 'same-day should not report changed');
assert(storage.state.dailyTasbeeh === 77, 'same-day should preserve dailyTasbeeh');
assert(storage.state.currentSessionTasbeeh === 11, 'same-day should preserve currentSessionTasbeeh');
assert(storage.state.tasks[0].completed === true, 'same-day should preserve completed tasks');

// next day: reset daily/session/task completion and increment streak
resetStorageState(freshState({
  lastDate: '2026-04-07',
  lastMonthKey: '2026-04',
  streakCount: 3,
  dailyTasbeeh: 77,
  currentSessionTasbeeh: 11,
  azkarProgress: { morning: true },
  azkarSession: { activeCategorySlug: 'morning', activeCategoryTitle: 'Morning', activeItemIndex: 4, startedAt: 'ts', view: 'detail' },
  tasks: [{ id: '1', text: 'x', completed: true }, { id: '2', text: 'y', completed: false }],
  completedTasks: ['1']
}), { today: '2026-04-08', month: '2026-04', diff: 1 });
changed = storage.checkNewDay();
assert(changed === true, 'new-day should report changed');
assert(storage.state.streakCount === 4, 'next-day should increment streak');
assert(storage.state.dailyTasbeeh === 0, 'next-day should reset dailyTasbeeh');
assert(storage.state.currentSessionTasbeeh === 0, 'next-day should reset currentSessionTasbeeh');
assert(Object.keys(storage.state.azkarProgress).length === 0, 'next-day should clear azkarProgress');
assert(storage.state.azkarSession.activeCategorySlug === '', 'next-day should clear activeCategorySlug');
assert(storage.state.azkarSession.view === 'grid', 'next-day should reset azkarSession view');
assert(storage.state.tasks.every(task => task.completed === false), 'next-day should reset task completion');
assert(storage.state.completedTasks.length === 0, 'next-day should recalc completedTasks');
assert(storage.state.lastDate === '2026-04-08', 'next-day should advance lastDate');

// skipped days: reset streak to 1
resetStorageState(freshState({
  lastDate: '2026-04-01',
  lastMonthKey: '2026-04',
  streakCount: 9
}), { today: '2026-04-08', month: '2026-04', diff: 7 });
changed = storage.checkNewDay();
assert(changed === true, 'skipped-day should report changed');
assert(storage.state.streakCount === 1, 'skipped-day should reset streak to 1');

// first open ever: start streak at 1
resetStorageState(freshState({
  lastDate: '',
  lastMonthKey: '2026-04',
  streakCount: 0
}), { today: '2026-04-08', month: '2026-04', diff: 0 });
changed = storage.checkNewDay();
assert(changed === true, 'first-open should report changed');
assert(storage.state.streakCount === 1, 'first-open should start streak at 1');

// month rollover: reset monthlyTasbeeh even if same calendar day key changed state only by month
resetStorageState(freshState({
  lastDate: '2026-04-08',
  lastMonthKey: '2026-03',
  monthlyTasbeeh: 500
}), { today: '2026-04-08', month: '2026-04', diff: 0 });
changed = storage.checkNewDay();
assert(changed === true, 'month rollover should report changed');
assert(storage.state.monthlyTasbeeh === 0, 'month rollover should reset monthlyTasbeeh');
assert(storage.state.lastMonthKey === '2026-04', 'month rollover should advance lastMonthKey');

console.log('day_cycle_validation_gate: PASS');

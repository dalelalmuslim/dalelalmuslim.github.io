import { getStorageDateKey, getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getDuaManifestEntryByKey, resolveDuaSlug } from '../../../data/duas/manifest.js';

const DEFAULT_HISTORY = Object.freeze({
  lastVisitedSlug: '',
  lastVisitedTitle: '',
  lastVisitedAt: '',
  lastViewedDuaId: null,
  dailyVisits: {},
  recentSlugs: []
});

function ensureHistoryState() {
  const state = getStorageState();
  if (!state) return { ...DEFAULT_HISTORY, dailyVisits: {}, recentSlugs: [] };
  const source = state.duasHistory && typeof state.duasHistory === 'object' ? state.duasHistory : {};
  const recentSlugs = Array.isArray(source.recentSlugs) ? Array.from(new Set(source.recentSlugs.map(resolveDuaSlug).filter(Boolean))).slice(-7) : [];
  const dailyVisits = source.dailyVisits && typeof source.dailyVisits === 'object' ? source.dailyVisits : {};
  state.duasHistory = {
    lastVisitedSlug: resolveDuaSlug(source.lastVisitedSlug || source.lastVisitedTitle),
    lastVisitedTitle: typeof source.lastVisitedTitle === 'string' ? source.lastVisitedTitle.trim() : '',
    lastVisitedAt: typeof source.lastVisitedAt === 'string' ? source.lastVisitedAt : '',
    lastViewedDuaId: Number.isFinite(Number(source.lastViewedDuaId)) ? Number(source.lastViewedDuaId) : null,
    dailyVisits,
    recentSlugs
  };
  return state.duasHistory;
}

function pruneDailyVisits(dailyVisits) {
  const dates = Object.keys(dailyVisits).sort().slice(-21);
  return Object.fromEntries(dates.map(dateKey => [dateKey, Array.from(new Set((dailyVisits[dateKey] || []).map(resolveDuaSlug).filter(Boolean)))]));
}

export const duasHistoryStore = {
  getState() {
    return ensureHistoryState();
  },
  markVisited(category, activeDuaId = null) {
    const entry = getDuaManifestEntryByKey(category);
    const slug = entry?.slug || resolveDuaSlug(category);
    if (!slug) return null;
    return updateStorageState((state) => {
      const current = ensureHistoryState();
      const today = getStorageDateKey();
      const currentDay = Array.isArray(current.dailyVisits[today]) ? current.dailyVisits[today] : [];
      state.duasHistory = {
        ...current,
        lastVisitedSlug: slug,
        lastVisitedTitle: entry?.title || category?.title || '',
        lastVisitedAt: new Date().toISOString(),
        lastViewedDuaId: Number.isFinite(Number(activeDuaId)) ? Number(activeDuaId) : current.lastViewedDuaId,
        recentSlugs: Array.from(new Set([...(current.recentSlugs || []).filter(item => item !== slug), slug])).slice(-7),
        dailyVisits: pruneDailyVisits({
          ...current.dailyVisits,
          [today]: [...currentDay, slug]
        })
      };
      return state.duasHistory;
    });
  }
};

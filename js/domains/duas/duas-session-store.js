import { getStorageState, updateStorageState } from '../../services/storage/storage-access.js';
import { getDuaManifestEntryByKey, resolveDuaSlug } from '../../../data/duas/manifest.js';

const DEFAULT_SESSION = Object.freeze({
  activeCategorySlug: '',
  activeCategoryTitle: '',
  activeDuaId: null,
  startedAt: '',
  lastViewedAt: '',
  view: 'grid'
});

function ensureSessionState() {
  const state = getStorageState();
  if (!state) return { ...DEFAULT_SESSION };
  const source = state.duasSession && typeof state.duasSession === 'object' ? state.duasSession : {};
  state.duasSession = {
    activeCategorySlug: resolveDuaSlug(source.activeCategorySlug || source.activeCategoryTitle),
    activeCategoryTitle: typeof source.activeCategoryTitle === 'string' ? source.activeCategoryTitle.trim() : '',
    activeDuaId: Number.isFinite(Number(source.activeDuaId)) ? Number(source.activeDuaId) : null,
    startedAt: typeof source.startedAt === 'string' ? source.startedAt : '',
    lastViewedAt: typeof source.lastViewedAt === 'string' ? source.lastViewedAt : '',
    view: source.view === 'list' ? 'list' : 'grid'
  };
  return state.duasSession;
}

export const duasSessionStore = {
  getState() {
    return ensureSessionState();
  },
  openCategory(category, options = {}) {
    const entry = getDuaManifestEntryByKey(category);
    const slug = entry?.slug || resolveDuaSlug(category);
    if (!slug) return null;

    return updateStorageState((state) => {
      const current = ensureSessionState();
      const resolvedActiveDuaId = Number.isFinite(Number(options.activeDuaId)) ? Number(options.activeDuaId) : null;
      state.duasSession = {
        ...current,
        activeCategorySlug: slug,
        activeCategoryTitle: entry?.title || category?.title || '',
        activeDuaId: resolvedActiveDuaId,
        startedAt: current.activeCategorySlug === slug && current.startedAt ? current.startedAt : new Date().toISOString(),
        lastViewedAt: new Date().toISOString(),
        view: 'list'
      };
      return state.duasSession;
    });
  },
  setActiveDua(duaId) {
    return updateStorageState((state) => {
      const current = ensureSessionState();
      state.duasSession = {
        ...current,
        activeDuaId: Number.isFinite(Number(duaId)) ? Number(duaId) : current.activeDuaId,
        lastViewedAt: new Date().toISOString()
      };
      return state.duasSession;
    });
  },
  reset() {
    return updateStorageState((state) => {
      state.duasSession = { ...DEFAULT_SESSION };
      return state.duasSession;
    });
  }
};

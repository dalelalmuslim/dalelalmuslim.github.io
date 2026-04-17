# Duas Foundation + UI Redesign

This phase moved the duas section from shared catalog rendering into a dedicated foundation:

- `data/duas/manifest.js` provides stable metadata and slugs.
- `js/domains/duas/*` owns repository, session, preferences, history, and selectors.
- `js/features/duas/*` owns rendering and interaction flow.

## Adding a new dua to an existing category
1. Edit `data/duas/duas-data.js`
2. Add a new item under the target Arabic category title.
3. Keep `id` unique.

## Adding a new duas category
1. Add the new category array in `data/duas/duas-data.js`
2. Add matching metadata entry in `data/duas/manifest.js`
3. Rebuild the SW manifest:

```bash
node tools/build-sw-manifest.mjs
node tools/verify-architecture.mjs
```

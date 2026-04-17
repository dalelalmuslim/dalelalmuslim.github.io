# Pass 41 — Duas Corrective Rebuild

## Scope
Targeted corrective rebuild for the Duas section after functional regressions in session flow, catalog ordering, search indexing, and responsive behavior.

## Files changed
- `js/app/ui/subview-manager.js`
- `js/domains/duas/duas-session-store.js`
- `js/domains/duas/duas-selectors.js`
- `js/features/duas/duas-dom.js`
- `js/features/duas/duas-renderers.js`
- `js/features/duas/duas-controller.js`
- `css/features/duas.css`
- regenerated `sw-manifest.js`
- regenerated `css/app.css`
- added `tools/verify-duas-pass41.mjs`

## Functional fixes
1. **Subview lifecycle repaired**
   - Duas subview now uses a stable catalog wrapper (`duasCatalogHome`) so subview open/close works with browser back handling.
   - Closing the category view resets the session and rerenders the catalog home.

2. **Session leakage fixed**
   - `activeDuaId` is explicitly set on category open.
   - Moving between categories no longer leaks the previous active dua selection.

3. **Home entry behavior stabilized**
   - Section render now opens the catalog home by default instead of implicitly restoring a stale category session.

4. **Catalog order corrected**
   - Category ordering now follows `manifest.sortOrder` rather than item count or ad hoc pinning.

5. **Search indexing corrected**
   - Search now indexes full dua text and references for every item in each category, not only a small preview slice.

6. **Source filters corrected**
   - `من القرآن` returns only Quran-only categories.
   - `من السنة` returns only Hadith-only categories.
   - Mixed categories remain available in the general catalog.

7. **Daily card simplified**
   - The heavy decorative treatment was reduced to a calmer surface.
   - Daily card actions remain limited to copy/share/open-category.

8. **Mobile grid corrected**
   - Category grid now uses `auto-fit/minmax(180px, 1fr)`.
   - Forced one-column layout under 760px was removed.

## Targeted verification added
Custom verifier: `tools/verify-duas-pass41.mjs`

It checks:
- manifest editorial ordering
- exact Quran/Hadith filter behavior
- deep full-text category search
- active dua reset across category changes
- shell markup contracts required by subview manager

## Verification run
Succeeded:
- `node tools/build-app-css.mjs`
- `node tools/build-sw-manifest.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-external-boundaries.mjs`
- `node tools/verify-startup-dependencies.mjs`
- `node tools/verify-feature-startup-plan.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`
- `node tools/verify-duas-pass41.mjs`

## Result
Pass 41 closes the known Duas regressions in state flow, ordering, indexing, and responsive layout without widening scope into unrelated sections.

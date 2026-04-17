# PASS 42 — Duas UX Cleanup

## Scope
Refined the Duas section UI/UX per the latest direction:
- remove the daily card from the Duas home page
- remove the add-to-favorites button from the Duas UI
- simplify the catalog home to sticky search + filters + category grid
- improve the category session page spacing, sizing, and hierarchy
- replace the large "back to categories" button with a compact icon close/back control

## Files Changed
- `js/features/duas/duas-renderers.js`
- `js/features/duas/duas-controller.js`
- `js/features/duas/duas-dom.js`
- `css/features/duas.css`
- regenerated `sw-manifest.js`

## UX Changes
### Home (catalog)
- removed the daily card entirely
- kept only sticky search, filter chips, and category grid
- removed favorites filter from the visible Duas UI because the add-to-favorites action was removed
- simplified category cards to icon + title + count + source
- tightened vertical spacing and card density

### Inside category
- removed the large text button row and favorite button from the visible session header
- removed the large text "back to categories" CTA
- added a compact icon-only close/back control in the session header
- simplified metadata to count + source only
- improved card spacing, text sizing, and action placement for copy/share

## Verification Run
Succeeded:
- `node --check js/features/duas/duas-renderers.js`
- `node --check js/features/duas/duas-controller.js`
- `node --check js/features/duas/duas-dom.js`
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

## Outcome
The Duas section now follows a cleaner two-state UX:
1. home = sticky search + filters + categories
2. category = compact header + dua list

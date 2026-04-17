# Pass 39 — Duas Layout Tightening

## What changed
- Removed the large inner title/description block from the duas section.
- Removed resume and insights cards from the section shell.
- Reordered the section so users see:
  1. search/filter toolbar
  2. categories grid
  3. daily dua card
- Kept the daily dua text full, but shortened the displayed reference to avoid oversized cards.
- Simplified category cards to reduce clutter.
- Removed focus mode controls and the per-item "تركيز" action.
- Renamed visible feature title from `الأدعية الجامعة` to `الأدعية`.
- Tightened spacing and reduced unnecessary vertical gaps.
- Improved category search by normalizing Arabic text and including item text/reference snippets.
- Updated daily-dua selection to use a deterministic local-date hash instead of weak digit summing.

## Files changed
- `css/features/duas.css`
- `css/app.css`
- `js/features/duas/duas-renderers.js`
- `js/features/duas/duas-controller.js`
- `js/features/duas/index.js`
- `js/features/feature-startup-plan.js`
- `js/domains/duas/duas-selectors.js`
- `sw-manifest.js`

## Verification
Succeeded:
- `node tools/build-app-css.mjs`
- `node tools/build-sw-manifest.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-architecture.mjs`

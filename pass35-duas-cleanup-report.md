# Pass 35 — Duas UI Cleanup

## Scope
Refined the Duas section to be simpler, cleaner, and more modern without breaking the existing action hooks or feature wiring.

## Files Changed
- `css/features/duas.css`
- `css/app.css` (regenerated)
- `js/features/duas/duas-renderers.js`
- `js/domains/duas/duas-selectors.js`
- `sw-manifest.js` (regenerated)

## What Changed
- Simplified the hero area and removed visual clutter.
- Redesigned the daily dua card into a lighter, cleaner layout.
- Simplified the resume and insight cards.
- Reworked the catalog cards into minimal modern cards with cleaner hierarchy.
- Reduced metadata noise and replaced dense lines with compact pills.
- Cleaned the session header and item cards for better reading focus.
- Exposed `repeat` in item cards when present.
- Fixed daily dua CTA visibility by returning `categorySlug` from the selector.
- Unified source labels in the session view (`من القرآن` / `من السنة` / `قرآن • سنة`).

## Verification
Passed:
- `node tools/build-static-shell.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-external-boundaries.mjs`
- `node tools/verify-startup-dependencies.mjs`
- `node tools/verify-feature-startup-plan.mjs`
- `node tools/verify-architecture.mjs`

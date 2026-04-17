# Phase 5 — Architecture Closure

## What changed
- Removed the legacy `js/tasks/*` runtime layer completely.
- Introduced `js/domains/tasks/*` so task state/logic now lives behind domain actions and selectors.
- Moved task UI helpers into `js/features/tasks/tasks-view.js` and replaced legacy task motivation wiring with `js/features/tasks/tasks-header-state.js`.
- Added reusable scaffolds for adding new sections and domains:
  - `scaffolds/css/section-template.example.css`
  - `scaffolds/js/domains/domain-template.example.js`
  - `docs/06-new-section-scaffold.md`
- Reduced `css/shared/surfaces.css` so feature-owned rules are no longer concentrated there.
- Updated `sw.js` to precache the new task/domain files and dropped removed legacy files.
- Strengthened `tools/verify-architecture.mjs` to fail if `js/tasks/` comes back.

## Verification result
- syntax errors = 0
- missing local imports = 0
- cross-feature imports = 0
- missing SW URLs = 0
- legacy js/tasks files = 0
- inline handlers = 0
- inline styles = 1 (dynamic progress width only)

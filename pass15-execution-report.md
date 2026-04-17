# Pass 15 Execution Report — Baseline Enforcement + CSP Debt Reduction

## Scope executed
This pass implemented the next execution priorities directly on the codebase:
1. baseline enforcement in CI
2. removal of current inline-style / `element.style.*` debt
3. DOM safety verification for trusted HTML boundaries

## What was implemented

### 1) Baseline enforcement
Added:
- `.github/workflows/architecture-baseline.yml`
- `tools/verify-dom-safety.mjs`

Updated:
- `tools/verify-architecture.mjs`

What changed:
- architecture verification now fails on:
  - stale `index.html`
  - stale `css/app.css`
  - stale `sw-manifest.js`
  - DOM safety violations
- CI now runs:
  - `node tools/build-static-shell.mjs`
  - `node tools/verify-architecture.mjs`
  - `node names_validation_gate.mjs`
  - `node names_n1_harness.mjs`
  - `node quran_validation_gate.mjs`
  - `node day_cycle_validation_gate.mjs`

### 2) Inline style debt reduction
Removed current `style="..."` and `.style.*` usage from active runtime paths.

Implemented:
- class-based progress utilities (`.u-progress-0..100`)
- class-based display utilities (`.u-display-block/flex/grid/inline-flex`)
- `setProgressPercent()` / `buildProgressClassName()` in `js/shared/dom/dom-helpers.js`
- class-based visibility handling in `js/app/ui/visibility.js`

Updated runtime/files:
- `js/shared/dom/dom-helpers.js`
- `js/app/ui/visibility.js`
- `js/app/ui/modal-manager.js`
- `js/app/ui/subview-manager.js`
- `js/features/quran/quran-reader-controller.js`
- `js/pwa-support/pwa-install-prompt.js`
- `js/features/stories/stories-renderers.js`
- `js/features/azkar/azkar-header-renderers.js`
- `js/features/azkar/azkar-grid-renderers.js`
- `js/features/azkar/azkar-session-renderers.js`
- `js/services/auth/firebase-auth-renderers.js`
- `js/features/masbaha/masbaha-dom.js`
- `src/index-fragments/content/primary-content.html`
- `css/app-fragments/07-utilities.css`
- `css/features/settings.css`

### 3) Trusted HTML boundary verification
Added verification for:
- inline style attributes
- style mutations via `element.style.*`
- raw HTML writes outside approved renderer/helper allowlist

Intentional policy:
- trusted HTML writes remain allowed only in known renderer/controller/helper files
- no raw HTML writes are allowed to spread silently into new files

## Verification results
Succeeded after execution:
- `node tools/build-static-shell.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

Important final state:
- `inlineStylesCount: 0`
- `styleMutations: []`
- `rawHtmlWritesOutsideAllowlist: []`
- `staleGeneratedAppCss: false`
- `staleGeneratedIndex: false`
- `staleGeneratedSwManifest: false`
- `zeroInboundJsFiles: []`

## Engineering verdict
This pass closes the first practical hardening step after the main refactor program:
- baseline drift is now enforced
- current CSP-related inline style debt was materially reduced
- DOM injection boundaries are now guarded by verification instead of convention only

## Remaining intentional debt
Still intentionally left for later:
- existing allowlisted trusted-HTML renderer paths were not rewritten in this pass
- third-party/CDN reduction is not part of this pass yet
- CSP can be tightened further only after broader audit of allowed external origins and any remaining dynamic style requirements

# Phase 14 — Root Hygiene / Docs Cleanup

## Goal
Clean the repository root and move operational/project documentation into `docs/` without changing runtime behavior.

## Changes
- Moved root documentation files into `docs/`:
  - `ARCHITECTURE.md` -> `docs/architecture.md`
  - `CHANGELOG.md` -> `docs/changelog.md`
  - `MAINTENANCE_GUIDE.md` -> `docs/maintenance-guide.md`
  - `RELEASE_READINESS.md` -> `docs/release-readiness.md`
- Moved `verify-phase13.json` into `docs/history/verify-phase13.json`
- Added `docs/README.md` as a documentation index
- Updated `README.md` references to the new documentation paths
- Extended `docs/09-naming-conventions.md` with root hygiene rules
- Regenerated `sw-manifest.js`

## Result
- Runtime behavior unchanged
- Cleaner root with runtime-relevant files only
- Documentation easier to navigate and maintain

## Verification
- `node tools/build-sw-manifest.mjs`
- `node tools/verify-architecture.mjs`

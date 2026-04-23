# Phase 2 — Manual Content Refresh + Stale Detection

## Scope
- Add per-section stale payload detection.
- Add manual content refresh from the public content API.
- Surface refresh status and stale sections in Settings.
- Extend support bundle/runtime diagnostics with refresh metadata.

## Why
Phase 2 already had:
- public content API
- remote-first content client
- content source observability

But it was still missing two operational capabilities:
1. knowing when a section version moved ahead of the cached payload
2. forcing a manual resync without waiting for a future app open

## Implementation Notes
- `content-client` now computes freshness using stored version, cached payload version, and the latest remote version snapshot.
- `content-source-observability` now records stale sections and the lifecycle of manual refresh runs.
- Settings now expose:
  - current source summary
  - last manual refresh state
  - per-section stale indicators
  - one-click manual refresh
- Support bundle schema was bumped to `3` to include refresh metadata and stale fields.

## Verification
- `npm run verify:content-refresh`
- included in `npm run check`

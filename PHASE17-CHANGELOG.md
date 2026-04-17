# Phase 17 — Service Worker 2.0 / Workbox-like Architecture

## Summary
Refactored the HTML-first PWA Service Worker into a policy-driven architecture inspired by Workbox, without introducing Vite, Workbox package dependencies, or a new runtime model.

## What changed
- Rebuilt `sw.js` around:
  - manifest normalization
  - route policies
  - strategy factories
  - plugin-like update hooks
- Introduced route-based caching policies:
  - documents → `network-first`
  - Quran surahs → `cache-first + background revalidate`
  - Azkar category files → `cache-first + background revalidate`
  - other `/data/*` → `stale-while-revalidate`
  - static assets → `stale-while-revalidate`
  - runtime fallbacks → `cache-first`
- Added lightweight plugin-inspired hooks:
  - `cacheWillUpdate`
  - `cacheDidUpdate`
- Added client broadcasts from the Service Worker:
  - `SW_ACTIVATED`
  - `CACHE_UPDATED`
- Updated `js/pwa.js` to listen for Service Worker messages for logging and future UX hooks.
- Upgraded `tools/build-sw-manifest.mjs` to emit:
  - `precache` object
  - `warmDataUrls`
  - routing metadata
- Added `docs/11-service-worker-architecture.md`
- Updated `docs/README.md`

## Notes
- This phase intentionally does **not** reduce the precache payload yet. That is the next logical step (`Phase 17-B`).
- The project remains fully static / HTML-first and suitable for direct phone testing.

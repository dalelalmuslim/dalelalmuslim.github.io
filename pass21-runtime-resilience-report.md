# Pass 21 — Runtime Resilience + Bootstrap Verification Hardening

## Executive Summary
This pass implements the agreed P1 work on top of Pass 20:
1. Centralized runtime logging for application JavaScript
2. Storage initialization status contract in bootstrap
3. Day-cycle task aggregation instead of repeated swallow-and-continue blocks
4. Stronger browser module graph verification that exercises real bootstrap branches

## What changed

### 1) Central runtime logger
Added:
- `js/shared/logging/app-logger.js`

Applied across application JavaScript:
- replaced `console.error / console.warn / console.log` in runtime JS with `appLogger.error / warn / info`
- logger stores in-memory history, emits `azkar:log`, supports optional debug console mirroring via runtime flag, and can forward to `globalThis.__AZKAR_TELEMETRY__`

Important boundary:
- application JS now has **zero `console.*` calls**
- service worker files and tooling scripts intentionally remain unchanged in this pass

### 2) Storage bootstrap contract
Updated:
- `js/services/platform/browser-storage.js`
- `js/services/storage/storage-manager.js`
- `js/app/core/app-startup.js`

Key changes:
- added `getStorageAvailability()` probe
- `storage.init()` now returns structured status:
  - `ok`
  - `fatal`
  - `persistent`
  - `recovered`
  - `stateChanged`
  - `reason`
  - `error`
- bootstrap now records storage status on `appApi.storageStatus` and `appApi.bootstrapStatus.storage`
- bootstrap stops on fatal storage init status
- degraded non-persistent mode now surfaces a warning toast instead of silently pretending persistence exists

### 3) `safeInit()` now catches async failures too
Updated:
- `js/app/core/app-dom.js`

`safeInit()` previously only caught synchronous exceptions.
It now catches promise rejections as well and reports them through `appLogger`.

This matters for:
- feature init flows
- background warmups
- async bootstrap helpers

### 4) Day-cycle aggregation
Updated:
- `js/app/lifecycle/day-cycle.js`

Replaced repeated independent `try/catch + console.error` calls with:
- explicit task list
- aggregated result envelope
- structured failures list
- `appEventBus.emit('app:day-cycle', summary)`
- `app.bootstrapStatus.dayCycle` snapshot
- warning toast when the day-cycle is only partially successful

### 5) Browser module graph verifier v2
Updated:
- `tools/verify-browser-module-graph.mjs`

The verifier now:
- imports **`js/main.js`** instead of only `start-app.js`
- runs **two scenarios**:
  - `document.readyState = 'loading'`
  - `document.readyState = 'complete'`
- dispatches `DOMContentLoaded` in the loading scenario
- asserts that bootstrap completes
- asserts that global/UI listeners are actually bound:
  - `document.body click/change/keydown`
  - `window popstate/focus`

This closes the previous false-confidence gap where only a shallow import smoke ran.

## Verification
Passed after implementation:
- `node tools/build-static-shell.mjs`
- `node tools/verify-browser-module-graph.mjs`
- `node tools/verify-dom-safety.mjs`
- `node tools/verify-external-boundaries.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`
- `node day_cycle_validation_gate.mjs`

## Engineering verdict
Pass 21 closes the highest-value runtime resilience gaps from the latest review without opening a broad refactor program.

What is materially better now:
- startup has storage status instead of silent continuation
- async bootstrap errors are no longer silently missed by `safeInit()`
- day-cycle failures are aggregated and observable
- runtime JS logging is centralized
- bootstrap verification now tests both DOM readiness paths and listener registration

## Remaining intentional debt
- service worker logging is still separate from app logger
- there is still no full startup dependency DAG validation yet
- there is still no end-to-end real-browser click smoke automation in this container

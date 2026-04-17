# Pass 8 Report

## Scope
Performance Pass 2 focused on **deterministic DOM work reduction** inside the Names feature.

## What changed

### 1) Keyed grid reuse instead of full rebuild
File:
- `js/features/names/names-controller.js`

Implemented:
- `namesCardCache` keyed by `name index`
- `renderedGridKeys` tracking current visible order
- `getNameCardRenderSignature(item)` to detect when a card actually changed
- `getOrCreateRenderedNameCard(item)` to reuse unchanged card DOM
- `renderGrid()` now:
  - rebuilds only when order/filter changes
  - replaces only cards whose render signature changed
  - keeps unchanged cards mounted

### 2) Skip grid work for quiz-only and daily-completion flows
File:
- `js/features/names/names-controller.js`

Updated `renderNamesUI()` to accept:
- `skipGrid`

Used `skipGrid: true` for flows that do **not** affect the visible card grid, including:
- `markDailyNameCompleted()`
- `setNamesQuizMode()`
- `revealNamesQuizAnswer()`
- `answerNamesQuiz()`
- `restartNamesQuiz()`
- `reviewWeakNamesQuiz()`

## Engineering effect
Before this pass, many Names interactions caused broad DOM replacement, especially the 99-card grid.
After this pass:
- grid replacement is **selective**
- quiz interactions no longer touch the grid at all
- selecting a different name typically updates only the affected cards instead of rebuilding the whole list

This is a high-confidence optimization because it changes **render strategy**, not domain logic.

## Verification
Passed after the changes:
- `node --check js/features/names/names-controller.js`
- `node tools/build-sw-manifest.mjs`
- `node tools/verify-architecture.mjs`
- `node names_validation_gate.mjs`
- `node names_n1_harness.mjs`
- `node quran_validation_gate.mjs`

## Current SW manifest version
- `unknown`

## Result
This pass is expected to reduce visible jank inside the Names section, especially when:
- selecting different names repeatedly
- running quiz actions
- toggling state that previously triggered a broad grid rebuild

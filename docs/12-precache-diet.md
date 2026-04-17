# Precache Diet

## Goal
Reduce install/update payload while keeping the app usable offline for the critical shell and the highest-value initial content.

## Policy
- **Precache** only:
  - documents
  - shell assets
  - home feed essentials
  - azkar manifest + category files
- **Warm in background** only:
  - first azkar category
  - first surah
- **Lazy-cache on demand**:
  - duas
  - names
  - stories
  - quran legacy bundle

## Why
The old precache data bucket included several large files that made install and update heavier than necessary. The current policy keeps the most valuable offline paths available immediately, while deferring heavier catalog data until the user opens that section.

## Expected outcome
- smaller first install
- faster update path
- lower cache churn as the project grows
- better fit for an HTML-first app that is tested directly on mobile

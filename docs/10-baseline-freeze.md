# Baseline Freeze

This project is now considered structurally frozen after the organizational cleanup passes.

## What is allowed after this point
- feature work for new sections
- targeted UX fixes
- bug fixes
- performance improvements backed by profiling
- content/data updates

## What should not happen casually
- renaming root folders (`js`, `css`, `data`)
- moving runtime files across layers without a clear ownership reason
- adding new cross-feature imports
- restoring dumping-ground files such as a generic `modules.css`
- putting docs, reports, or temporary files back into the project root

## Change discipline
For any future section, follow the existing pattern:
- `js/features/<section>/`
- `js/domains/<section>/` when domain state/logic is needed
- `css/features/<section>.css`
- `data/<section>/` when dedicated content/data exists

## Release discipline
Before release:
```bash
node tools/build-sw-manifest.mjs
node tools/verify-architecture.mjs
```

If these fail, do not release until the violations are fixed.

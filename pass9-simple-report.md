# Pass 9 — New-Day Verification + Full Ads Removal

## Done
- Verified `checkNewDay()` behavior with a dedicated validation gate.
- Removed all ad UI slots, rewarded-ad UI, fixed video banner, ad CSS, ad services, and ad wiring.
- Removed ad/reward fields from storage schema and stopped any ad-related state handling.
- Removed ad initialization and navigation updates from app startup/runtime.
- Regenerated `sw-manifest.js` and removed stale fallback references.

## New-Day Validation Result
`day_cycle_validation_gate.mjs`: PASS

Covered cases:
- same day: no reset
- next day: reset daily/session counters and task completion
- skipped days: streak resets to 1
- first open: streak starts at 1
- month rollover: monthly tasbeeh resets

## Final Verification
Passed:
- `tools/verify-architecture.mjs`
- `names_validation_gate.mjs`
- `names_n1_harness.mjs`
- `quran_validation_gate.mjs`
- `day_cycle_validation_gate.mjs`

## Firebase Note
Code-side auth path is intact, but Firebase Console restrictions cannot be verified from the repo itself.
Required manual console check:
- Authentication -> Settings -> Authorized domains: add the production domain(s)
- Confirm Firebase Security Rules are not open
- Confirm API key restrictions are appropriate for the used Firebase/Google APIs

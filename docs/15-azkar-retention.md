# Azkar Healthy Retention

## Scope
This phase adds low-risk retention features to the Azkar section without changing the HTML-first architecture.

## What changed
- Favorites are stored in `azkarPreferences.favoriteSlugs`.
- Smart ordering is stored in `azkarPreferences.smartOrderingEnabled`.
- Reminder intent is stored in `azkarPreferences.reminderWindow` and `azkarPreferences.reminderEnabled`.
- The Azkar dashboard now shows:
  - daily completion summary
  - weekly consistency
  - current streak
  - reminder mode
- Category cards now surface favorite state.
- Session view now exposes favorite and reminder controls.

## Important note about reminders
This phase adds **reminder preferences and in-app cues** only.
It does **not** schedule guaranteed OS-level background notifications yet.
A later integration can connect these preferences to the notifications service if needed.

## Data additions
`azkarPreferences` now includes:
- `favoriteSlugs: string[]`
- `smartOrderingEnabled: boolean`
- `reminderWindow: 'off' | 'smart' | 'morning' | 'evening' | 'prayer' | 'sleep'`
- `reminderEnabled: boolean`

## Why this was done first
The goal was to improve healthy daily return behavior using:
- lower friction resume
- clearer progress feedback
- favorite shortcuts
- smarter ordering
- gentle cues

This gives immediate UX value without introducing backend or scheduling complexity.

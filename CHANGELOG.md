# Changelog

## [2.1.1] - 2026-03-06

### Added

- `slayr` in artist replace ignore list

### Fixed

- Using cached data if force present, make it impossible to overwrite cached album

## [2.1.0] - 2026-03-05

### Added

- `src/core/` module: `api`, `dom`, `exceptions`, `metadata`, `settings`, `ui`, `utils` (logic moved out of `app.tsx`)

### Changed

- App entry point: `app.tsx` only wires UI and update flow; core logic lives in `src/core/`
- Metadata: `getMeta()` is synchronous; object built with small helpers (`s`, `n`, `disc`) and safe fallbacks
- UI lifecycle: UI is always created and initialized so enabling the extension after start works; songchange listener registered once
- Types: removed duplicate `_State` in `global.d.ts`; `ScoreItem` progress bar width clamped for invalid scores

### Fixed

- `getTrack()`: null/undefined disc treated as disc 1; safe check for missing disc/track index

### Removed

- `src/components/Icons.tsx`, `src/components/TrackItem.tsx`
- `src/exceptions.tsx`, `src/utils.tsx` (replaced by `src/core/exceptions.ts`, `src/core/utils.ts`)
- `scripts/meta.js`, `src/generated/meta.ts` (replaced by extras script and generated extras)

## [2.0.3] - 2026-02-18

### Fixed

- `artistLower` copies album title breaking the artist similarity comparison entirely
- Show in Sidebar/Now Playing are not working properly
- Car Seat Headrest 'Twin Fantasy' searched incorrectly
- David Bowie 'Blackstar' searched incorrectly

## [2.0.2] - 2026-01-06

### Fixed

- M.I.A. - ΛΛ Λ Y Λ searched incorrectly
- galen tipton/dj galen searched incorrectly

## [2.0.1] - 2026-01-02

### Changed

- Logo, icon and description
- Suffix " / Album" is now removed from album names in all cases

### Fixed

- Tapir!'s debut album was searched incorrectly
- Song features appears in the song title in NPV widget
- Fixed border radius and artist appearance in NPV widget

## [2.0.0] - 2025-12-17

### Added

- AOTY score cards in Now Playing view
- Comprehensive versioning system and changelog documentation
- Dynamic changelog popup with automatic HTML conversion and rendering
- User-configurable settings to toggle score visibility in Now Playing bar and view
- `global.d.ts` for better typing

### Changed

- Enhanced similarity detection algorithms
- Restructured AOTY data parsing format for improved performance, accuracy and code maintainability & readability.
- Refactored project structure with improved code organization and maintainability
- Updated code quality standards throughout the codebase

## [1.0.1] - 2025-12-14

### Changed

- "Scores refreshed" notification now displays only when manually triggered via refresh button
- Relocated `setAppearance()` function to `utils.tsx` for better code organization
- Improved project structure and enhanced overall code quality

### Fixed

- Corrected logging prefix to properly display `[AOTYfy]` in console output
- Fixed lowercase display name issue in manifest configuration

## [1.0.0] - 2025-12-12

- Initial release.

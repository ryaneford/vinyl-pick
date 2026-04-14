# Changelog

All notable changes to Vinyl Pick will be documented in this file.

## [1.8.2] - 2026-04-14

### Changed
- Tightened layout to fit on 1710x1112 display without scrolling
- Reduced padding, margins, font sizes, and element spacing throughout
- Smaller heart button and service icons
- Record of the Day thumbnail reduced from 16x16 to 12x12

---

## [1.8.1] - 2026-04-14

### Changed
- Removed Skip button — Pick Another is now the only way to select a record
- Reordered button layout: Mark as Listened is now the primary (green, full-width) button
- Pick Another is now a smaller outlined button
- Start Over is now a red-tinted button to signal destructive action
- Listened button shows "✓ Logged" when active and "Mark as Listened" when available
- Removed S keyboard shortcut (Space=Pick, M=Listened, R=Start Over)

---

## [1.8.0] - 2026-04-14

### Added
- "Listened" button to explicitly log records as listened (separate from Pick)
- Listening Journal modal with timestamps (relative: "2m ago", "3d ago", etc.)
- Confirmation dialogs for Start Over and Clear History actions
- Mark as Listened keyboard shortcut (M)

### Changed
- Pick Another no longer auto-logs — records stay available until explicitly logged
- Reset replaced with Start Over (clears pick pool only, preserves journal) and Clear History
- Progress bar now shows "X of Y picked" and "N logged as listened"
- History footer link renamed to "Journal"
- History data format includes timestamps (auto-migrates old data)

---

## [1.7.1] - 2026-04-14

### Added
- Clean URL after OAuth login (strips token/verifier query params)

---

## [1.7.0] - 2026-04-14

### Added
- Animated slide/fade transition when picking a new record
- Vinyl spin animation on album art during pick
- Shake animation on Pick Another button hover
- Progress bar showing percentage of collection played
- Record of the Day - daily cached pick with album art
- PWA support - installable on mobile home screen
- Confetti celebration when entire collection has been played
- Album detail tooltips on Recent and Favorites covers
- Mobile swipe on Recent/Favorites cover rows

### Changed
- Favorites section temporarily hidden (commented out)
- README screenshot centered with width constraint
- Recent section uses 3D cover flow with perspective

---

## [1.6.0] - 2026-04-14

### Added
- Listening History modal with detailed list (cover art, title, artist, year)
- Footer with Collection Stats, History, FAQ, and Source links
- Collection Stats now opens as a modal popup
- 3D cover flow effect on Recent section
- Larger touch targets for mobile (bigger nav arrows, cover thumbnails)
- Touch swipe support on album card (swipe right to pick, left to dismiss)
- Screenshot added to README

### Changed
- Increased recent history from 10 to 15 picks
- Recent and Favorites thumbnails enlarged from 12x12 to 16x16
- FAQ link moved from standalone "?" button to footer
- Stats panel converted from collapsible section to modal popup
- Source link opens GitHub repo in new tab

### Fixed
- Clear button repositioned to same line as "Recent" header

---

## [1.5.2] - 2026-04-14

### Added
- Navigation arrows for Recent and Favorites sections (shows 8 at a time)
- Clear button on Recent header to clear history

### Changed
- Simplified Help & FAQ link to just show "?" instead of text

---

## [1.5.1] - 2026-04-13

### Fixed
- Heart button now only favorites, doesn't open Discogs

---

## [1.5.0] - 2026-04-13

### Removed
- Light mode toggle (dark mode only)
- Show Details feature

---

## [1.4.0] - 2026-04-13

### Added
- FAQ modal popup
- Music service links: Spotify, Apple Music, Tidal, YouTube Music

---

## [1.3.0] - 2026-04-13

### Added
- Clear recent button and swipe/wheel navigation to cover flow
- Cover flow style to recent albums
- Smooth transition animation on pick

---

## [1.2.0] - 2026-04-12

### Added
- Favorites system (heart button)
- History strip with cover flow style
- Filters by genre and decade
- Keyboard shortcuts (Space=Pick, S=Skip, R=Reset)
- Collapsible stats panel

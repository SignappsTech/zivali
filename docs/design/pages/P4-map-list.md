---
source: 03§P4
page: P4 Map and list
stories: TASK-31 (FR-007, FR-004)
platforms: web, mobile
mockup: docs/design/mockups/P4-map-list.html
copy: docs/content/pages/P4-map-list.md
---

# P4 Map and list

## Purpose

Browse lost, found and sighted animals near you. On mobile this is the home screen (Map tab). The map is never the only way in: the same reports are always available as a list with the same filters.

## Mobile (Map tab)

Full-bleed calm map under the status bar, a bottom sheet with the list, one floating control.

1. **Area pill** (top-left, 48 px, `card`, `shadow-md`): map-pin, place and radius ("Ljubljana, 10 km"), and a 32 px circle with the filters icon. Tapping anywhere on it opens the filter sheet. It is the only floating control; there is no locate button (location is set in the filter sheet).
2. **Markers:** pet-photo avatars with a status-colour ring; lost reports on a translucent area disc (fuzzed, at least 500 m); found and sighted ring only; clusters as numbered discs. No other marker types.
3. **Bottom sheet** (peek about 40 %, half, full 92 %): grabber, h2 "Near you" with the count, then pet rows (photo 64, name, status word, time, distance). No tabs, no segmented control, no buttons in the sheet. Full snap is the full list; list scrolls independently of the map.
4. **Ad row** (P21) after every N rows, never first, never adjacent to another ad.
5. Bottom navigation (P2).

### Filter sheet

Opens from the area pill. Title and a text button "Reset". Groups separated by 32 px, no boxes:

| Group | Control |
|---|---|
| Type | three toggle pills: Lost, Found, Sighted (all on by default) |
| Species | two toggle pills: Dogs, Cats |
| When | choice rows: Last 24 hours, 7 days, 30 days |
| Distance | slider 1 to 50 km with the value; "Use my location" text button with the permission fallback |
| More | collapsed: colour (swatch pills), size (three pills) |

Footer: primary `lg` button "Show 12 reports" (live count, Slovenian plural forms one/two/few/other). Closing the sheet applies nothing until the button is pressed on mobile.

### Sorting and extras

Sort text button in the sheet header (Nearest, Newest). Boosted reports (M4) sort first and show a `premium` pill under the status word; no other highlight. A text button "Show closed in the last 30 days" lives at the end of the list.

## Web (`/map`)

- `lg` and up: two panes. Left list pane 420 px (header with count, sort, filter button; rows as on mobile; keyset "Load more"), right map fills the rest. Filters open as a right drawer; the selected filters are summarised as plain text under the header and persisted in the URL. Hovering a row highlights its marker; selecting a marker scrolls the list to its row and opens the detail preview (photo, name, status, distance, "Open") as a popover.
- Below `lg`: same as mobile (map with a sheet) inside the web shell.
- Sidebar: none on this page (map uses the width). Ad row in the list as on mobile.

## States

| State | Behaviour |
|---|---|
| Loading | map placeholder in `map-land` tone, skeleton rows in the sheet or pane |
| Empty region | spot illustration, h3, sentence, primary "Report", text button "Set an alert" (P13) |
| No match for filters | sentence plus text button "Reset filters" |
| Location denied | pill shows the chosen place or "Slovenia"; note in the filter sheet explaining manual choice |
| Error | inline note with retry; map keeps the last result |
| Many results | clustering from 25 markers; list paginates 20 at a time |
| Keyboard | map region is skipped with a "Skip map" link; every row and filter is reachable without the map |

## Responsive

Sheet snap points scale with screen height; at 320 px the pill shortens to place and icon. Web list pane collapses into the sheet pattern at `md`.

## Accessibility

Rows are links with name, status word, time and distance in the accessible name. Marker and cluster labels are announced via the list; the map has a text alternative ("Map of 12 reports near Ljubljana, listed below"). Reduced motion removes sheet spring and marker fade. Filter state is announced when the count changes (polite live region).

### Offline

A `note` above the list: "Brez povezave, zadnja posodobitev …" with the cached list and static map area; filters work on cached data; markers of the cached area only.

## Assets

| File | Brief |
|---|---|
| `assets/empty-no-reports.png` | Empty-state illustration: calm "no reports near you" good news. See image task. |

## Mockup scope (`P4-map-list.html`)

1. Mobile: peek, half and full sheet; filter sheet; filtered empty; empty region; loading; location denied note.
2. Web 1200 px: two panes with a selected marker popover; filter drawer open; empty; below `lg` 768 px.
3. Boosted row example and the ad row position (placeholder from P21).
4. Light and dark.

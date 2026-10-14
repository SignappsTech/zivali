---
source: 03§P5
page: P5 Location picker and privacy-preserving area
stories: TASK-15 (FR-004)
platforms: web, mobile
mockup: docs/design/mockups/P5-location-picker.html
copy: docs/content/pages/P5-location-picker.md
---

# P5 Location picker

## Purpose

One reusable picker for "where" in every flow (report lost, found, sighted, alert area, home area), and the single way a fuzzed public location is drawn. Accurate for the reporter, approximate for everyone else.

## Picker screen (mobile, full screen)

1. Flow top bar (back, step bars when inside a flow, close).
2. Heading question (h1, for example "Where was it last seen?") and a line search field with a map-pin icon ("Search for a place"), results list under it as plain rows (place, municipality).
3. Map fills the rest (calm style). The pin is **fixed at the centre**; the user drags the map under it. Pin: 48 px `primary` circle marker with the tail.
4. For **lost** only: radius control, a slider (200 m to 5 km, default 500 m; stops 200, 300, 400, 500, 750 m, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5 km) with the translucent area disc drawn around the pin (2 px `marker-lost` edge while editing) and the value as text. Below 500 m the radius is kept for matching, but the public disc never draws under 500 m. For **found** and **sighted** no radius.
5. Address line under the map (reverse geocode, "Šiška, Ljubljana") and a text button "Use my location" (with the permission primer from P2 if needed).
6. Privacy line (one sentence, shield icon): the public sees only an approximate area.
7. Primary `lg` button "Confirm location".

## Web

Same content inside a centred 560 px column, with the map 400 px tall under the field, or as a dialog (radius 24) when launched from a flow step. Keyboard: arrow keys nudge the map, `+`/`-` zoom, the slider has a number input alternative.

## Fuzzed public area (display component)

Used by detail (P9), map (P4) and sightings. A translucent disc with the pet avatar at the centre (lost) or ring marker (found, sighted). The disc takes the report's status hue so it never reads as another status: lost `marker-area`, found `marker-found`, sighted `marker-sighted`, all at `--marker-area-alpha` (0.16 light, 0.20 dark), no edge. The main map (P4) still draws discs for lost reports only.

| Type | Minimum displayed radius |
|---|---|
| Lost | 500 m |
| Found and sighted | 150 m |

Always accompanied by text: area name and approximate radius ("Around Šiška, about 500 m"). The exact point is never drawn for anyone but the owner or reporter, who see their own exact pin with a "visible only to you" label. The place where a found animal is kept is never asked for or shown.

## Alert area variant (P13)

Same screen with a home pin (house icon) and a radius slider 1 to 25 km (stops 1, 2, 3, 4, 5, 7, 10, 15, 20, 25 km, default 5 km); no date or time; standard top bar without step bars when opened from settings. The area disc is `primary` at `--marker-area-alpha` with a 2 px `primary` edge (it is the user's own area, not a status). Title and button copy differ.

## States

| State | Behaviour |
|---|---|
| GPS denied or unavailable | note "We could not get your location"; search and pin drop work |
| Searching | result rows skeleton |
| No results | sentence and a hint to drop the pin |
| Outside Slovenia | non-blocking `note`: out of launch market |
| Offline, lost and alert area | map tiles unavailable: one `note` with a "Try again" text button (it replaces the P2 offline banner on this screen); confirm disabled with the reason; draft preserved |
| Offline, found and sighted (FR-042) | "Use my location" still works from GPS without tiles: the map area stays plain `map-land`, the address line says the GPS point is set and the place name follows when online, confirm stays enabled and the report joins the offline queue (P7). Search shows the offline note. |
| Very large radius | from 3 km the help line becomes a warning (icon and `foreground` text, no warning colour): big areas reduce match quality; confirm stays enabled |
| Dragging | address line shows a loading state |

## Responsive

On short screens the privacy line collapses into an info icon button that opens the explanation. Landscape: map and controls side by side.

## Accessibility

Map is supplemented by the search field and by "nudge" buttons (north, south, east, west, 100 m) visible on demand. Slider has value text and number input on web. The privacy line is real text, not an image. Focus order: search, results, map, radius, confirm.

## Assets

None.

## Mockup scope (`P5-location-picker.html`)

1. Mobile: lost (with radius), found (no radius), GPS denied, no results, outside Slovenia, alert-area variant, offline (lost: confirm disabled; found: GPS point, confirm enabled).
2. Web: dialog and inline column.
3. The fuzzed area component at both radii, with the owner's own exact pin variant.
4. Light and dark.

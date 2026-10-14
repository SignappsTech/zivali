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
4. For **lost** only: radius control, a slider (200 m to 5 km, default 500 m) with the translucent area disc drawn around the pin and the value as text. For **found** and **sighted** no radius.
5. Address line under the map (reverse geocode, "Šiška, Ljubljana") and a text button "Use my location" (with the permission primer from P2 if needed).
6. Privacy line (one sentence, shield icon): the public sees only an approximate area.
7. Primary `lg` button "Confirm location".

## Web

Same content inside a centred 560 px column, with the map 400 px tall under the field, or as a dialog (radius 24) when launched from a flow step. Keyboard: arrow keys nudge the map, `+`/`-` zoom, the slider has a number input alternative.

## Fuzzed public area (display component)

Used by detail (P9), map (P4) and sightings. A translucent disc in `marker-area` with the pet avatar at the centre (lost) or ring marker (found, sighted).

| Type | Minimum displayed radius |
|---|---|
| Lost | 500 m |
| Found and sighted | 150 m |

Always accompanied by text: area name and approximate radius ("Around Šiška, about 500 m"). The exact point is never drawn for anyone but the owner or reporter, who see their own exact pin with a "visible only to you" label. The place where a found animal is kept is never asked for or shown.

## Alert area variant (P13)

Same screen with a home pin and a radius slider 1 to 25 km; no date or time. Title and button copy differ.

## States

| State | Behaviour |
|---|---|
| GPS denied or unavailable | note "We could not get your location"; search and pin drop work |
| Searching | result rows skeleton |
| No results | sentence and a hint to drop the pin |
| Outside Slovenia | non-blocking `note`: out of launch market |
| Offline | map tiles unavailable: the field and a "Try again" text button; draft preserved |
| Very large radius | helper warns that big areas reduce match quality |
| Dragging | address line shows a loading state |

## Responsive

On short screens the privacy line collapses into an info icon button that opens the explanation. Landscape: map and controls side by side.

## Accessibility

Map is supplemented by the search field and by "nudge" buttons (north, south, east, west, 100 m) visible on demand. Slider has value text and number input on web. The privacy line is real text, not an image. Focus order: search, results, map, radius, confirm.

## Assets

None.

## Mockup scope (`P5-location-picker.html`)

1. Mobile: lost (with radius), found (no radius), GPS denied, no results, outside Slovenia, alert-area variant.
2. Web: dialog and inline column.
3. The fuzzed area component at both radii, with the owner's own exact pin variant.
4. Light and dark.

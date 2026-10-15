---
doc: design-system
title: Design system (slice)
source: 03§Brand and visual language
version: 0.13
status: Draft, direction A (Lagoon) chosen by the client
date: 2026-10-15
owner: Design Lead
---

<!-- Owner: design-lead. Self-contained slice for implementers (tokens, type, spacing, components, imagery, breakpoints). Do not read 03. Page specifics live in docs/design/pages/P*.md. -->

# Najdimo design system

The product is a lost-pet app for Slovenia (web and mobile). The look is **calm and clean**: flat surfaces separated by tone and space, one action per view, one accent colour, status as an icon plus a coloured word. It must stay warm and trustworthy for frightened users, and readable in direct sunlight.

**Files**

| File | What it is |
|---|---|
| `docs/design/tokens.json` | Source of truth. The tech-lead turns it into `packages/tokens`. |
| `docs/design/tokens.css` | Generated reference output (CSS variables, light and dark). Never edit by hand. |
| `docs/design/build-tokens.mjs` | Reference generator and contrast linter (`node docs/design/build-tokens.mjs`). Fails if a declared pair drops below its minimum. |
| `docs/design/directions/A.html` | Viewable style tile and the key screens in light and dark. |
| `docs/design/brand/` | Logo mark and app icon SVG files. |

# 1. Principles

1. **Calm under stress.** Nothing competes with the one thing to do next. Space and tone, not lines and boxes.
2. **One primary action per view.** Secondary actions are tonal or plain text.
3. **One question per screen** in flows. Prefill from AI and ask for a single confirmation.
4. **Readable outdoors.** 7:1 for body text and the primary action. Body at 16 px or more. Never colour alone.
5. **Private by design.** A lost pet is an area on the map, never a home pin. Phone numbers are never shown.
6. **One vocabulary on web and mobile.** shadcn token names everywhere; React Native Reusables mirrors the web components.
7. **Light and dark are designed together.** Dark is its own palette, not an inversion.

## Visual review checklist

Use this for every mockup and visual review.

- [ ] At most one primary button in the view (none when the view has no primary action, for example an unconfirmed answer or a shelter without a phone).
- [ ] No borders on cards, rows or fields (fields have an underline). No card inside a card.
- [ ] Shadows only on floating controls over a map, sheets, dialogs and popovers.
- [ ] Status is an icon plus a coloured word. A tonal pill appears at most once per page.
- [ ] At most 3 text sizes inside one card or row. Rows carry photo, name, status, time and distance only.
- [ ] Bottom navigation has at most 4 items, icon and label, no count badges.
- [ ] The map shows at most 3 marker styles (avatar, lost-area, cluster) plus the sighting dot on detail maps.
- [ ] One accent (teal). Sun yellow appears only in the logo dot, the reunited moment and illustration.
- [ ] Group gaps of 32 px or more; row gaps 20 px; side gutters 20 px (mobile) and 48 px (web).
- [ ] Contrast and focus checked in light and dark.

# 2. Token architecture

Three layers.

1. **Primitive**: raw colour scales (`primitives.color.<scale>.<step>`), fonts.
2. **Semantic**: the shadcn vocabulary (`background`, `card`, `primary`, ...) plus app tokens (`status-*`, `marker-*`, `map-*`, `premium`, `verified`, `warning`). Defined twice, `light` and `dark`, as references to primitives.
3. **Component**: sizes and shapes in `shape` and `scale.component` (button heights, row photo size, radius per component).

Rules: components use only semantic tokens, never a primitive or a hex. A token key equals its CSS variable (`status-lost-subtle-foreground` becomes `--status-lost-subtle-foreground`). A value is either `"scale.step"` (for example `"lagoon.700"`), `{ "ref": "coral.500", "alpha": 0.16 }`, or a literal `"#RRGGBB"` for map colours.

CSS output uses HSL triplets without the `hsl()` wrapper (`--primary: 190.3 65.5% 22.7%`), so Tailwind 3.4 and NativeWind 4 can write `hsl(var(--primary) / <alpha-value>)`.

# 3. Colour

## 3.1 Primitives

| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| lagoon | #EBF6F7 | #D3ECEE | #A9D9DD | #78C0C7 | #43A1AB | #26828D | #1A6773 | #145360 | #10424D | #0D343D | #08222A |
| mist | #F3F6F6 | #E8EEEE | #D5DEDF | #B9C6C8 | #92A3A6 | #6C8084 | #566A6E | #425458 | #2C3A3E | #1A272B | #101A1D |
| night |  |  |  |  |  | #35555C | #223D43 | #182E33 | #112024 | #0B1618 | #071113 |
| sun | #FFF8E6 | #FFEDB8 | #FFDD85 | #FFC94D | #F7B32B | #E09A12 | #B97A0A | #8F5C0C | #6A4410 | #4A300F |  |
| coral | #FFF2EC | #FFDFD1 | #FFBFA3 | #FF9970 | #F2713F | #D95A24 | #B8481A | #923815 | #6E2A12 | #4B1D0D | #2B0F06 |
| leaf | #ECF8F0 | #D1EFDB | #A5DEB8 | #72C690 | #43AA6B | #2A8D52 | #1F7242 | #195A36 | #14472B | #0F3320 | #07200F |
| sky | #EEF2FE | #DCE5FD | #B9CBFA | #8FA9F4 | #6384EA | #4163D6 | #3049B5 | #273B91 | #1F2F72 | #182354 | #0E153D |
| plum | #FAF0F7 | #F4DDEF | #E8B9DD | #D68ABF | #BE5A9C | #A13B80 | #832D68 | #682554 | #4F1D41 | #36142D | #240B1E |
| crimson | #FFF1F2 | #FFDDE0 |  | #F59AA3 | #E8606E | #D2394A | #B3202F | #8F1925 |  | #4A0D13 | #2A0A0E |

`lagoon` is the brand teal, `mist` the cool neutral, `night` the dark-mode neutral, `sun` the single warm accent, `coral`, `leaf` and `sky` the pet statuses, `plum` premium, `crimson` errors. `paper` is `#FBFDFD`, the card surface. There is no pure black and no pure white.

## 3.2 Semantic tokens (light and dark)

The generated hex values below come from `tokens.json`. "Role" tells you where to use a token.

#### Core (shadcn vocabulary)

| Token | Role | Light | Dark |
|---|---|---|---|
| `background` | Page canvas behind everything | #E8EEEE | #0B1618 |
| `foreground` | Default text and icons on background | #101A1D | #E8EEEE |
| `card` | Raised surface: sheets, grouped lists, web panels. Lighter than background, no border | #FBFDFD | #112024 |
| `card-foreground` | Text and icons on card | #101A1D | #E8EEEE |
| `popover` | Menus, dialogs, date pickers, toasts | #FBFDFD | #182E33 |
| `popover-foreground` | Text on popover | #101A1D | #E8EEEE |
| `primary` | The one main action per view; active nav item; text links | #145360 | #78C0C7 |
| `primary-foreground` | Label and icon on primary | #EBF6F7 | #08222A |
| `secondary` | Tonal, lower-emphasis action and unselected pill | #D3ECEE | #0D343D |
| `secondary-foreground` | Label on secondary | #0D343D | #D3ECEE |
| `muted` | Neutral fills: segmented track, skeleton, disabled button, tag background | #D5DEDF | #182E33 |
| `muted-foreground` | Secondary text, meta (time, distance), placeholders | #425458 | #B9C6C8 |
| `accent` | Soft selected fill (not the ghost hover, see 10.1) | #D3ECEE | #182E33 |
| `accent-foreground` | Text on accent | #0D343D | #F3F6F6 |
| `destructive` | Delete and error text and fill (7:1 with its foreground, because it is the main action of a delete dialog) | #8F1925 | #F59AA3 |
| `destructive-foreground` | Label on destructive | #FFF1F2 | #2A0A0E |
| `border` | Rare hairline (table rows, separators). Not used on cards or fields | #D5DEDF | #223D43 |
| `input` | Field underline and switch track (3:1 or more) | #6C8084 | #6C8084 |
| `ring` | Focus ring, 3 px with 2 px offset | #1A6773 | #78C0C7 |

#### Charts

| Token | Role | Light | Dark |
|---|---|---|---|
| `chart-1` | Chart series 1 | #1A6773 | #78C0C7 |
| `chart-2` | Chart series 2 | #B97A0A | #F7B32B |
| `chart-3` | Chart series 3 | #D95A24 | #F2713F |
| `chart-4` | Chart series 4 | #2A8D52 | #43AA6B |
| `chart-5` | Chart series 5 | #A13B80 | #D68ABF |

#### Sidebar (shelter portal, admin)

| Token | Role | Light | Dark |
|---|---|---|---|
| `sidebar` | Shelter portal and admin sidebar background | #0D343D | #071113 |
| `sidebar-foreground` | Sidebar text | #EBF6F7 | #E8EEEE |
| `sidebar-primary` | Active item in the sidebar (calm light mist, not sun yellow) | #EBF6F7 | #E8EEEE |
| `sidebar-primary-foreground` | Text on sidebar-primary | #0D343D | #101A1D |
| `sidebar-accent` | Sidebar hover and selected fill | #10424D | #182E33 |
| `sidebar-accent-foreground` | Text on sidebar-accent | #EBF6F7 | #F3F6F6 |
| `sidebar-border` | Sidebar dividers | #10424D | #182E33 |
| `sidebar-ring` | Focus ring on the sidebar | #EBF6F7 | #E8EEEE |

#### Pet status

| Token | Role | Light | Dark |
|---|---|---|---|
| `status-lost` | lost: solid (marker rings, solid fills) | #B8481A | #F2713F |
| `status-lost-foreground` | Text and icon on status-lost | #FFF2EC | #2B0F06 |
| `status-lost-subtle` | lost: the one tonal pill | #FFDFD1 | #4B1D0D |
| `status-lost-subtle-foreground` | lost: the status word in lists, and text on the pill (7:1 on card and background) | #6E2A12 | #FFDFD1 |
| `status-lost-border` | lost: edge, rarely used | #FF9970 | #923815 |
| `status-found` | found: solid (marker rings, solid fills) | #195A36 | #43AA6B |
| `status-found-foreground` | Text and icon on status-found | #ECF8F0 | #07200F |
| `status-found-subtle` | found: the one tonal pill | #D1EFDB | #0F3320 |
| `status-found-subtle-foreground` | found: the status word in lists, and text on the pill (7:1 on card and background) | #14472B | #D1EFDB |
| `status-found-border` | found: edge, rarely used | #72C690 | #195A36 |
| `status-sighted` | sighted: solid (marker rings, solid fills) | #3049B5 | #8FA9F4 |
| `status-sighted-foreground` | Text and icon on status-sighted | #EEF2FE | #0E153D |
| `status-sighted-subtle` | sighted: the one tonal pill | #DCE5FD | #182354 |
| `status-sighted-subtle-foreground` | sighted: the status word in lists, and text on the pill (7:1 on card and background) | #1F2F72 | #DCE5FD |
| `status-sighted-border` | sighted: edge, rarely used | #8FA9F4 | #273B91 |
| `status-reunited` | reunited: solid (marker rings, solid fills) | #F7B32B | #F7B32B |
| `status-reunited-foreground` | Text and icon on status-reunited | #101A1D | #101A1D |
| `status-reunited-subtle` | reunited: the one tonal pill | #FFEDB8 | #4A300F |
| `status-reunited-subtle-foreground` | reunited: the status word in lists, and text on the pill (7:1 on card and background) | #6A4410 | #FFEDB8 |
| `status-reunited-border` | reunited: edge, rarely used | #F7B32B | #8F5C0C |

#### Premium, verified, warning, overlay

| Token | Role | Light | Dark |
|---|---|---|---|
| `premium` | Boost and Protect (premium) solid | #682554 | #D68ABF |
| `premium-foreground` | Text on premium | #FAF0F7 | #240B1E |
| `premium-subtle` | Premium mark fill | #F4DDEF | #36142D |
| `premium-subtle-foreground` | Text on premium-subtle | #4F1D41 | #F4DDEF |
| `premium-border` | Premium mark edge (use sparingly) | #D68ABF | #682554 |
| `verified` | Verified shelter or vet solid | #145360 | #78C0C7 |
| `verified-foreground` | Text on verified | #EBF6F7 | #08222A |
| `verified-subtle` | Verified mark fill | #D3ECEE | #0D343D |
| `verified-subtle-foreground` | Text on verified-subtle | #0D343D | #D3ECEE |
| `warning` | Caution solid (rare) | #F7B32B | #F7B32B |
| `warning-foreground` | Text on warning | #101A1D | #101A1D |
| `warning-subtle` | Caution notice fill | #FFEDB8 | #4A300F |
| `warning-subtle-foreground` | Text on warning-subtle | #6A4410 | #FFEDB8 |
| `warning-border` | Caution notice edge | #E09A12 | #8F5C0C |
| `qr` | QR code field. Fixed light in both themes so scanners read it | #FFFFFF | #FFFFFF |
| `qr-foreground` | QR code modules (dark on `qr`, same in both themes; keep a 4-module quiet zone of `qr`) | #101A1D | #101A1D |
| `scrim` | Overlay behind sheets and dialogs (alpha 0.56 light, 0.72 dark) | #071113 | #071113 |

#### Sign-in providers (brand colours, literal values)

| Token | Role | Light | Dark |
|---|---|---|---|
| `provider` | Fill of the Google and Apple buttons (Google light and dark theme; Apple white and black) | #FFFFFF | #131314 |
| `provider-foreground` | Label on provider buttons (Google's label colours; read as black and white for Apple) | #1F1F1F | #E3E3E3 |
| `provider-border` | 1 px inside stroke of provider buttons (Google's stroke; Apple allows a stroke) | #747775 | #8E918F |

#### Map markers

| Token | Role | Light | Dark |
|---|---|---|---|
| `marker-lost` | Map: avatar ring of a lost report | #B8481A | #F2713F |
| `marker-found` | Map: avatar ring of a found report | #195A36 | #43AA6B |
| `marker-sighted` | Map: avatar ring and sighting dot | #3049B5 | #8FA9F4 |
| `marker-reunited` | Map: reunited marker | #B97A0A | #F7B32B |
| `marker-me` | Map: current location dot | #4163D6 | #8FA9F4 |
| `marker-cluster` | Map: cluster bubble | #1A272B | #E8EEEE |
| `marker-cluster-foreground` | Count inside a cluster | #F3F6F6 | #101A1D |
| `marker-ring` | Ring around markers so they lift off the map | #FBFDFD | #071113 |
| `marker-area` | Fill of the fuzzed lost-pet area (alpha 0.16 light, 0.2 dark) | #D95A24 | #F2713F |

#### Map base

| Token | Role | Light | Dark |
|---|---|---|---|
| `map-land` | Map land (equals background) | #E8EEEE | #0F1D20 |
| `map-water` | Map water | #CDE6EA | #123038 |
| `map-park` | Map parks and woods | #D9EEDF | #15302B |
| `map-building` | Map buildings (hidden in the calm style) | #E0E8E7 | #162A2E |
| `map-road` | Map roads | #FBFDFD | #26393E |
| `map-road-casing` | Road edges | #D5DEDF | #0F1D20 |
| `map-label` | Map labels (area names only) | #425458 | #B9C6C8 |
| `map-label-halo` | Label halo | #E8EEEE | #0F1D20 |

### Print tokens (poster, P18)

The A4 poster is always rendered in the light theme and in greyscale-safe values, whatever the app theme. It uses only three tokens, no brand hue:

| Print role | Token | Value | Use |
|---|---|---|---|
| Paper | `qr` | #FFFFFF | Page and QR field (also the 4-module quiet zone) |
| Ink | `qr-foreground` | #101A1D | All text, QR modules, logo; 7:1 on paper |
| Mid-grey | `input` (light) | light-theme `input` value | Hairlines, the one mid-grey for note text and dividers; never for required text |

Status is conveyed by words, never by colour. Check the poster in a greyscale render before sign-off; the QR must still scan.

## 3.3 Contrast

Floors: 4.5:1 text, 3:1 UI and graphics. Targets: 7:1 for body text and primary actions (sunlight). Every pair below is verified by the build.

| Pair (foreground on surface) | Light | Dark | Min |
|---|---|---|---|
| `foreground` on `background` | 15.1:1 | 15.7:1 | 7:1 |
| `foreground` on `card` | 17.3:1 | 14.2:1 | 7:1 |
| `card-foreground` on `card` | 17.3:1 | 14.2:1 | 7:1 |
| `popover-foreground` on `popover` | 17.3:1 | 12.1:1 | 7:1 |
| `muted-foreground` on `background` | 6.8:1 | 10.5:1 | 4.5:1 |
| `muted-foreground` on `card` | 7.8:1 | 9.5:1 | 4.5:1 |
| `muted-foreground` on `muted` | 5.8:1 | 8.1:1 | 4.5:1 |
| `primary-foreground` on `primary` | 7.8:1 | 8.0:1 | 7:1 |
| `secondary-foreground` on `secondary` | 10.8:1 | 10.8:1 | 7:1 |
| `accent-foreground` on `accent` | 10.8:1 | 13.1:1 | 7:1 |
| `destructive-foreground` on `destructive` | 8.2:1 | 8.7:1 | 7:1 |
| `destructive` on `card` | 8.8:1 | 8.0:1 | 4.5:1 |
| `destructive` on `background` | 7.7:1 | 8.8:1 | 4.5:1 |
| `destructive` on `popover` | 8.8:1 | 6.8:1 | 4.5:1 |
| `destructive` on `muted` (error icon in a note) | 6.6:1 | 6.8:1 | 3:1 |
| `input` on `background` | 3.5:1 | 4.4:1 | 3:1 |
| `input` on `card` | 4.1:1 | 4.0:1 | 3:1 |
| `ring` on `background` | 5.5:1 | 8.9:1 | 3:1 |
| `ring` on `card` | 6.4:1 | 8.1:1 | 3:1 |
| `status-lost-foreground` on `status-lost` | 4.8:1 | 6.1:1 | 4.5:1 |
| `status-lost-subtle-foreground` on `status-lost-subtle` | 8.4:1 | 11.3:1 | 7:1 |
| `status-lost` on `card` | 5.2:1 | 5.7:1 | 3:1 |
| `status-found-foreground` on `status-found` | 7.5:1 | 5.9:1 | 4.5:1 |
| `status-found-subtle-foreground` on `status-found-subtle` | 8.7:1 | 11.3:1 | 7:1 |
| `status-found` on `card` | 8.0:1 | 5.7:1 | 3:1 |
| `status-sighted-foreground` on `status-sighted` | 6.8:1 | 7.7:1 | 4.5:1 |
| `status-sighted-subtle-foreground` on `status-sighted-subtle` | 9.8:1 | 11.8:1 | 7:1 |
| `status-sighted` on `card` | 7.5:1 | 7.3:1 | 3:1 |
| `status-reunited-foreground` on `status-reunited` | 9.6:1 | 9.6:1 | 7:1 |
| `status-reunited-subtle-foreground` on `status-reunited-subtle` | 7.4:1 | 10.5:1 | 7:1 |
| `premium-foreground` on `premium` | 9.5:1 | 7.2:1 | 4.5:1 |
| `premium-subtle-foreground` on `premium-subtle` | 10.4:1 | 12.7:1 | 7:1 |
| `verified-foreground` on `verified` | 7.8:1 | 8.0:1 | 4.5:1 |
| `verified-subtle-foreground` on `verified-subtle` | 10.8:1 | 10.8:1 | 7:1 |
| `warning-foreground` on `warning` | 9.6:1 | 9.6:1 | 7:1 |
| `warning-subtle-foreground` on `warning-subtle` | 7.4:1 | 10.5:1 | 7:1 |
| `provider-foreground` on `provider` | 16.5:1 | 14.5:1 | 7:1 |
| `provider-border` on `background` | 3.9:1 | 5.8:1 | 3:1 |
| `provider-border` on `card` | 4.4:1 | 5.3:1 | 3:1 |
| `sidebar-foreground` on `sidebar` | 12.1:1 | 16.3:1 | 7:1 |
| `sidebar-primary-foreground` on `sidebar-primary` | about 11:1 | about 15:1 | 7:1 (value set by the build) |
| `sidebar-accent-foreground` on `sidebar-accent` | 10.0:1 | 13.1:1 | 7:1 |
| `marker-lost` on `map-land` | 4.5:1 | 5.9:1 | 3:1 |
| `marker-found` on `map-land` | 7.0:1 | 5.9:1 | 3:1 |
| `marker-sighted` on `map-land` | 6.5:1 | 7.5:1 | 3:1 |
| `marker-reunited` on `map-land` | 3.1:1 | 9.4:1 | 3:1 |
| `marker-me` on `map-land` | 4.5:1 | 7.5:1 | 3:1 |
| `marker-cluster` on `map-land` | 13.1:1 | 14.7:1 | 3:1 |
| `marker-cluster-foreground` on `marker-cluster` | 14.1:1 | 15.1:1 | 7:1 |
| `map-label` on `map-land` | 6.8:1 | 9.8:1 | 4.5:1 |
| `chart-1` on `card` | 6.4:1 | 8.1:1 | 3:1 |
| `chart-2` on `card` | 3.5:1 | 9.1:1 | 3:1 |
| `chart-3` on `card` | 3.8:1 | 5.7:1 | 3:1 |
| `chart-4` on `card` | 4.1:1 | 5.7:1 | 3:1 |
| `chart-5` on `card` | 6.0:1 | 6.6:1 | 3:1 |
| `primary` on `background` | 7.3:1 | 8.9:1 | 7:1 |
| `primary` on `card` | 8.4:1 | 8.1:1 | 7:1 |
| `status-lost-subtle-foreground` on `card` | 10.3:1 | 13.3:1 | 7:1 |
| `status-lost-subtle-foreground` on `background` | 8.9:1 | 14.6:1 | 7:1 |
| `status-found-subtle-foreground` on `card` | 10.5:1 | 13.6:1 | 7:1 |
| `status-found-subtle-foreground` on `background` | 9.1:1 | 15.0:1 | 7:1 |
| `status-sighted-subtle-foreground` on `card` | 12.0:1 | 13.3:1 | 7:1 |
| `status-sighted-subtle-foreground` on `background` | 10.5:1 | 14.6:1 | 7:1 |
| `status-reunited-subtle-foreground` on `card` | 8.4:1 | 14.4:1 | 7:1 |
| `status-reunited-subtle-foreground` on `background` | 7.3:1 | 15.8:1 | 4.5:1 |
| `muted-foreground` on `accent` | 6.4:1 | 8.1:1 | 4.5:1 |
| `secondary-foreground` on `card` | 13.1:1 | 13.5:1 | 7:1 |
| `foreground` on `muted` | 12.9:1 | 12.1:1 | 7:1 |

Notes: `input` is a 3:1 line, never a faint border. Status words use the `-subtle-foreground` token on card or background (7:1 or better). Text on `status-reunited` (sun yellow) is always `mist.950`, never white.

## 3.4 Colour rules

- **One accent.** Teal (`primary`) is for the main action, the active nav item, text links and small icons. It is not used for large areas.
- **Sun yellow** (`sun`) lives in the logo dot, the reunited status, the reward icon and illustration. Never a button or a banner.
- **Status colours** appear as the word colour, as marker rings and in the one tonal pill. They are never full-width bars or card fills.
- **Colour is never the only cue.** Status = icon + word + colour. Charts use direct labels.
- **Surfaces separate by tone:** `background` (canvas) and `card` (raised) are about 1.15:1 apart on purpose, with no border between them.
- **Dark mode** keeps teal recognisable (`lagoon.300` as primary) and uses `night` surfaces. Do not invert photos.

# 4. Typography

| Role | Family | Why |
|---|---|---|
| Display and headings | **Bricolage Grotesque** (500 to 800) | Warm, slightly characterful grotesque with a human hand. |
| Text and UI | **Atkinson Hyperlegible Next** (400 to 700) | Drawn by the Braille Institute for low vision: distinct letterforms and a slashed zero, so chip numbers are unambiguous. Suits glare and stress. |

Both are Google Fonts with Latin Extended, so **Č, Š, Ž** (and Đ, Ć) render natively (verified in `directions/A.html`). Set `lang="sl"` on pages and `lang="sl-SI"` in React Native text where supported.

**Loading.** Web: `next/font/google` with `subsets: ['latin', 'latin-ext']`, `display: swap`, variable fonts. Mobile: `expo-font` with `@expo-google-fonts/bricolage-grotesque` (600 SemiBold, 700 Bold) and `@expo-google-fonts/atkinson-hyperlegible-next` (400 Regular, 600 SemiBold, 700 Bold). React Native cannot use variable font axes, so use these static weights only. Static instances use the default optical size, so if mobile headings look loose, tighten tracking by 0.01em. Verify the package names at scaffold time.

React Native family names to register: `BricolageGrotesque_600SemiBold`, `BricolageGrotesque_700Bold`, `AtkinsonHyperlegibleNext_400Regular`, `AtkinsonHyperlegibleNext_600SemiBold`, `AtkinsonHyperlegibleNext_700Bold`. Map them as `font-display` (600/700) and `font-sans` (400/600/700) in the Tailwind preset. `font-sans-bold` is Atkinson Hyperlegible Next 700 (`AtkinsonHyperlegibleNext_700Bold`), generated from the `label-strong` role; on mobile use it for labels that need extra weight, since React Native cannot apply `font-bold` to a static family.

## Scale (px, size/line-height)

Mobile first. Desktop applies from `lg` (1024 px).

| Role | Family, weight | Mobile | Desktop | Tracking | Use |
|---|---|---|---|---|---|
| display | Display 700 | 36/42 | 60/64 | -0.025em | Hero headline only |
| h1 | Display 700 | 30/36 (flow screens 34/40) | 48/52 (pet name 64; **admin console 30/36 at all widths**) | -0.02em | One per view |
| h2 | Display 700 | 24/30 | 30/36 (**admin console 24/30 at all widths**) | -0.015em | Section heading, sheet title |
| h3 / row title | Display 600 | 20/28 | 24/32 | -0.01em | Row and tile titles |
| title | Display 600 | 18/28 | 20/28 | -0.005em | Dialog title |
| body-lg | Text 400 | 18/28 (flow answer 22/32) | 20/32 | 0 | Lead text, the answer in a flow |
| body | Text 400 | 16/24 | 16/24 | 0 | Default text, never smaller |
| label | Text 700 | 16/24 | 16/24 | 0 | Buttons, field labels (15/20) |
| meta | Text 400/600 | 14/20 | 14/20 | 0 | Time, distance, help text, status word (700) |
| nav | Text 700 | 13/16 | 13/16 | 0 | Bottom navigation labels only |

Rules

- Body 16 px minimum. Meta 14 px minimum. Only bottom-nav labels go down to 13 px.
- Line length at most 65 characters (`max-w-[58ch]` to `62ch`).
- Use `tabular-nums` for distances, times, counts and chip numbers. Chip numbers are grouped `705 1234 5678 9012`.
- Headings use `text-wrap: balance` on web. No all-caps, no italics for emphasis, no underline except links.
- Slovenian runs about 15 to 20 % longer than English: no fixed-width buttons, let labels grow, test at 200 % text size.
- Status labels agree with the noun "žival": "Izgubljena", "Najdena", "Opažena", "Spet doma". Copy is gender-neutral (nouns and imperatives). Final strings come from the content slices.

# 5. Spacing, layout and sizing

4 px base unit. Steps: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96.

| Context | Value |
|---|---|
| Side gutter | 20 px mobile, 48 px web |
| Gap between rows in a list | 20 px, no dividers |
| Gap inside a component | 8 to 16 px |
| Gap between groups in a view | 32 to 40 px |
| Gap between page sections | 48 px mobile, 96 px web |
| Card padding | 20 to 24 px |
| Content width | text 640 px, content 1120 px, container 1280 px |

Touch targets: 44 px minimum (WCAG 2.2 asks for 24), 48 px for form controls, 56 px for the main action. Hit area can exceed the visible size (a 24 px checkbox sits in a 44 px target).

Grid: mobile 4 columns, 20 px gutters. Web 12 columns, 32 px gap, max 1120 px content.

# 6. Shape, surface and elevation

Base `--radius: 1rem`. Utilities: `sm = r-4`, `md = r-2`, `lg = r`, `xl = r+4`, `2xl = r+8`, `full`.

| Component | Radius |
|---|---|
| Buttons, pills, toggles, chips | full |
| Cards, large photos, dialogs | 24 px (`2xl`) |
| List-row photos, rows, choice rows, notes | 20 px (`xl`) |
| Bottom sheet (top corners) | 28 px |
| Hero and gallery photos | 32 to 36 px |
| Field | none (line style) |

**Flat by default.** Cards have no border and no shadow. Elevation only where something floats:

| Token | Where | Light value |
|---|---|---|
| `shadow-sm` | unused | none |
| `shadow-md` | controls floating over a map (the area pill) | `0 2px 10px rgb(16 38 43 / 0.08)` |
| `shadow-lg` | bottom sheets and other surfaces that rise from the bottom edge (casts upward) | `0 -10px 40px -12px rgb(16 38 43 / 0.16)` |
| `shadow-pop` | popovers, menus, dropdowns, toasts and dialogs that open below or away from a trigger (casts downward) | `0 8px 24px -6px rgb(16 38 43 / 0.18)` |

React Native: use the `elevation.reactNative` values in tokens.json (`md`: elevation 2, `lg`: elevation 8, `pop`: elevation 6) and apply only to the same elements. Dark mode uses black shadows at higher opacity.

**Borders.** Not used on cards, rows or buttons. `border` is a rare hairline for tables or dividers inside dense shelter-portal screens. Fields use a 2 px `input` underline.

**Focus ring.** `ring` colour, 3 px, 2 px offset, on every focusable element (`outline: 3px solid hsl(var(--ring)); outline-offset: 2px`). Never removed.

# 7. Motion

| Token | Value |
|---|---|
| duration instant / fast / base / slow | 80 / 150 / 220 / 360 ms |
| easing standard | `cubic-bezier(0.2, 0, 0, 1)` |
| easing enter | `cubic-bezier(0.16, 1, 0.3, 1)` |
| easing exit | `cubic-bezier(0.4, 0, 1, 1)` |

Motion has a reason: feedback (press scale 0.98), state change (sheet snap, switch, step progress), orientation (map to detail). Animate only `transform` and `opacity`. Honour `prefers-reduced-motion` and the OS "reduce motion" setting: replace movement with an 80 ms cross-fade, stop the skeleton shimmer, drop the press scale, no autoplay loops. A loading spinner is essential feedback, so it keeps turning, slowed to 2.4 s per turn. Scroll-reveal is not used in the product UI.

# 8. Iconography

**Phosphor Icons.** Web `@phosphor-icons/react`, mobile `phosphor-react-native`. Weights: **regular** for inactive navigation, **bold** for controls and actions, **fill** for status icons and the active nav item. Sizes 16 (inline status), 20 (button), 24 (nav, icon button), 32 (feature). Icons inherit text colour. Icon-only buttons need an accessible name.

| Meaning | Icon |
|---|---|
| Lost | `megaphone` (fill) |
| Found | `hand-heart` (fill) |
| Sighted | `eye` (fill) |
| Reunited | `heart` (fill) |
| AI suggestion | `sparkle` (fill) |
| Private, safe | `shield-check`, `lock-simple` |
| Reward | `gift` |
| Area | `map-pin-area` |
| Map | `map-trifold` |
| Alerts | `bell` |
| Profile | `user-circle` |
| Report (action) | `plus` |
| Share | `share-network` |
| Chat | `chat-circle` |
| Filters | `sliders-horizontal` |

# 9. Imagery

**Photography.** Real pets, owner snapshots: natural light, eye level, the animal fills the frame, face readable. Crops: 1:1 for rows and markers, 4:3 for tiles and detail, 4:5 or 1:1 for hero. Photos sit in rounded frames (radii above) with **no text, pill, bar or badge on top of them**. Alt text: species, colour and one distinguishing mark ("Rjav in bel pes z rdečo ovratnico"). Show 3 to 5 photos per pet when available.

**Image generation (image tasks).** Allowed for illustration, marketing and empty states, never as a stand-in for a real report. Brief format: purpose, size, style, content, avoid, file name (`assets/<name>.png`).

- Style: flat geometric illustration, two or three brand colours (`lagoon`, `sun`, a mist tint), soft hills, a sun circle, a dotted trail. No outlines, no gradients, no characters with faces.
- Photo-like images: documentary, soft daylight, shallow depth, warm neutral tones, ordinary Slovenian settings (suburban street, park, riverside), unposed.
- Avoid: text in the image, cartoon or cute filters, sad-pet clichés, stock-model people, neon, purple, heavy grain.
- Sizes: hero 1600x1200, card and row 800x800, detail 1200x900, OG image 1200x630, empty-state spot 640x420.

**Map.** OpenFreeMap tiles through MapLibre, restyled with the `map-*` tokens, calm style: land, water, parks and main roads only. Hidden: buildings, rail, paths, minor streets (shown on detail maps), street names, city labels. Kept: area names (suburbs). Layer mapping (OpenFreeMap "positron" ids): `background` and `landuse_residential` to `map-land`; `park` and `landcover_wood` to `map-park`; `water` and `waterway` to `map-water`; `highway_minor`, `highway_major_inner`, `highway_motorway_inner` to `map-road`; `*_casing` to `map-road-casing` at 60 % opacity; symbol layers use `map-label` with `map-label-halo`. Reference implementation: `paintMap()` in `docs/design/directions/directions.js`.

**Markers (calm map).**

| Marker | Look | Use |
|---|---|---|
| Avatar | 44 px pet photo, 3 px ring in `marker-found` or `marker-sighted`, plus a 3 px `marker-ring` halo | Found and sighted reports |
| Lost avatar | Avatar with `marker-lost` ring on a 96 to 104 px translucent `marker-area` disc | Lost reports (fuzzed area, never an exact pin) |
| Cluster | 40 px disc `marker-cluster` with the count | Several reports close together |
| Sighting dot | 14 px `marker-sighted` dot | Detail-page map only |
| You | 18 px `marker-me` dot with a 3 px `marker-ring` halo | Only after location permission, on the main map and the location picker. Never on a detail map: it would read as a sighting dot (both are blue dots) |
| Area disc (to scale) | Translucent disc in the report's status hue at `--marker-area-alpha` (0.16 light, 0.20 dark): lost `marker-area`, found `marker-found`, sighted `marker-sighted`; the user's own alert or home area `primary`. No edge, except a 2 px edge in the same hue while editing in the picker (lost: `marker-lost`). Always with the area name and radius as text | Detail maps and the fuzzed-area component (P5). The main map draws discs for lost reports only |
| Pin | 48 px `primary` head with a tail and a 3 px `marker-ring` halo; `paw-print` icon (reports), `house` (alert and home area) or `buildings` (shelter); the tail tip is the point | The picker centre (P5), the owner's own exact pin with "Vidno samo vam" (P5, P9), a shelter address (P3 T6). Never for someone else's report |

# 10. Components

Web = shadcn/ui, mobile = React Native Reusables (NativeWind). Same names, same variants, same states. Customise every component to these specs; none ships in its default state.

## 10.1 State recipe (all interactive components)

| State | Rule |
|---|---|
| Default | Token fill and text as specified. |
| Hover (web) | Filled buttons: mix 14 % of `foreground` into the fill. Ghost, text and icon buttons and menu rows: fill `foreground` at 10 % over the surface (the `accent` token is too close to `background` to show). Pointer cursor. |
| Pressed | Hover colour plus `scale(0.98)` for 80 ms. Light haptic on the primary action on mobile. |
| Focus-visible | 3 px `ring`, 2 px offset. Fill unchanged. |
| Disabled | `muted` fill, `muted-foreground` text, no opacity trick. Say why in help text. Still 4.5:1. |
| Loading | Keep the label, put a spinner before it, `aria-busy`, ignore presses, no layout shift. |
| Error (fields) | Underline `destructive`, message below with an icon, linked by `aria-describedby`. |
| Selected | `primary` fill with `primary-foreground`, plus a shape cue: a check icon (choice row, pill, checkbox, listbox option), a dot (radio), the thumb position (switch) or the raised segment (segmented control). Never colour alone. |

## 10.2 Button

| | |
|---|---|
| Variants | `default` (primary, teal), `secondary` (tonal), `ghost` (text with hover tone), `text` (teal text, for the quiet second action), `destructive`, `provider` (Google and Apple sign-in only). The shadcn `outline` variant is not used; map it to `secondary`. |
| Provider | `provider` fill, `provider-foreground` label, 1 px inside `provider-border` stroke, the same on every surface (page, sheet, dialog). The one bordered button, because Google and Apple only allow white or black fields (plus Google's grey stroke) behind their marks; never `secondary`, never a surface token. Size `md` (48), full pill, full width, the two stacked with 12 px between, equal size, Google first. Official glyphs only (Google "G" in full colour in both modes, Apple logo in `provider-foreground`), 20 px, gap 8. Labels "Nadaljuj z Googlom" and "Nadaljuj z Applom" (content slice). States as 10.1: hover mixes 14 % `provider-foreground` into the fill; focus ring; loading puts the spinner in the glyph's place; they stay enabled when e-mail sign-in is rate limited. The official SDK buttons (Google Identity Services, Sign in with Apple JS, `expo-apple-authentication`) are fine if they match this look; brand rules on font, padding and glyph size are checked against the brands' current pages at build time. |
| Sizes | `sm` 44, `md` 48, `lg` 56 px high. Padding x 18 / 24 / 32. Icon button 44x44 with a 24 px icon. |
| Type | 16 (17 on lg) bold, label never wraps. Icon 20 px before the label, gap 8. |
| Shape | Full pill, no border, no shadow. Labels never truncate: at large OS text sizes they wrap to a second line and the button grows in height (min-height stays 44/48/56). |
| Rule | One `default` button per view. On mobile the primary is `lg` and full width, with the `text` button under it. In a delete dialog the `destructive` button takes the primary's place, so it meets the same 7:1. |

## 10.3 Fields

| | |
|---|---|
| Anatomy | Label above (15/20 bold), line input, help text below (14/20 muted), error below with icon. |
| Input | Transparent background, 2 px `input` underline, 56 px high (64 for single-question screens), 18 px text, optional leading icon. Hover: `foreground` underline. Focus: `ring` underline plus 2 px extra. Error: `destructive` underline. Disabled: **dashed** `input` underline, label and text `muted-foreground`, reason in the help text (the dash keeps it from being colour only). |
| Textarea | Same line style and states, min 96 px. |
| Select | Line style with a caret (`caret-down`, `caret-up` when open). On web it opens a listbox popover (radius 20, 8 px padding, 48 px options, hover `foreground` at 10 %, selected option bold with a check on the right). On mobile it opens a bottom sheet of choice rows. |
| Search | Input with a leading `magnifying-glass` and, once filled, a 44 px clear icon button at the end ("Počisti iskanje"). While results load, a spinner takes the clear button's place and a polite live region says so. |
| Switch | 56x32, track `input` (off) or `primary` (on), thumb `card`. The whole row (label and switch) is the target. Disabled: `muted` track with a 2 px `input` inset line (the muted track alone vanishes on `popover` in dark), `muted-foreground` thumb that keeps its position; pair it with a text reason such as a lock icon and "Vedno vklopljeno". |
| Checkbox, radio | 24 px visual in a 44 px hit area (the whole label). Unchecked: 2 px `input` line, no fill; hover turns the line `foreground`. Checked: `primary` fill; the checkbox (radius 6) shows a 16 px bold check, the radio (round) a 10 px `primary-foreground` **dot**, not a check. Disabled: `muted` fill, `muted-foreground` mark, reason in help text. Prefer choice rows for 2 to 4 options; radios are for longer lists. |
| Placeholder | `muted-foreground`, example format only, never a label. |

## 10.4 Choices

| Component | Spec |
|---|---|
| Choice row | Full width, 64 px minimum, `card` surface on `background`, radius 20, 20 px side padding, icon 24 left, title 17 bold, optional description 14 muted. Selected: `primary` fill, `primary-foreground`, check on the right. Hover: `foreground` at 10 % over the row. Pressed: `accent` fill and `scale(0.98)`. Disabled: `muted` fill, `muted-foreground` text and icon. On a `card` sheet the rows use `background` instead of `card`. Group has `role="radiogroup"`. Used for species, situation, the "Prijavi" menu (there as menu items with a caret on the right instead of a check). |
| Pill (toggle) | 44 px, `secondary` fill; selected `primary`. For filters in the filter sheet (status, species). **Suggested** state (a pre-highlighted amount, e.g. P15): 2 px `primary` inset line, no fill change, no check; it is not selected (no `aria-checked`) and carries a screen-reader "suggested" text. Choosing it gives the normal selected state. |
| Segmented control | Track `muted`, selected segment `card`, labels 15 bold (unselected `muted-foreground`). Hover on an unselected segment: `foreground` at 10 % and `foreground` text. Disabled: all labels `muted-foreground`, the selected segment loses its fill and keeps a 2 px `input` inset line. Only for switching between 2 or 3 views of the same content, never for primary navigation. |

## 10.5 Status

| Component | Spec |
|---|---|
| Status word | Fill icon 16 + word 14 bold, colour `status-*-subtle-foreground`. The default way to show status in rows, tiles, timelines. |
| Tonal pill | Height 30, 14 bold, `status-*-subtle` fill. Used once on a detail page for the main status, and for the `premium` and `verified` marks. |
| Solid | `status-*` solid only as marker rings and chart fills. |

## 10.6 Row, tile, card

| Component | Spec |
|---|---|
| Pet row (mobile list) | Photo 64x64 radius 20, gap 16, title (h3, 20/24), meta line (status word + time, 14), distance right (14 muted). No dividers, no border, no per-row card, 20 px between rows. Pressed: `accent` background. Skeleton: same shape. |
| Pet tile (web) | Photo 4:3 radius 24, title (h3) 16 px under it, meta line (status word + "time, distance"). No container. Hover: the title underlines (2 px, offset 4); nothing changes on the photo. Pressed: `scale(0.98)`. Focus: the 3 px `ring` wraps photo and text with a **6 px offset**, so it clears the photo's corners. Skeleton: same shape. |
| Card | `card` surface, radius 24, padding 24, no border, no shadow. Never nested in another card. Used for dialogs, forms and grouped content on web. |
| Note | `muted` surface, radius 20, icon 22 + text 15/22. One per view at most (for example the scam warning), except the flag-gated legal note slot (P3 T5, T6), which sits in its own region and may share a view with one other note (unconfirmed, error or stale). |
| Empty state | Spot illustration (flat geometry), h3, one sentence, one `secondary` button. |

## 10.7 Navigation and layout shells

| Component | Spec |
|---|---|
| Bottom navigation | 88 px (including 20 px safe area), `card` surface, no top border, at most 4 items: **Zemljevid, Sporočila (inbox: conversations and notifications), Prijavi (action), Profil**. Icon 26 + label 13 bold. Active = `primary` colour and fill icon. Prijavi is a 48 px `primary` circle with `plus`. No count badges (counts live inside the inbox). All four labels sit on one baseline, so the 48 px Prijavi circle rises above the row (about 10 px). Nav label text scaling is capped at 1.3x (`maxFontSizeMultiplier`); the bar grows in height rather than clipping. |
| Floating area control | `card` pill, 48 high, `shadow-md`: map-pin, "Ljubljana, 10 km", and a 32 px `secondary` circle with the filters icon. It is the only control on the map; it opens the filter sheet (status pills, species, radius). No locate button. |
| Bottom sheet | `card`, top radius 28, grabber 40x5, `shadow-lg`, 20 px side padding. Snap points: peek about 40 % of the screen, full 92 %. Scrim behind modals. |
| Flow top bar | 56 px: back (icon button), **one bar per step** (the count comes from the flow's page slice, for example 7 for the lost flow; 4 px high, gap 6, equal widths, `primary` for done steps and the current one, `muted` for the rest), close. No title. The bars are one `role="progressbar"` with `aria-valuenow` and `aria-valuemax` and the name "Korak {current} od {total}" from the content slice. Flows keep to 8 steps or fewer so the bars stay readable at 320 px. |
| Web header | 88 px, no border, on `background`. Logo left, at most 4 text links (16 semibold; the current page is `foreground` **and underlined**, others `muted-foreground`, so it is not colour only), right: language switch, ghost "Vpis" (EN "Sign in") and a `sm` "Prijavi": `primary` by default, `secondary` on pages whose content has its own primary action (P3 home hero, P3 T5 and T6 where the primary is "Pokliči", P9 detail, P22 form); in every T5/T6 state it stays `secondary`, even when the page shows no primary, so a view never shows two primaries. Same place, label and menu either way. Signed in: the fourth link is the short label "Moje živali" (EN "My pets"; reports are inside), inbox icon button and avatar menu. The header must fit without overflow from 1024 px; if it does not, the language switch moves into the account menu below `xl`. |
| Web footer | Content variant: logo with tagline, wrapped rows of the 13 links (How it works, Safety tips, FAQ, For shelters, Shelters (the public directory), Partners, About, Privacy, Cookies, Cookie settings, Terms, Imprint, Accessibility), language, copyright line; no panel. **Flow variant: minimal** single quiet row (Privacy, Terms, Cookie settings, Accessibility), no logo block, no copyright. |

## 10.8 Flow screen ("one question per screen")

Top bar, then (optional) a photo, an h1 question (34/40), the answer or control (answer text 22/32, or a field, or choice rows), an optional quiet note (14, `muted-foreground`, icon), and at the bottom a `lg` primary button with a `text` button under it. 20 px side padding, 44 px bottom padding. The AI suggestion is a plain sentence with a small sparkle note ("Predlog iz fotografije. Umetna inteligenca se lahko moti."), never a boxed panel. The found-report flow is photo, "Je to pravilno?", location, "Žival imam pri sebi?", send, with the phone number reassurance on the last step.

## 10.9 Other components

| Component | Spec |
|---|---|
| Toast | `popover` surface, radius 20, `shadow-pop` (one shadow only; do not stack shadows), 15/22, status icon, 5 s, dismissible, announced politely. |
| Dialog | `popover`, radius 24, `scrim`, max 440 px wide, padding 28/24/20, title in the `title` role (18/28, 20/28 on web), text, buttons stacked full width (main action then `text`). Focus trapped, Escape closes. With a `destructive` main action (alert dialog), focus starts on the `text` cancel button. **Content dialog** (a flow step on web, for example the location picker): up to 600 px wide, padding 28, the step question as the title in the h2 role (30/36 on web), a close icon button top right, the same single primary. |
| Accordion row (FAQ) | `card` surface, radius 20, 24 px padding (20 on mobile). The question is in the `title` role inside an `h3 > button` with `aria-expanded` and `aria-controls`; plus/minus icon 24 in `primary` on the right. Hover: `foreground` at 10 % overlay. The answer sits below in body 16/24. No border. |
| On this page (list) | A `nav` with a label. 240 px sticky column from `lg`; rows 44 px, 15/20 semibold `muted-foreground`. Current row: `foreground` weight 700 plus a 3 px `primary` inset bar on the left (a shape cue, not colour only). Hover: `foreground` at 10 %. Below `lg` it is one collapsed disclosure row above the body, in the accordion row style. |
| Timeline (sightings) | Plain list: status word with date and time, then the sentence (16/24), 28 px between items. No cards, no line. |
| Gallery | Main photo radius 32, thumbs 88x72 radius 16, inactive thumbs at 55 % opacity. |
| Share | One ghost button "Deli ali natisni plakat" that opens a menu (Facebook, WhatsApp, copy link, poster with QR code). |
| Menu (popover) | `popover`, radius 20, 8 px padding, `shadow-pop`, rows 48 px (icon 20, 16 semibold), hover `foreground` at 10 %. |
| Avatar | 32, 48, 72 px round. Photo, or initials (bold, `secondary` fill, `secondary-foreground`) when there is none; the initials avatar has an accessible name. |
| Skeleton | `muted` with an `accent` shimmer, static under reduced motion. Same shape as the final element. One polite "Nalaganje …" per region, not per skeleton. |
| Inline error (region) | In place of the region that failed: a `note` with a fill `warning-circle` in `destructive`, one sentence in `foreground`, and a `text` button "Poskusi znova" under it (spinner while retrying). Field errors follow 10.3 instead. |
| Progress | The step bars above, or a 4 px `primary` bar on `muted` for uploads, with the label and percentage above it. Done: full bar plus a check-circle and a sentence. Failed: the bar turns `destructive`, an error line with icon and a `text` retry button follow. Never colour alone. |
| Premium and verified marks | Tonal pill with fill icon, for example "Povečan doseg" (`premium`) and "Preverjeno zavetišče" (`verified`). Boost buttons are normal secondary buttons. |
| Chart (shelter portal) | `chart-1` to `chart-5`, direct labels, no legend boxes, grid lines `border`. |
| Sidebar (shelter portal, admin) | shadcn sidebar with the `sidebar-*` tokens: dark teal. 280 px, 72 px collapsed to icons, sheet below `lg`. Items 44 px, radius 12, icon 20, label 16 semibold. Hover `sidebar-accent`; active item `sidebar-primary` fill (light mist, never sun yellow) with `sidebar-primary-foreground`, bold label, fill icon and `aria-current="page"`; focus 3 px `sidebar-ring`, 2 px offset. |
| Dense table (admin) | `card` surface, radius 24, padding 4/16/8. Sticky header 52 px (14 bold, `muted-foreground`; sorted column `foreground` with an arrow icon and `aria-sort`), rows 56 px, text 15/22, 1 px `border` hairlines between rows (allowed here only). Row hover `accent` at 60 %, selected row `accent`; the row title is a 44 px link that underlines on row hover. Checkbox column 44 px, action column 52 px. Selecting rows shows a bulk bar (60 px, count, actions; delete is a ghost action in `destructive`). Below `lg` rows stack: title and status first, then meta; checkbox and menu stay 44 px. States: skeleton rows, empty result, inline error (10.9). |
| Drawer (right sheet, admin) | 480 px wide, full height under the top bar, `card`, leading corners 24, `shadow-pop`, scrim, modal with focus trapped, Escape closes, focus returns to the row. Head: title in the 20/28 dialog-title role and a 44 px close button (24/16/8/24 padding); body 24 px side padding, 32 px between groups; sticky footer with the one primary then a `text` cancel. Below 640 px it is full width. |
| Tooltip (collapsed sidebar and icon buttons) | `popover`, radius 8, 8/12 padding, 14/20 semibold, `shadow-pop`, 12 px from the target, shows on hover and keyboard focus, hides on Escape, never holds interactive content. The name is also the control's accessible name. |
| Checkbox, mixed (indeterminate) | Same 24 px box and 44 px hit as 10.3, `primary` fill with a 16 px bold minus icon instead of the check; `aria-checked="mixed"`. Used on the header checkbox when some rows are selected; pressing selects all, pressing again clears. |

## 10.10 shadcn and React Native Reusables mapping

| Need | Web (shadcn/ui) | Mobile (React Native Reusables) | Customisation |
|---|---|---|---|
| Button | `button` | `Button`, `Text` | Variants and sizes above; remove `outline`. |
| Field | `input`, `label`, `textarea`, `select` | `Input`, `Label` | Line style (underline), no box. |
| Choices | `radio-group`, `toggle-group` | `RadioGroup`, custom `ChoiceRow` | Choice row and pill styles. |
| Switch, checkbox | `switch`, `checkbox` | `Switch`, `Checkbox` | 44 px hit area. |
| Segmented | `tabs` | `Tabs` | Pill track. |
| Badge | `badge` | `Badge` | Tonal pill only; add `StatusLabel` (icon + word) as a custom component. |
| Card | `card` | `Card` | Flat: no border, no shadow, radius 24. |
| Sheet and dialog | `sheet`, `dialog`, `alert-dialog` | `Dialog`, `AlertDialog`; bottom sheet via `@gorhom/bottom-sheet` | Radii and `scrim`. |
| Toast | `sonner` | `sonner-native` or RNR toast | Popover surface. |
| Menu | `dropdown-menu`, `popover` | `DropdownMenu`, `Popover` | Popover surface, radius 20. |
| Skeleton, avatar, progress | `skeleton`, `avatar`, `progress` | same names | As above. |
| Sidebar | `sidebar` | not needed | Shelter portal and admin only. |

# 11. Breakpoints and responsive behaviour

Mobile first. Tailwind defaults.

| Name | From | Layout |
|---|---|---|
| base (mobile) | 0 | Single column, 20 px gutters, bottom navigation, sheets, one flow question per screen. Reference width 390 px; test 320 px. |
| `sm` | 640 | Single column, larger photos, buttons stay full width in flows. |
| `md` | 768 | Tablet: two-column pet tiles, flows centred at 560 px, bottom navigation becomes a top bar. |
| `lg` | 1024 | Web layout: header with links, two-column detail (photo 7 / info 5), three-column tile grids. |
| `xl` | 1280 | Container 1280, content 1120. |
| `2xl` | 1536 | Same container, more outer space. |

Web pages reflow without horizontal scroll down to 320 px and at 400 % zoom. On mobile web the primary action sits in the page flow, not floating. Native apps respect safe areas and OS text scaling up to 200 % (`allowFontScaling`, `maxFontSizeMultiplier` 2).

# 12. Accessibility rules (component level)

WCAG 2.2 AA throughout.

- Contrast per section 3.3. Focus ring on every focusable element (2.4.7), never hidden by sticky bars (2.4.11).
- Targets 44 px or more; adjacent targets separated (2.5.8).
- Every field has a visible label above it. Errors are text with an icon, tied with `aria-describedby`, announced on submit (3.3.1, 3.3.3). No placeholder-as-label.
- Status is icon plus word plus colour (1.4.1). Map markers have an accessible name and the same reports are available as a list (the sheet). The map is never the only way to reach a report.
- Reduced motion honoured (2.3.3 intent). No content flashes. No autoplay.
- Dark mode and light mode meet the same ratios. Follow the OS setting by default, with a manual override in profile settings.
- Text resizes to 200 % without loss, reflows at 400 %. No text in images.
- Photos have alt text (species, colour, one mark). Decorative images have empty alt.
- Gestures have a button alternative (bottom sheet has a handle button, map has the list).
- Screen reader order matches visual order. Headings are real headings. One `h1` per page.

# 13. Stack mapping for `packages/tokens`

The tech-lead owns the package. This is the intended shape.

**Outputs from `tokens.json`**

1. `tokens.css`: `:root` (light) and `.dark` (dark) with the variables above, as generated here. For Tailwind 4 and shadcn "new-york v4" also emit `@theme inline { --color-primary: hsl(var(--primary)); ... }`.
2. `tailwind-preset`: colours as `hsl(var(--x) / <alpha-value>)`, shadcn pairs nested (`primary.DEFAULT`, `primary.foreground`), app tokens flat (`bg-status-lost-subtle`, `text-status-lost-subtle-foreground`, `bg-marker-area`).
3. `native.ts`: resolved hex per mode, for places NativeWind classes cannot reach (React Navigation theme, status bar, MapLibre style, haptics).
4. `map-style.ts`: a function that applies the `map-*` tokens to the OpenFreeMap positron style (layer table in section 9).

**Tailwind preset sketch**

```js
const c = (n) => `hsl(var(--${n}) / <alpha-value>)`;
module.exports = {
  darkMode: 'class',
  theme: { extend: {
    colors: {
      background: c('background'), foreground: c('foreground'),
      card: { DEFAULT: c('card'), foreground: c('card-foreground') },
      popover: { DEFAULT: c('popover'), foreground: c('popover-foreground') },
      primary: { DEFAULT: c('primary'), foreground: c('primary-foreground') },
      secondary: { DEFAULT: c('secondary'), foreground: c('secondary-foreground') },
      muted: { DEFAULT: c('muted'), foreground: c('muted-foreground') },
      accent: { DEFAULT: c('accent'), foreground: c('accent-foreground') },
      destructive: { DEFAULT: c('destructive'), foreground: c('destructive-foreground') },
      border: c('border'), input: c('input'), ring: c('ring'),
      chart: { 1: c('chart-1'), 2: c('chart-2'), 3: c('chart-3'), 4: c('chart-4'), 5: c('chart-5') },
      // sidebar-*, status-*, premium-*, verified-*, warning-*, marker-*, map-*: generated flat from tokens.json
    },
    borderRadius: { sm: 'calc(var(--radius) - 4px)', md: 'calc(var(--radius) - 2px)', lg: 'var(--radius)', xl: 'calc(var(--radius) + 4px)', '2xl': 'calc(var(--radius) + 8px)' },
    fontFamily: { display: ['var(--font-display)'], sans: ['var(--font-sans)'] },
    minHeight: { touch: '44px', comfort: '48px', primary: '56px' },
  } },
};
```

**NativeWind.** Put the same `:root` and `.dark` blocks in `global.css` (React Native Reusables convention: `.dark:root`), keep `hsl(var(--x) / <alpha-value>)` in `tailwind.config.js`, and set `fontFamily` to the registered static font names. `calc()` radii work in NativeWind 4; if a platform rejects them, fall back to the pre-computed px values (`radius` 16, `xl` 20, `2xl` 24).

**shadcn.** `components.json` with `cssVariables: true`, `baseColor: "neutral"` (all colours are overridden by `tokens.css`). Keep component code in the repo and edit it to the specs in section 10; do not ship default shadcn styling.

**Variant switching.** None. There is one theme (light and dark). Do not add runtime theme variants.

**Do not.** Hardcode hex in components, use `border` on cards, add shadows to cards, add a second accent, show more than 4 bottom-nav items, put pills on photos, or use a different icon set.

# 14. Decisions and open items

- Direction A (Lagoon) chosen by the client on 2026-10-14. Direction B (Ink and Sun) was explored and dropped.
- Name: Najdimo is recommended, not final (Q-001). Domain and trademark check pending.
- Placeholder photography in the mockups is from Unsplash; final images come from image tasks.
- Illustration set (empty states, onboarding) not yet drawn: image tasks to follow in planning.
- Content strings in mockups are samples; the content slices own the final copy (status labels agree with "žival").
- Open for the tech-lead: Atkinson Hyperlegible Next package availability for Expo, and bottom-sheet library choice.

# 15. Mockup conventions (for the ui-designer)

Each page slice in `docs/design/pages/P<n>-<slug>.md` gets one static mockup at `docs/design/mockups/P<n>-<slug>.html`.

- Start from `docs/design/mockups/_template.html`. It loads the tokens (`../tokens.css`), the Tailwind stand-in config (`../directions/tailwind-config.js`), the component classes (`../directions/directions.css`) and the renderer (`../directions/directions.js`) that shows the content in light, dark or side by side. Put one copy of the content in `#src`.
- Use only token classes and the component classes already in `directions.css` (`.btn`, `.iconbtn`, `.pill`, `.choice`, `.seg`, `.switch`, `.check` with `.cbx` and `.rad`, `.input`, `.select`, `.listbox`, `.st`, `.badge`, `.note`, `.card`, `.prow`, `.tile`, `.av`, `.dialog`, `.pop` with `.mi`, `.toast`, `.sheet`, `.bottomnav`, `.steps`, `.progress`, `.nl`, `.phone`, `.browser`, markers). State hooks for static drawings: `.is-hover`, `.is-pressed`, `.is-focus`, `.is-disabled`, `.is-error`. The P23 UI kit gallery (`mockups/P23-ui-kit-gallery.html`) shows every component in every state; copy from it. Add a new class to `directions.css` only when a component in section 10 needs it, and keep it token-driven. Never use hex values.
- Show every state the slice lists, on the platforms it names: mobile in 390 px phone frames, web in a 1200 px browser frame, plus a 768 px frame when the slice asks for tablet behaviour. Label each frame with its state name.
- Map areas use `<div class="map-canvas" data-center="lng,lat" data-zoom="13.5">` (live OpenFreeMap restyled with the `map-*` tokens, calm style).
- Copy: read `docs/content/pages/P<n>-<slug>.md`. If it does not exist yet, use clearly marked sample Slovenian text (gender-neutral, status labels agree with "žival") and say so in the footer note. Never invent legal or pricing claims.
- Images: placeholder pet photos from `docs/design/directions/img/`; generated assets from the image tasks at `assets/<name>.png` (reference as `../../../assets/<name>.png`).
- Accessibility in the mockup: real headings, labels above fields, alt text, 44 px targets, visible focus state shown at least once per page, no colour-only status, no ad slot on routes where the slice forbids it.
- Done when: all states in light and dark render without overflow at 390 and 1200 px, the review checklist in section 1 passes, and the mockup path is the one in the slice.

# 16. Change log

| Version | Date | Change |
|---|---|---|
| 0.3 | 2026-10-14 | P1 review: ghost hover tone, `shadow-pop`, header and footer rules, `accent` role. |
| 0.4 | 2026-10-14 | P2 review: Sporočila tab, bottom-nav baseline and text scaling cap, button label wrap, toast shadow. |
| 0.5 | 2026-10-15 | P23 review (TASK-8.1): `destructive` darkened to crimson.700 light and crimson.300 dark (8.2 and 8.7:1, meets 7:1 as the main action of a delete dialog; tokens 0.3.0, new pairs on background, popover, muted). Flow top bar draws one bar per step. Radio checked = dot. Tile hover, pressed and 6 px focus offset. States written down from the gallery: disabled field (dashed line), select listbox, search field, checkbox and radio anatomy, choice-row hover, pressed and disabled, segmented hover and disabled, switch disabled, dialog title role and alert-dialog focus, menu, avatar initials, inline region error, progress done and failed, reduced-motion spinner. "You" dot never on detail maps. |
| 0.6 | 2026-10-15 | P16 review (TASK-9.1): `provider` button variant and `provider`, `provider-foreground`, `provider-border` tokens (brand-literal white and near-black with a 1 px stroke, same on every surface; tokens 0.4.0). |
| 0.7 | 2026-10-15 | FR-044 shelter directory: footer gains the "Shelters" link (13 links). Screens live in P3 (T5, T6), P19 and the P6 and P7 call rows. |
| 0.8 | 2026-10-15 | P5 review (TASK-15.1): area discs take the status hue (found green, sighted blue, own alert area teal; lost stays `marker-area`), pin marker documented, content dialog (up to 600 px, h2 title) for web flow steps. |
| 0.9 | 2026-10-15 | P9 review (TASK-18.1): header "Prijavi" is `secondary` when the page has its own primary. |
| 0.10 | 2026-10-15 | CH-30, CH-33 (from TASK-3.4, TASK-30.1): `font-sans-bold` (Atkinson 700, `label-strong` role) and `qr` / `qr-foreground` tokens (fixed light field, dark modules, both themes; contrast pair 7:1). Tokens 0.5.0. |
| 0.11 | 2026-10-15 | P19 review (TASK-34.1): `sidebar-primary` and `sidebar-ring` become light mist (sun yellow stays out of the console); admin h1 30/36 and h2 24/30 at all widths; added dense table, drawer, tooltip and mixed checkbox specs. |
| 0.12 | 2026-10-15 | CH-46, CH-59: `suggested` pill state (§10.4); print tokens for the P18 poster documented (`qr`, `qr-foreground`, `input`; no tokens.json change). |
| 0.13 | 2026-10-15 | CH-67, CH-68, CH-72: legal note slot exempt from one note per view; checklist "at most one primary" and header "Prijavi" secondary on P3 T5/T6; Accordion row and On this page list components (§10.9). |
| 0.14 | 2026-10-15 | CH-85, CH-90: drawer stays full width only below 640 px (480 px at 768); chip example fixed to 15 digits. |

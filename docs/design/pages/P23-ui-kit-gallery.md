---
source: 03§P23
page: P23 UI kit gallery (components and states)
stories: TASK-8 (NFR-A11Y)
platforms: web, mobile
mockup: docs/design/mockups/P23-ui-kit-gallery.html
copy: docs/content/pages/P23-ui-kit-gallery.md
---

# P23 UI kit gallery

## Purpose

The visual reference for the UI kit that frontend builds on both platforms (shadcn/ui on web, React Native Reusables on mobile). One page shows every core component in every state, in light and dark, in Slovenian and English text lengths. Front-end implements to match it; the kit's own gallery (TASK-8 AC#2) is checked against it.

## Components and states (from `docs/design/system.md` section 10)

| Group | Components | States to show |
|---|---|---|
| Actions | Button (default, secondary, ghost, text, destructive; sm, md, lg), icon button | default, hover, pressed, focus, disabled, loading |
| Fields | FormField with label, help and error; Input (line), Textarea, Select, search field | default, hover, focus, filled, error, disabled |
| Choices | Choice row, toggle pill, segmented control, Switch, Checkbox, Radio | unselected, selected, focus, disabled |
| Status | StatusLabel (four types), tonal pill (status, premium, verified), solid marker rings | each type in light and dark |
| Surfaces | Card, Note, Row (pet row), Tile (pet tile), Avatar | default, pressed, loading skeleton |
| Overlays | Dialog, bottom Sheet, Popover menu, Toast | open, with long Slovenian text |
| Navigation | Bottom navigation (four items), flow top bar with step bars, web header, tabs | active, focus |
| Feedback | Skeleton, EmptyState, inline error, progress bar | all |
| Map | markers (avatar, lost area, cluster, sighting dot, me) on the calm map | light and dark |

## Layout of the gallery

Sections in the order above on web (1200 px) with each component shown on web styling and, for mobile-specific ones (sheet, bottom navigation, top bar, choice rows), in a 390 px frame. A language control shows SL and EN sample strings to prove no clipping (SL text runs 15 to 20 % longer). A "Reduced motion" sample shows the static fallback.

## Accessibility checks shown

Focus ring on every control, 44 px target outlines on demand, contrast numbers next to the state swatches, no colour-only meaning (status icon and word), text at 200 % in one frame.

## Assets

None.

## Mockup scope (`P23-ui-kit-gallery.html`)

One page with all groups, light, dark and side by side, 390 and 1200 px frames as listed.

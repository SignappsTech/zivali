---
source: 03§P2
page: P2 Mobile shell
stories: TASK-12 (FR-037)
platforms: mobile
mockup: docs/design/mockups/P2-mobile-shell.html
copy: docs/content/pages/P2-mobile-shell.md
---

# P2 Mobile shell

## Purpose

The native frame: four-item bottom navigation, the single "Prijavi" action and its choices, permission primers, signed-out states, deep-link landing, and the shared loading and error patterns.

## Bottom navigation

88 px including the 20 px safe area, `card` surface, no top border. Exactly four items, icon above a 13 px bold label:

| Order | Label (EN) | Icon | Content |
|---|---|---|---|
| 1 | Map | `map-trifold` (fill when active) | P4 map and list |
| 2 | Inbox | `chat-circle` | P13 inbox (conversations and notifications) |
| 3 | Report | `plus` in a 48 px `primary` circle | opens the Report sheet |
| 4 | Profile | `user-circle` | P13 account and settings, P8 pets |

Active item uses `primary` colour and the fill icon. No count badges. Tabs are visible signed in and signed out. The bar hides while the keyboard is open and in flows (P6, P7), which use the flow top bar.

## Report sheet (the single primary action)

A bottom sheet over a dimmed map: h2, then three choice rows (Lost animal, Found animal, Sighted animal), each with its status icon in the status text colour, a one-line description and a caret. Rows sit on `background` tone inside the `card` sheet. Tapping a row starts the flow (P6 or P7). Grabber and a scrim tap close it. Found and sighted show "no account needed".

## Permission primers

Shown before the OS prompt, one per permission, full-height sheet: spot icon in a tonal circle (camera, location pin, bell), h2 "why we ask", two lines of plain language, `lg` primary "Allow", text button "Not now". Denial leaves a working fallback and a quiet note in the place that needed it:

| Permission | Asked when | Fallback |
|---|---|---|
| Camera and photos | first photo step in a flow | choose from gallery, or add later |
| Location | first "use my location" | search a place or drop a pin |
| Notifications | after the first report or when the user turns on alerts | in-app inbox and email |

## Signed-out states

- Inbox tab: explains what appears here (matches, messages, alerts), primary "Sign in" and a text button "Create account". Reporting found or sighted stays open without an account.
- Profile tab: sign-in prompt plus language and cookie settings rows (these work signed out).

## Deep link landing

Opening a listing or poster QR: a brief loading frame (logo, skeleton of the detail page), then the report. Failures: not found or removed (410 pattern), link invalid (neutral page with "Open the map"). Without the app installed the web page opens (P9).

## Shared patterns

Top bars: map (none, floating pill), flow top bar (back, step bars, close), standard top bar (back, title, optional action). Loading skeletons, empty states, inline errors and toasts as in P1 but with sheets instead of popovers. Offline banner: one `note` under the top bar ("Offline. Your draft is saved") that disappears when online. Pull to refresh on lists.

## Responsive

Phones 360 to 430 px wide; test 320. Respect safe areas, dynamic type up to 200 %. Tablets (≥ 768) use the web shell layout rules from P1 inside the app (not designed in detail for M1).

## Accessibility

Tab bar items are buttons with `accessibilityRole="tab"` and selected state; the Report action is announced as a button, not a tab. Sheets trap focus, have a close button for screen readers, and announce their title. Touch targets 44 px or more. Primers are readable at 200 % text size without clipping.

## Offline state

When there is no connection every tab shows a quiet `note` under the top bar: "Brez povezave" with the time of the last update ("zadnja posodobitev 14:20"). Cached lists stay readable; actions that need the network are disabled with an explanation; queued items show a clock icon.

## Assets

None (icons only).

## Mockup scope (`P2-mobile-shell.html`)

1. Phone frames: Map tab shell (floating pill, sheet peek, bottom nav), Inbox tab signed out, Profile tab signed out.
2. Report sheet open over the dimmed map.
3. Three permission primers (camera, location, notifications) and one denied-fallback note.
4. Deep link landing (loading) and invalid link.
5. Offline banner, loading skeleton, empty state, toast.
6. Light and dark.

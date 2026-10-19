---
source: 03§P1
page: P1 Web shell
stories: TASK-11 (FR-035, FR-036)
platforms: web
version: 1.1
mockup: docs/design/mockups/P1-web-shell.html
copy: docs/content/pages/P1-web-shell.md
---

# P1 Web shell

## Purpose

The frame every web page sits in: header, footer, page containers, the right sidebar region, and the shared loading, empty and error patterns. Pages are built in parallel on top of it, so it fixes layout, landmarks and the "Prijavi" menu once.

## Layout variants

| Variant | Used by | Structure |
|---|---|---|
| Content | public pages, detail, partners | header, `main` (max 1120), footer. Optional right sidebar from `lg` (320 px, sticky, holds the ad slot). |
| Flow | report lost, report found, auth, chat, payment, consent settings | header (reduced), centred column 560 px, **no sidebar, no ad slot** (rule P-2, FR-030). |
| App | signed-in lists, settings, inbox | header with account area, content with optional left sub-navigation from `lg` (settings, inbox). |
| Admin and portal | P19 | their own shell, not this one. Route groups exist (public, app, portal, admin) with guards; empty pages are fine. |

## Header (88 px, no border, on `background`)

Left to right:

1. Logo mark and wordmark (link to home).
2. At most four text links (16 semibold; current page `foreground`, others `muted-foreground`, `aria-current="page"`): public set is Map, Lost, Found, How it works. Signed-in replaces "How it works" with "My pets and reports" (how it works moves to the footer).
3. Spacer.
4. Language switcher: text toggle `SL / EN`, current language underlined. Keeps the current path.
5. Signed-in: inbox icon button (links to the messages and notifications page) and account menu (avatar, opens a popover: Profile, Alerts, Payments, Sign out). Signed-out: ghost button "Sign in" (Slovenian label "Vpis").
6. Primary `sm` button "Report" that opens a popover of three choice rows (Lost animal, Found animal, Sighted animal). This is the single primary action in the header. On pages whose content has its own primary (P3 home hero, P9, P22) it is `secondary` instead (system 10.7), so the view keeps one primary.

No notification count badges. Unread state (CH-279, as built TASK-22.4): the inbox icon button and the menu-sheet inbox row show the 10 px `primary` unread dot of the inbox rows, never a count, with "neprebrano" (`common.unread`) in the link name (system 10.7).

## Footer

The Content variant footer is specified in system 10.7 (Web footer): four headed groups, one column per group below `lg`, the operator line with "Podatki o podjetju", wireframe `docs/design/wireframes/P1-footer.html` with the owner's choices of 2026-10-19 (CH-594). **Cookie settings** opens the consent preferences (P17); **Shelters** is the public directory `/zavetisca` (P3 T5), listed under Pomoč and kept distinct from "For shelters". The Flow variant keeps the minimal quiet row.

## Page container rules

- Skip link first in tab order ("Skip to content"), then header, `main`, optional `aside`, footer. Landmarks: `header`, `nav`, `main`, `aside`, `footer`.
- Content gutters 48 px from `md`, 20 px below. Section gap 96 px (web), 48 px (mobile web).
- H1 once per page, directly under the header with 32 px space above.
- Sidebar region reserved even when empty so adding an ad later does not shift layout (CLS budget).

## Shared patterns

| Pattern | Spec |
|---|---|
| Page loading | Skeleton blocks with the final layout shape (title, photo, rows). No spinner for page loads. |
| Empty state | Spot illustration, h3, one sentence, one secondary button. Calm and helpful, never apologetic. |
| Inline error | Note with icon and a retry text button. |
| Error pages | 404 (not found), 410 (report no longer available, with link to the map), 500 and offline. Spot illustration, h1, one sentence, primary "Go to the map" and a text button. |
| Toast | Popover surface bottom-centre, 5 s, polite live region. |
| Banner area | One slot under the header for the consent banner (P17) and system notices (maintenance, test mode). Max one visible. |

## Responsive

- `xl` and up: container 1280, content 1120.
- `lg`: full header with links, sidebar region appears.
- `md`: header shows logo, language, primary "Report" and a menu button; links move into the menu.
- Below `md`: header 64 px: logo, primary "Report" (icon + word), menu button. The menu opens as a full-height sheet with the links, language switcher, sign-in or account entries. There is no bottom tab bar on mobile web; the native app has it (P2).
- Test 320 px and 400 % zoom: no horizontal scroll.

## Accessibility

Visible focus on every control, menu opens with Enter or Space and closes with Escape returning focus, popover rows are a `radiogroup`-style list with arrow keys, current page announced, language switch has an accessible name and keeps focus.

## Assets

No dedicated assets. The error pages (404, 410, 500) reuse `assets/empty-inbox.png` when it exists; the mockup must not wait for it (use a placeholder block).

## Mockup scope (`P1-web-shell.html`)

1. Browser frames: Content variant (signed out), Content with sidebar (signed in, `lg`), Flow variant.
2. The "Report" popover open; the account popover open; keyboard focus on a header link.
3. 768 px and 390 px frames with the menu closed and open.
4. Footer in full.
5. Patterns: loading skeleton, empty state, inline error, 404, 410, 500, toast, banner area with a sample notice.
6. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-19 | CH-279: unread dot on the inbox button (no count). CH-594: footer points to system 10.7 (groups, one column per group below `lg`, operator line). |

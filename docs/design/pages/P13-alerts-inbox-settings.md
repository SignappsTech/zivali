---
source: 03§P13
page: P13 Notifications, nearby alerts and account settings
stories: TASK-22, TASK-23, TASK-9 (FR-010, FR-001, FR-036)
platforms: web, mobile
version: 1.5
mockup: docs/design/mockups/P13-alerts-inbox-settings.html
copy: docs/content/pages/P13-alerts-inbox-settings.md
---

# P13 Notifications, alerts and settings

## Purpose

Where users see what happened (matches, messages, nearby alerts, reminders) and control how they are told. Also the Profile and account screens: language, home area, email status. Calm and short; the owner must never miss a chip match or a message.

## Inbox, Notifications view (Inbox tab, second view; web `/inbox`)

- Heading and a text button "Mark all as read" (only when unread exist).
- Rows without dividers: icon in the status text colour (match, message, nearby alert, reminder, system), title (bold when unread, with the 10 px `primary` dot), one sentence, time right. Tapping opens the target (match review P11, chat P12, listing P9).
- Types and look:

| Type | Icon | Notes |
|---|---|---|
| Possible match | `sparkle` | a chip match uses the shield icon and sorts first |
| Message | `chat-circle` | grouped per conversation |
| Nearby alert | pet photo 48 | status word and distance |
| Reminder (day 7, 14, 30; 90-day close) | `clock` | row has a primary-tone text button "Keep searching" and a text button "Close search" |
| System | `info` | moderation, payment receipt |

- Grouped under Today, This week, Earlier (h3). Empty state: spot illustration, h3, sentence, text button "Set up alerts".

## Alert settings ("Alerts" under Profile; web `/account/alerts`)

Sections separated by 40 px, line fields and switches only:

1. **Alerts near me:** master switch. When on: home area row (opens the alert-area picker, P5, with place name and radius), radius slider 1 to 25 km on the picker's stops (1, 2, 3, 4, 5, 7, 10, 15, 20, 25; the web number field snaps to the nearest; Premium raises the cap, M4), species toggle pills (Dogs, Cats; any pill can be switched off, none disabled; with none chosen a plain muted line under the pills, `alerts` copy "Ne prejemate opozoril za živali v bližini."), a pause switch. There is no daily limit stepper on web or mobile (C10 PUT has no `daily_cap`).
2. **How to tell me:** a list by type (Matches, Messages, Nearby alerts, Reminders), each with three switches (Push, Email, In app). There is no in-app lock: every switch of every row can be turned off, with no lock icon, no note and no warning when all are off (conversations still list under Messages).
3. **Quiet hours:** two time fields (from, to) and the sentence that chip matches and messages still arrive.
4. **Permission state:** push denied shows a `note` with a primary-tone text button "Open system settings"; email unverified shows "Confirm your email to get email alerts" with "Resend".

### Alert settings as built on web (TASK-23.2, TASK-114.15, CH-419, CH-549)

`/account/alerts` shows section 1 first. "Kako vas obvestimo" (sections 2 and 3) is a disclosure at the end of the same page (mock M-alerts-notifications v1, approved 2026-10-18): an h2 containing a button with `aria-expanded` and `aria-controls`, a 56 px row with a top divider, the caret turning without motion under reduced motion, **open by default** (since TASK-114.42, owner choice 2026-10-19, CH-665), the grey summary under the title shows once it is closed, and `#kako-vas-obvestimo` still opens it. "Tihi čas" inside it is an h3 (32 px above). The notifications route `/racun/obvestila` is only a redirect to it, so no extra account-menu entry is needed (CH-280). Row mapping of "Kako vas obvestimo" (CH-280, confirmed): Matches = `match_chip`, `match_suggested`, `match_confirmed`; Messages = `chat_message`; Nearby alerts = `nearby_lost`; Reminders = `report_reminder`, `report_expiring`, `report_closed`; `report_hidden` and `report_reunited` keep their defaults and have no row. Section 4 (permission state) stays where it applies. No account sub-navigation exists yet on any `/account` page; the `lg` left sub-navigation below is the target, not built.

### Opt-in moments

After the first report is published and on the Map empty state, a bottom sheet offers "Turn on alerts near you" with the radius default (5 km) preview map, primary "Turn on", text "Not now". Records `alert_opt_in` (consent not needed for our own events).

## Account and profile (Profile tab; web `/account`)

- Header: avatar, name, email with a verified status word ("Verified" with check, or "Not verified" with a text button "Send link").
- Rows (single column, no cards, 20 px apart): Language (SL / EN switch), Home area (value, opens picker), Phone (optional, with the sentence that it is never public), My pets (P8), My reports, Payments (M2 list of contributions), Alerts, Cookie settings (P17), Help and safety tips, Sign out. Delete account and Export data rows are added in M3 (FR-034).
- Web `lg`: left sub-navigation (Account, Alerts, Pets, Reports, Payments) and content on the right.

## States

Loading skeleton rows; saving feedback as a toast "Saved"; validation on phone; permission denial notes; offline (changes queue); language change reloads text without losing place.

### Alert settings as built on mobile (TASK-23.3, CH-328)

Section 1 is its own screen "Opozorila v bližini" (sections 2 to 4 are "Kako vas obvestimo", TASK-22.5). The home area opens the P5 picker in alert mode. The radius slider uses the picker's alert stops (1, 2, 3, 4, 5, 7, 10, 15, 20, 25 km) and saves when the finger lets go. Species pills have no animal icon (the kit Pill is text only); any animal can be switched off (no pill disabled, CH-502). There is no daily-limit stepper. The proximity switch is TASK-87.2.

## Responsive and accessibility

Switches are real `switch` roles with visible labels, sliders have number inputs on web and value text, time fields use native pickers on web, group labels are headings, the unread dot is accompanied by "unread" in the accessible name, no information by colour alone.

**Mobile as built (TASK-22.5, CH-284, accepted 2026-10-19).** No time-picker module (none in ADR-017, it needs a new dev build): the quiet hours are two line fields (from, to) that accept "22:00", "7:00", "22.30" or "2200", show the expected format as the help line, and save once both are valid; an invalid value gets the field error. A native picker is a follow-up only if testers struggle. The nearby row in the notifications view shows the lost status icon (the payload has no photo) and no extra status word (the title says "Izgubljen pes", the body the distance band). A refused settings change moves the switch back and shows an error toast; it is not queued offline.

**Offline data (Settings, mobile, TASK-85.3, CH-320, confirmed).** A body sentence, two label/value rows (area and last update), the switch with a help line, and a `secondary` "Počisti podatke brez povezave" that opens a confirm dialog. Map offline states: P4 §Offline.

## Proximity alerts and Always-location primer

An extra switch under "Alerts near me": "Alert me when I am near a lost animal" (proximity alerts, M3 offline feature). Turning it on shows an **Always-location primer** (full sheet like P2 primers): why background location is needed in two lines, what is and is not stored, primary "Allow always", text "Not now"; denial leaves the switch off with a note and a text button "Open system settings". Opt-in sheet and settings both show the same state.

**Notification permission (TASK-87.3, TASK-87.4, CH-400, CH-413).** Nearby reminders are local alerts and need notification permission (iOS, Android 13+). Turning the switch on checks notifications first: the P2 notifications primer (TASK-22.5) while the OS can still ask, then the Always primer. The Always prompt never shows while notifications cannot show (the reverse order QA proposed is not used). "Ne zdaj" in either primer asks nothing and shows no note. An OS decline, or a permission the OS can no longer ask for, leaves the switch off with the boxed notifications note and "Odpri nastavitve telefona"; the switch never shows on while notifications are off. If notifications are turned off later in the phone settings, the screen stops the areas and shows the same note. Signed out with reminders still registered (their wipe failed, TASK-87.6): Profile shows an "Opomniki v bližini" row and Settings > Alerts shows only that section (an off switch that cannot turn them on while signed out; no quiet hours).

**As built on mobile (TASK-87.2, CH-356).** The proximity switch is its own section "Opomniki v bližini" (h2, 40 px below the alerts, shown when alerts are off too) with a line saying that pausing alerts does not stop it, the daily cap in the help line, and a "Tihi čas" row with "Spremeni" leading to Kako vas obvestimo. The primer has three bullets (what is watched, nothing is uploaded, how to turn it off) instead of "Shranimo / Ne shranimo". A permission the OS took back shows its own note text.

## Assets

| File | Brief |
|---|---|
| `assets/empty-inbox.png` | Shared empty-state illustration with P12 ("nothing here yet"). |

## Mockup scope (`P13-alerts-inbox-settings.html`)

1. Mobile: notifications view with every type and groups, empty, alert settings (all four sections), permission denied note, opt-in sheet, account screen (verified and not verified).
2. Web 1200 px: inbox page, alert settings with the sub-navigation, account page.
3. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | No in-app lock, every switch can be turned off; animal pills all switchable (CH-502, TASK-114.14, owner rule 2026-10-16). |
| 1.2 | 2026-10-18 | CH-328, CH-356: mobile alert settings and proximity section as built |
| 1.3 | 2026-10-18 | CH-400, CH-413, CH-419, CH-549: notification permission order, web alert settings as built, no daily stepper, radius stops, disclosure. CH-502, CH-535 already applied (1.1). |
| 1.4 | 2026-10-19 | CH-280: no separate notifications page or menu entry (redirect), row mapping confirmed. CH-284: mobile quiet-hour line fields, nearby row, refused change. CH-320: offline data settings. |
| 1.5 | 2026-10-19 | CH-665: "Kako vas obvestimo" open by default on web; summary shows when closed. |

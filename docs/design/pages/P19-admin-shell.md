---
source: 03§P19
page: P19 Admin console shell
stories: TASK-34 (FR-019), TASK-89 (FR-044, shelter directory admin)
platforms: web
mockup: docs/design/mockups/P19-admin-shell.html, docs/design/mockups/P19-shelter-directory.html (directory screen)
copy: docs/content/pages/P19-admin-shell.md
---

# P19 Admin shell

## Purpose

One console for the client and moderators: ads, organisations, moderation, orders and leads, KPIs and settings. Web only. Denser than the public product, but the same tokens, calm tone and accessibility. Only the shell, navigation, access patterns and the shared table pattern are designed now; each area adds its own screens (P20 for ads).

## Layout

- **Sidebar** (shadcn sidebar with the `sidebar-*` tokens: dark teal on `sidebar`, active item `sidebar-primary`, 280 px, collapsible to icons on `lg`, sheet below `lg`). Items filtered by role, each with a Phosphor icon and label:

| Group | Items | Roles | Milestone |
|---|---|---|---|
| Overview | Dashboard | admin, moderator | M2 (placeholder), M4 (KPIs) |
| Content | Ads, House ads | admin | M2 |
| Safety | Moderation queue, Reports | moderator, admin | M4 (shell item visible, "coming" state until built) |
| Organisations | Verification, Organisations, Shelter directory | admin | M3 (directory: with TASK-89) |
| People | Users | admin | M4 |
| Commerce | Enquiries (leads), Vet Partners | admin | M2 for enquiries, Vet Partners with its story |
| System | Audit log, Settings | admin | M2 |

- **Top bar** (72 px, `background`): breadcrumb as text links, page title h1 below it, right side: environment label (Local, Staging, Production), role word, account menu.
- **Content** max 1280, 48 px gutters, 40 px between blocks.

## Shared table pattern (dense)

Filter row (line search, select filters as pills), table with sticky header, rows 56 px, row hover tone `accent`, hairlines (`border`) allowed here, 14 to 16 px text, sortable columns with an icon and `aria-sort`, bulk selection with checkboxes (24 px visual, 44 hit), pagination (keyset "Load more" or page numbers), per-row actions in a menu, empty state, loading skeleton rows, error note. Row click opens a right drawer (480 px) with detail and actions. Destructive actions use the dialog from system.md with the target named and an audit-note field.

## Access patterns

| Screen | Content |
|---|---|
| Sign in with strong authentication | the standard sign-in (P16), then an authenticator code screen (6 digit field, "use backup code" text) and enrolment screen with QR and secret, first time. As built (TASK-34.3): TOTP enrolment and code render in place at the requested admin URL (no `/admin/preverjanje` route) |
| Access denied | non-admin or wrong role: h1, sentence, text button back to the app. No hint of what exists. |
| Session timeout | dialog "Sign in again" with the page kept. As built (TASK-34.3): not built; an ended session goes to sign-in with `next` (keeping the page needs an in-place re-auth) |
| Last-admin guard | removing the last admin is refused with an explaining note |
| Maintenance or read-only | banner at the top. As built: not built (no flag or API yet) |

## Dashboard (placeholder)

Four plain number blocks without cards (open reports, active ads, pending enquiries, reports under review) as large numbers with a label and a text link, and a recent audit entries list (five rows). Real KPIs arrive in M4. As built (TASK-34.3): the four numbers wait for a counts endpoint (M4), so the screen shows the "Kmalu" note, plus the five latest audit entries for admins.

## Audit log

A table: time, actor, action, target, change summary; filter by actor and action; read only; CSV export (M4). Every mutation in the console writes an entry; the shell shows a toast "Saved, logged".

## Shelter directory (`/admin/zavetisca`, TASK-89)

Admins keep the municipality-to-shelter directory (17 shelters, 212 municipalities) correct without developer help. It feeds the public shelter pages (P3 T5, T6) and the P6 and P7 call buttons, so every save is live at once; the screen says so. Uses the shared table pattern. Strings in quotes are placeholders for the content slice.

Top bar: h1 "Imenik zavetišč", right: `secondary` "Uvozi CSV" and the one primary `sm` "Dodaj zavetišče".

1. **Yearly refresh reminder** (from 1 April until no entry is older than 12 months): one `note` under the top bar (`clock` icon, the count in bold; no warning colours, sun yellow stays out of the console): "{n} vnosov ni bilo preverjenih več kot 12 mesecev." with a text button "Pokaži" that applies the "Starejše od 12 mesecev" filter. Not dismissible; it disappears when the list is empty. The only notice on the page itself.
2. **View switch**: segmented control (Tabs) "Zavetišča" and "Občine" (two views of the same data).
3. **Shelters table**: columns name, municipalities (count), phone (`tabular-nums`), last verified (date; entries older than 12 months add a `clock` icon and the bold word "zastarelo"; icon and word, never colour), source, row menu (Uredi, Zgodovina, Izbriši). Filter row: line search, pill "Starejše od 12 mesecev".
4. **Municipalities table**: columns municipality, responsible shelter (or the status word "Ni potrjeno" with an `info` icon), status (Potrjeno, Ni potrjeno), last verified, source. Filter row: search, shelter select, pill "Brez zavetišča".
5. **Edit drawer** (480 px, row click or "Uredi"): shelter form with labels above line fields: name, address (street, postcode, place), phone (validated, +386 formats), website, e-mail, **opening hours** as rows (day range select, from and to time, remove icon button; text button "Dodaj vrstico"; a "Zaprto" switch per row), **municipalities served** (a combobox to add, the chosen ones as a plain list with a 44 px remove icon button each, no chips), **source** (required) and **verified on** (date, defaults to today), and an audit note. Footer: primary "Shrani", `text` "Prekliči". Errors per field (system 10.3); a save conflict with another admin shows a `note` with "Osveži". After saving: toast "Shranjeno, zabeleženo. Že vidno v aplikaciji."
6. **Municipality drawer**: municipality name (read only), responsible shelter (select; empty means unconfirmed), status (radio: Potrjeno, Ni potrjeno), source, verified on, audit note. A municipality without a confirmed shelter shows the public "unknown" note (P3 T5), so the drawer says that in help text.
7. **History** (drawer section or "Zgodovina" from the row menu): versions newest first (time, actor, change summary); selecting one shows a plain before and after list of changed fields ("prej", "zdaj" columns, `tabular-nums` for numbers), read only. Restoring is "Obnovi to različico" (`secondary`), which creates a new version.
8. **CSV import** (dialog, max 640 px for this one table): file field (drop area with a button), then a **dry run**: summary line ("3 nova, 12 spremenjenih, 0 odstranjenih, 2 napaki"), a table of changes (entity, field, prej, zdaj) and a list of errors with the CSV row number and the reason. Primary "Uveljavi spremembe" is disabled while there are errors (help text says why); `text` "Prekliči". Applying shows a progress line, then the toast.
9. **Delete a shelter**: refused while municipalities are assigned (a `note` like the last-admin guard, naming the count); otherwise the destructive dialog with the shelter named and an audit-note field.

States: loading skeleton rows, empty search result, error note with retry, the directory is admin only: moderators (Pregled + Varnost) get the access-denied screen.

## Responsive

Desktop first. Below `lg` the sidebar becomes a sheet and tables become stacked rows with the key columns; admin on phones is usable but not optimised. Minimum width 360 px.

## Accessibility

Landmarks, skip link, table semantics, row actions with names, drawer focus management, keyboard shortcuts documented and optional (none required), contrast per sidebar tokens.

## Assets

None.

## Mockup scope (`P19-admin-shell.html`)

1. Browser 1200 px: dashboard, sidebar collapsed, role-filtered menu for admin and for moderator, a generic table with filters, drawer, empty and loading states, destructive dialog, audit log.
2. Access screens: authenticator, enrolment, access denied, timeout dialog, last-admin note.
3. 768 px with the sidebar as a sheet.
4. Light and dark.

## Mockup scope (`P19-shelter-directory.html`, TASK-89 design task)

1. Browser 1200 px: shelters table with the yearly reminder and the stale filter on, municipalities table with an unconfirmed row, edit drawer (opening hours rows, municipalities list, a field error), history with a before and after view, CSV import dry run with errors (apply disabled) and without errors, delete refused note, toast after save.
2. 768 px: table as stacked rows, drawer stays 480 px (full width only below 640).
3. Light and dark. Shelter data is marked sample data.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-222: access patterns and dashboard as built (TASK-34.3) |

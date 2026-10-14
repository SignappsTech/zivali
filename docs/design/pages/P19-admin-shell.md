---
source: 03§P19
page: P19 Admin console shell
stories: TASK-34 (FR-019)
platforms: web
mockup: docs/design/mockups/P19-admin-shell.html
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
| Organisations | Verification, Organisations | admin | M3 |
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
| Sign in with strong authentication | the standard sign-in (P16), then an authenticator code screen (6 digit field, "use backup code" text) and enrolment screen with QR and secret, first time |
| Access denied | non-admin or wrong role: h1, sentence, text button back to the app. No hint of what exists. |
| Session timeout | dialog "Sign in again" with the page kept |
| Last-admin guard | removing the last admin is refused with an explaining note |
| Maintenance or read-only | banner at the top |

## Dashboard (placeholder)

Four plain number blocks without cards (open reports, active ads, pending enquiries, reports under review) as large numbers with a label and a text link, and a recent audit entries list (five rows). Real KPIs arrive in M4.

## Audit log

A table: time, actor, action, target, change summary; filter by actor and action; read only; CSV export (M4). Every mutation in the console writes an entry; the shell shows a toast "Saved, logged".

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

---
id: TASK-34.3
title: 'Web admin shell: role navigation, TOTP enrolment and challenge, audit log'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 20:01'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-9.3
  - TASK-6.9
  - TASK-34.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P19-admin-shell.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-34
priority: high
ordinal: 183000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ads, abuse reports, organisation verification and orders plug into one admin area with strong authentication (FR-019).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Admin console shell (P19) approved (TASK-34.1)
Design: P19 docs/design/pages/P19-admin-shell.md (mockup docs/design/mockups/P19-admin-shell.html; TASK-34.1)
Copy: docs/content/pages/P19-admin-shell.md
Contracts: C3, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-34.3-admin-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /admin shows a navigation shell (Ads, Reports, Organisations, Users, Orders, KPIs) filtered by role, per P19; everyone else gets 403 or a redirect.
- [ ] #2 Staff without TOTP are taken to enrolment (QR code) and staff with a factor to the challenge before any admin page loads.
- [ ] #3 The audit log page lists who, what, when and target with filters, using the shared dense table pattern.
- [ ] #4 Admin pages are web-only, in SL and EN, and meet WCAG 2.2 AA (axe 0 violations).
- [ ] #5 Admin pages send no GA page_views: /admin* routes are excluded from analytics (no gtag config/page_view on them)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
CHANGE rows for backlog/changes.md (the worktree isolation refused the write to the main checkout; lead: please move them to the inbox):

| - | - | docs/tech/contracts/C3-auth-profiles-roles.md§REST, §Client | `AuditLogEntry` carries only `actor_id`: add the actor's display name (e.g. `actor: { id, display_name } \| null`) so the P19 audit log shows who by name; until then the web shows the first 8 characters of the uuid and "Sistem" for null. Client as built (TASK-34.3): `mfa.listFactors()` and `mfa.unenroll(factorId)` in @zivali/api/auth (enrolment removes stale unverified TOTP factors first, they count against the factor limit); `listAuditLog` infinite query (`useListAuditLogInfiniteQuery`, filters actor_id/action/limit, keyset cursor) in @zivali/api/me. | TASK-34.3 | open |
| - | - | docs/content/pages/P19-admin-shell.md§2, §4, §6 | New key `admin.breadcrumb_label` "Drobtine" / "Breadcrumb" (name of the top-bar breadcrumb landmark; the mockup's sample word). Audit actions have no labels: the log shows the raw code (`user.role.set`, `report.hide`, …); add `admin.audit_action_<code>` labels if wanted. The system actor reuses `admin.directory.history_system`. `admin.mfa_backup` is not used: Supabase TOTP has no backup codes (decide: a second factor, or an admin-assisted reset). AC#1 lists Orders and KPIs: Orders is dropped (§1), KPIs is the Dashboard item. | TASK-34.3 | open |
| - | - | docs/design/pages/P19-admin-shell.md§Access patterns, §Dashboard; docs/tech/contracts/C15-routes-deeplinks.md§Web routes | As built (TASK-34.3): TOTP enrolment and code render in place at the requested admin URL (no /admin/preverjanje route). Session timeout dialog not built: an ended session goes to sign-in with `next` (keeping the page needs an in-place re-auth). Read-only banner not built (no flag or API yet). Dashboard: the four KPI numbers wait for a counts endpoint (M4), so it shows the "Kmalu" note, plus the five latest audit entries for admins. Routes: /admin, /admin/revizijska-sled (EN /en/admin/audit-log), /admin/zavetisca; sections not built yet open /admin/[section] with the EN slug in both locales (ads, house-ads, moderation, abuse-reports, verification, organisations, users, enquiries, vet-partners, settings) until their task adds its page and SL slug (components/admin/nav.ts). Unlisted admin paths are admin only. | TASK-34.3 | open |
<!-- SECTION:NOTES:END -->

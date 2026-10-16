---
id: TASK-34.4
title: 'QA: Admin console shell'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 09:29'
labels:
  - 'qa qa:fail'
milestone: m-1
dependencies:
  - TASK-34.2
  - TASK-34.3
  - TASK-34.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-34
priority: high
ordinal: 252000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-34 (Admin console shell) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-34 merged to main (TASK-34.2, TASK-34.3, TASK-34.1); leads add any later TASK-34 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a user with the admin or moderator role, when they open the admin area, then they see a navigation shell (Ads, Reports, Organisations, Users, Orders, KPIs) filtered by role and everyone else is redirected or gets 403.
- [x] #2 Given any admin action, when performed, then an audit log entry (who, what, when, target) is stored and viewable by admins.
- [x] #3 Given admin roles, when they sign in, then strong authentication (TOTP or equivalent, decided in the TDD) is required.
- [x] #4 Given the first admin, when bootstrapping a new environment, then a documented script creates the initial admin without a public sign-up path.
- [ ] #5 Given the admin area, when used, then it is web-only, SL and EN, and core tables and forms meet WCAG 2.2 AA.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 (static, main b965dff9): AC1 pass (nav.ts roles + router guard; Orders/KPIs entries not present yet); AC2 FAIL bug TASK-34.7; AC3 pass, recovery gap TASK-34.6 + CHANGE row; AC4 pass; AC5/AC6 verify, e2e: merge queue on main at b965dff9 (web vitest admin suites need built i18n dist, not runnable here). Also TASK-34.5 robots.txt. Tests added: admin.routes guard sweep (ads/abuse/flags/directory), e2e MFA rate-limit.
Re-check 2026-10-16 on main bd5a8271 (static + unit; machine rules: no e2e, API tests, build, Lighthouse). TASK-34.5 (app/robots.ts disallows /admin and /en/admin, sitemap from app URL, robots.test), TASK-34.6 (backup-authenticator card, lost-device line on code screen, pnpm admin:create --reset-mfa with prod guards and audit, docs/tech/admin-runbook.md) and TASK-34.7 (AuditDao.write for admin.ads.list/stats/image_presign and admin.shelters/municipality_shelters reads; admin-read-audit.routes.test read, not run) confirmed. Web vitest components/admin (incl. backup-authenticator, admin-shell) green after building i18n dist. AC2 ticked. Remaining: AC5 (WCAG 2.2 AA of tables and forms needs the browser a11y run) and AC6 verify, e2e, Lighthouse: merge queue on main at bd5a8271.
<!-- SECTION:NOTES:END -->

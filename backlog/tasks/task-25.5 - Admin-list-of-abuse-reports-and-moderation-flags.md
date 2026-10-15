---
id: TASK-25.5
title: Admin list of abuse reports and moderation flags
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 22:39'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-34.3
  - TASK-6.10
  - TASK-34.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C11-abuse-reports.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-25
priority: medium
ordinal: 186000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Moderators must read flags in the admin shell until the full queue exists in M4 (TASK-25 AC#5).

## Packet

Unblocks on: Web admin shell: role navigation, TOTP enrolment and challenge, audit log merged (TASK-34.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Admin console shell (P19) approved (TASK-34.1)
Design: P19 docs/design/pages/P19-admin-shell.md (mockup docs/design/mockups/P19-admin-shell.html; TASK-34.1)
Copy: docs/content/pages/P19-admin-shell.md
Contracts: C11 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-25.5-abuse-admin-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins and moderators with aal2 see abuse reports and moderation flags with target, reason, weight, status and date in the admin shell, per the P19 table pattern.
- [ ] #2 Each row links to the target (listing, or the conversation context of a reported message).
- [ ] #3 Non-staff users get 403; axe 0 violations.
- [ ] #4 Restoring an auto-hidden listing (AbuseDomain.restoreReport, for the moderation actions) makes it visible again, dismisses its open abuse reports and resolves its auto_hidden flag, so the next single report does not hide it again; audited.
- [ ] #5 POST /v1/abuse-reports refuses reports on your own listing (any manager of it) or your own profile with FORBIDDEN; Supertest covers #4 and #5.
<!-- AC:END -->

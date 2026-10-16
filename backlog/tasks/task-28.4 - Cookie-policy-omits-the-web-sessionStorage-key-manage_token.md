---
id: TASK-28.4
title: Cookie policy omits the web sessionStorage key manage_token
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-16 07:12'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-28
ordinal: 350000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Violates TASK-28.2 AC#2 (list strictly necessary storage). Steps: read apps/web/content/legal/{sl,en}/cookies.mdx section 3 and apps/web/lib/manage-link.ts (STASH = 'manage_token' in sessionStorage). Expected: listed with purpose and duration (until the tab closes). Actual: only the localStorage manage:<id> key is listed. Also: the zz_support:* sessionStorage keys of TASK-33.2 are not on main yet (branch agent/task-33.2-support-web); add them to the policy when it merges. Severity: low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cookie policy section 3 (SL and EN) lists the sessionStorage item manage_token (private-link token stash, one tab session, strictly necessary) next to the manage:<report id> localStorage item
<!-- AC:END -->

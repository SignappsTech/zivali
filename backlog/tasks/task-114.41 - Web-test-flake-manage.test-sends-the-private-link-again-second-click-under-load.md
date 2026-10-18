---
id: TASK-114.41
title: >-
  Web test flake: manage.test 'sends the private link again' second click under
  load
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 23:58'
labels:
  - bug
  - fe
  - 'est:XS'
  - trivial
  - no-design
dependencies: []
references:
  - apps/web/components/manage/manage.test.tsx
parent_task_id: TASK-114
priority: medium
ordinal: 406200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI verify on 335fa26c (2026-10-19) failed in apps/web/components/manage/manage.test.tsx 'sends the private link again to the email on file, and says when there is none (C7)': findByText(sl.report_found.resend_no_email) not found. Passes 3/3 alone locally, so it is load/timing: the second fireEvent.click on the resend button likely lands while the button is still busy or disabled from the first send (or before the first toast settles), so no second request goes out. Make the test wait for the button to be enabled again (or for the first request to finish) before the second click, and assert the second request was made. Test-only unless the button really ignores a second click; if so, report.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The test waits for the resend button to be ready before the second click and asserts 2 resend calls
- [ ] #2 It passes 10/10 with the web suite running in parallel (e.g. vitest --repeat or several runs)
<!-- AC:END -->

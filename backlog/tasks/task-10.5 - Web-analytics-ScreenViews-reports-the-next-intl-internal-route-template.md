---
id: TASK-10.5
title: 'Web analytics: ScreenViews reports the next-intl internal route template'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 04:10'
labels:
  - fe
  - 'est:XS'
dependencies:
  - TASK-10.2
  - TASK-7.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C16-i18n.md
parent_task_id: TASK-10
ordinal: 309000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-96. ScreenViews must use next-intl usePathname (internal route template) so SL and EN localised pathnames report one GA template; unknown paths stay /[...rest]. Unblocks on: TASK-10.2 (localised pathnames) and TASK-7.2 (ScreenViews).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SL and EN localised pathnames of the same route report one GA page template
- [ ] #2 Unknown paths still report /[...rest]
- [ ] #3 Unit test covers SL, EN and unknown path
<!-- AC:END -->

---
id: TASK-116.2
title: 'Web: implement the footer rework'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:00'
updated_date: '2026-10-18 20:14'
labels:
  - fe
  - 'est:S'
dependencies:
  - TASK-116.1
parent_task_id: TASK-116
priority: medium
ordinal: 362200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the footer (apps/web/components/shell/footer.tsx) from the approved design and the design system; group headings as real headings or labelled navs (the a11y pattern the design lead picks). The mobile app has no web footer; nothing to mirror.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matches the approved design on desktop and mobile, light and dark, SL and EN; design-lead visual review passed
- [ ] #2 Language switch and cookie settings keep working; axe clean; shell tests and e2e updated
<!-- AC:END -->

## Packet

Branch: agent/TASK-116.2-footer

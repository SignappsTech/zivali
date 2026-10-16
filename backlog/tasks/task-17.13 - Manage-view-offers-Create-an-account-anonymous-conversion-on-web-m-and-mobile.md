---
id: TASK-17.13
title: >-
  Manage view offers 'Create an account' (anonymous conversion) on web /m and
  mobile
status: To Do
assignee: []
created_date: '2026-10-16 07:08'
labels:
  - fe
dependencies: []
parent_task_id: TASK-17
priority: low
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-17.12 review: C7 §6 names the manage view as the entry point for converting an anonymous reporter, but /m (web) and the mobile manage screen have no offer. Add the conversion offer (TASK-17.12's convert flow) for an anonymous session holding the manage link; hide it for accounts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An anonymous viewer on /m and the mobile manage screen sees the conversion offer and it opens the convert flow; an account never sees it (vitest + jest)
<!-- AC:END -->

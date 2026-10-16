---
id: TASK-17.5
title: >-
  Manage page Close sends no reason: the API refuses it (VALIDATION) on web and
  mobile
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:21'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 330000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#2 (QA TASK-17.4). Steps: open a manage link (/m#token or zivali://m#token), press 'Zakljuci prijavo'. Both clients call POST /v1/reports/:code/transitions with body {"action":"close"} (apps/web/components/manage/manage-page.tsx act('close'), apps/mobile/app/m.tsx act('close')). The API requires a manager reason for close (lifecycle.domain.ts MANAGER_REASONS; C4 transitions table 'close (+reason)'). Expected: the report closes and the manage link ends. Actual: 400 VALIDATION 'Choose why the report closes', a toast, nothing closes (QA probe against the real API; e2e captured body {action:close} in Chromium and WebKit). Severity: major (core manage action broken).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Close report on the web /m page and the mobile manage screen sends a C4 close reason (e.g. a reason choice or a fixed manager reason) and the report closes (200, status closed)
<!-- AC:END -->

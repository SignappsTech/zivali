---
id: TASK-34.6
title: >-
  Admin: lost authenticator has no recovery path; 'use a backup code' (P19 F7)
  not built
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 09:28'
updated_date: '2026-10-16 09:45'
labels:
  - bug
  - 'est:S'
dependencies: []
parent_task_id: TASK-34
ordinal: 356000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC#3. Steps: open /admin as staff with a verified TOTP factor. Expected: code screen has the text button 'Uporabi rezervno kodo' (docs/design/pages/P19-admin-shell.md, content admin.mfa_backup) or a decided alternative. Actual: no button, key admin.mfa_backup unused; Supabase TOTP has no backup codes and no runbook/admin-reset exists, so a lost device locks the account out (only another admin changing role/DB can help). Severity: medium. Spec gap logged in backlog/changes.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Staff who lost their authenticator have a specified, documented recovery path; the code screen offers it per P19
<!-- AC:END -->

## Packet

Branch: agent/task-34.6-admin-fixes

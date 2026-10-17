---
id: TASK-114.2
title: Switching language turns the site light in dark mode
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 13:20'
updated_date: '2026-10-17 09:24'
labels:
  - bug
  - fe
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 360200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: with the device in dark mode, switching the language (SL/EN) switches the site to the light theme until a full reload.

Likely cause: the theme is the `dark` class on `<html>`, set by an inline script in apps/web/app/[locale]/layout.tsx (`themeScript`, follows prefers-color-scheme). The language switch is a client navigation (useLocaleSwitch, `router.replace`) into a different `[locale]` root layout: React re-renders `<html>` with the server's className (no `dark`), and an inline script rendered on the client does not run again, so nothing puts the class back.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 In dark mode, switching SL to EN and back keeps the dark theme, with no light flash, signed in and signed out
- [ ] #2 The theme still follows the OS setting live (changing it while the page is open), and the first paint has no flash
- [ ] #3 An e2e test switches the language with `colorScheme: 'dark'` emulated and checks the `dark` class (or the computed background)
<!-- AC:END -->

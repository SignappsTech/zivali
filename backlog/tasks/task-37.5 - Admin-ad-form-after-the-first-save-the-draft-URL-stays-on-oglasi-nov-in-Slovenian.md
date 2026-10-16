---
id: TASK-37.5
title: 'Admin ad form: after the first save the draft URL stays on /admin/oglasi/nov in Slovenian'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 12:10'
labels:
  - bug
  - 'est:XS'
milestone: m-1
dependencies: []
parent_task_id: TASK-37
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC: TASK-37 #1 (draft URL after the first create).

Steps: sign in as admin (aal2), open /admin/oglasi/nov, fill the form, pick a valid image, press Shrani.
Expected: the address becomes the ad's edit URL in the current language (SL /admin/oglasi/<id>/uredi, EN /en/admin/ads/<id>/edit), so a reload or Back keeps the draft.
Actual: apps/web/components/admin/ads/ad-form.tsx:347 does `pathname.replace(/\/new$/, ...)` but the SL pathname ends in `/nov` (i18n/routing.ts), so nothing is replaced. A reload shows an empty form and a second save creates a duplicate ad. EN works. No test covers the URL.
Severity: medium (default locale, duplicate drafts).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After the first create, the address bar shows the ad's edit URL in the current language (SL and EN), with a test for both
<!-- AC:END -->

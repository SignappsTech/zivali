---
id: TASK-34.5
title: Admin pages are not disallowed in robots.txt
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 09:27'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-34
ordinal: 355000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC#1/#6 (admin hardening). Steps: curl -s https://staging.najdimo.si/robots.txt. Expected: Disallow: /admin and /en/admin (admin is also noindex, sitemap clean). Actual: only Cloudflare content-signal comments, no rules; the app has no robots route (TASK-72 AC3 owns robots.txt). Severity: low (noindex meta present, so pages are not indexed). Fix with TASK-72 or earlier.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 robots.txt returns Disallow: /admin and /en/admin; sitemap keeps no admin URL
<!-- AC:END -->

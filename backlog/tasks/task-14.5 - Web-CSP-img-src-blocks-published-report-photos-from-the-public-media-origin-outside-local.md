---
id: TASK-14.5
title: >-
  Web CSP img-src blocks published report photos from the public media origin
  outside local
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:36'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-14
priority: high
ordinal: 341000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-14 AC#4 (QA TASK-14.4). Steps: build web with APP_ENV=staging, R2_UPLOAD_ORIGIN=https://<acct>.eu.r2.cloudflarestorage.com; API with MEDIA_BASE_URL=https://media.najdimo.si (deploy/README.md); open /m#<token> of a report with a published photo. apps/web/proxy.ts builds img-src 'self' blob: data: + R2_UPLOAD_ORIGIN only; PublicReport.photos[].url/thumb_url are MEDIA_BASE_URL/r/<report>/<photo>/... (photos.domain.ts mediaUrl), rendered as a plain <img> (components/manage/manage-view.tsx). Locally both are http://127.0.0.1:9000, so it only breaks outside local. Expected: published photos render. Actual: img-src has no media origin, the browser blocks every published photo (manage page now, report detail and browse next). Already reported as an open CHANGE row by TASK-17.2 (changes.md, frontend.md Environment variables) with no task. Severity: High (no report photos on the web in staging and production).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With APP_ENV staging or production, the proxy CSP img-src allows the public media origin (MEDIA_BASE_URL, https://media.najdimo.si) next to the R2 presign origin, from a validated web env var; the /m manage page photo and any PublicReport photo load without a CSP violation; proxy or env test covers it
<!-- AC:END -->

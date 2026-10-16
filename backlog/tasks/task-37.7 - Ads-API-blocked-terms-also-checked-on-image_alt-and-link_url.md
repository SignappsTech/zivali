---
id: TASK-37.7
title: 'Ads API: blocked terms are also checked on image_alt and link_url'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-16 12:10'
updated_date: '2026-10-16 10:46'
labels:
  - bug
  - 'est:XS'
milestone: m-1
dependencies: []
parent_task_id: TASK-37
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC: TASK-37 #6 (sale, gift and rehoming rule; the web assumes it applies to title, body and button text only).

apps/api/domains/ads/ads.domain.ts: CONTENT_FIELDS includes image_alt and link_url, so blockedFields flags them in assertAdWritable (and on every serve). apps/web/components/admin/ads/format.ts serverProblems assumes only title, body and cta can be refused for words and shows the https-link error for link_url.
Steps: POST /v1/admin/ads with link_url https://example.si/for-sale-of-tools and an otherwise valid body.
Expected: 201 (a URL path is not ad copy).
Actual: 400 VALIDATION on link_url "Ads may not sell, give away or rehome animals"; the admin form shows "invalid link".
Severity: low (false positive, misleading message). Product call: if image_alt should stay checked, the web must show the blocked message for image_alt; drop link_url from the check either way.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A link with a blocked word in its path is saved; the alt text rule and the web message agree with the API on which fields are checked (test in admin-ads.routes.test.ts)
<!-- AC:END -->

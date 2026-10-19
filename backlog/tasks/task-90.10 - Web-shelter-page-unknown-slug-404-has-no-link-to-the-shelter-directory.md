---
id: TASK-90.10
title: 'Web shelter page: unknown slug 404 has no link to the shelter directory'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:20'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
parent_task_id: TASK-90
ordinal: 458200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: open https://najdimo.si/zavetisca/ne-obstaja-qa (live 1ce20600, 2026-10-19, signed out; also /en/shelters/ne-obstaja-qa).
Expected: the P1 404 page with a link to T5 /zavetisca (P3 §T6 States: unknown slug).
Actual: HTTP 404, h1 'Te strani ne najdemo', links only to /zemljevid and /; no way back to the shelter directory. [slug]/page.tsx calls notFound(), which renders the generic apps/web/app/[locale]/not-found.tsx.
Severity: low.

## Packet

Unblocks on: -
Branch: agent/<id>-shelter-404-link
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an unknown or inactive shelter slug, when /zavetisca/{slug} or /en/shelters/{slug} is opened, then the 404 page (status 404) also offers a link to the shelter directory in the page language
<!-- AC:END -->

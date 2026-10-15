---
id: TASK-93
title: >-
  Bug: @zivali/validation registerSchemas order is fragile
  (GeoReverseResponse.place loses null under Node)
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-15 02:56'
updated_date: '2026-10-15 04:31'
labels:
  - be
  - bug
  - 'est:XS'
dependencies: []
references:
  - packages/validation
ordinal: 304000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-66. registerSchemas depends on registration order; GeoReverseResponse.place loses its null under Node. Make registration order-independent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GeoReverseResponse.place keeps null under Node and in the generated OpenAPI
- [ ] #2 Test covers the null case and fails on the old order
<!-- AC:END -->

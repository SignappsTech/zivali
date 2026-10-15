---
id: TASK-97
title: >-
  Bug sweep: .nullable() on .openapi()-named schemas loses null in generated
  spec
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-15 04:11'
updated_date: '2026-10-15 05:37'
labels:
  - be
  - 'est:XS'
dependencies:
  - TASK-93
references:
  - packages/validation
ordinal: 310000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-98. .nullable() on an .openapi()-named schema inherits refId, producing a bare $ref and losing null. Audit every such schema in packages/validation; fix with z.union([X, z.null()]) as in TASK-93. Unblocks on: TASK-93.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every .nullable() on an .openapi()-named schema audited and fixed with z.union([X, z.null()])
- [ ] #2 Generated-spec test fails if a nullable field becomes a bare $ref
<!-- AC:END -->

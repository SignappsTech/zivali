---
id: TASK-6.13
title: 'Validation: make zod-to-openapi extension opt-in (lean client bundles)'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 02:07'
labels:
  - be
  - 'est:S'
dependencies: []
references:
  - docs/tech/backend.md
parent_task_id: TASK-6
ordinal: 302000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-32. zod.ts runs extendZodWithOpenApi at import, pulling @asteasolutions/zod-to-openapi into web/mobile bundles. Move the extension to @zivali/validation/openapi (imported by apps/api only); schemas keep plain zod; ~150 .openapi(refId, meta) calls in src/*.schema.ts and enums.ts must move to a registration step in openapi.ts (meta map keyed by schema) or be wrapped so they are no-ops without the extension.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Importing @zivali/validation (index) or zod.ts does not import @asteasolutions/zod-to-openapi (test asserts it)
- [ ] #2 apps/api OpenAPI output unchanged (snapshot diff empty)
- [ ] #3 Next and Metro bundles exclude zod-to-openapi (bundle analyzer / metro graph check noted)
- [ ] #4 Validation tests, typecheck, lint pass
<!-- AC:END -->

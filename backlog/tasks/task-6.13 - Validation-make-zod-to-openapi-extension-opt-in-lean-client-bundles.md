---
id: TASK-6.13
title: 'Validation: make zod-to-openapi extension opt-in (lean client bundles)'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-15 02:07'
updated_date: '2026-10-15 03:00'
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

## Packet
Branch: agent/TASK-6.13-openapi-opt-in

## Notes
- AC#3 checked by grep: `grep -rn "@zivali/validation/openapi" apps/web apps/mobile` finds nothing (only apps/api imports it), so Next/Metro never reach zod-to-openapi.
- AC#2 verified with `pnpm --filter api gen:openapi --check` once TASK-3.7 is on main; the 3.7 branch adds `import '@zivali/validation/openapi'` as its first import.
- Wrong import order now throws (stub.isStub check in openapi-extend.ts), since extendZodWithOpenApi silently returns when `.openapi` already exists.

---
id: TASK-40.10
title: >-
  Public config: ai.enabled is false when AI_PROVIDER is off (like
  payments.enabled)
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-19 00:38'
updated_date: '2026-10-19 00:41'
labels:
  - be
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/contracts/C19-ai-extraction.md§REST
parent_task_id: TASK-40
priority: high
ordinal: 408200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-40.4 review (2026-10-19): GET /v1/config/public exposes ai.enabled from app_config even when the AI adapter resolves to off (AI_PROVIDER unset/off on staging and production, or mock outside local). Clients would then poll /v1/photos/:id/attributes on every upload and show 'pending' until ai.extract writes skipped_disabled. Mirror payments.enabled: report ai.enabled = app_config ai.enabled AND the adapter is not off. Add a config route test for off, mock-outside-local and anthropic-with-key. Also fix the mojibake 'Â§' -> '§' on line 1 of apps/api/test/routes/photo-attributes.routes.test.ts. Must land before TASK-41.2 ships.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 config/public ai.enabled is false whenever the AI adapter is off; true only when enabled and a real or local-mock adapter is selected; tests
- [ ] #2 Mojibake fixed in photo-attributes.routes.test.ts
<!-- AC:END -->

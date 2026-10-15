---
id: TASK-3.13
title: >-
  Mobile: Redux store Provider and generated RTK Query api, font-scale caps, URL
  polyfill
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 01:52'
labels:
  - fe
  - no-design
  - 'est:M'
dependencies:
  - TASK-3.4
  - TASK-3.5
  - TASK-3.10
references:
  - docs/tech/frontend.md
  - docs/tech/adr/017-dependency-allowlist.md
  - docs/tech/adr/020-api-architecture.md
  - docs/design/system.md
parent_task_id: TASK-3
ordinal: 299000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up of TASK-3.4 (CH-31). The mobile scaffold leaves a TODO where the Redux Provider belongs; mirror TASK-3.10 for web.

## Packet

Unblocks on: Mobile scaffold merged (TASK-3.4); packages/api foundation merged (TASK-3.5); Web store pattern merged (TASK-3.10)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Scope: Provider with createApiStore from @zivali/api/rtk in the root layout; generated RTK Query hooks via gen:api (@rtk-query/codegen-openapi, ADR-017); maxFontSizeMultiplier caps per design system section 8.3 / bottom-nav label 1.3x; URL polyfill only if the auth flow needs it (check with Supabase auth on Hermes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The mobile root layout provides the Redux store Provider (createApiStore from @zivali/api/rtk) replacing the scaffold TODO; one screen reads data through a generated RTK Query hook against createMockApi/MSW-style fixtures in a jest-expo test.
- [ ] #2 maxFontSizeMultiplier caps from the design system are applied to the shared text and nav label components (nav labels 1.3x) and covered by a component test.
- [ ] #3 A URL polyfill is added only if Supabase auth fails without it on a development build; otherwise the task notes record that none was needed. Any new dependency has a row in ADR-017.
- [ ] #4 tsc, jest-expo and expo export --platform android pass; pnpm verify passes.
<!-- AC:END -->

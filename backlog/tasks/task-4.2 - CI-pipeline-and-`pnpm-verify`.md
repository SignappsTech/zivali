---
id: TASK-4.2
title: CI pipeline and `pnpm verify`
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:12'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-4.1
  - TASK-3.4
  - TASK-3.2
references:
  - docs/tech/frontend.md
  - docs/tech/backend.md
parent_task_id: TASK-4
priority: high
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every merge must pass the same gates; until a GitHub remote exists the same sequence runs locally as `pnpm verify` (ADR-016).

## Packet

Unblocks on: Quality kit: axe, visual, Lighthouse CI, links, PR template merged (TASK-4.1); Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4); Local Supabase stack, Edge Function base and mock adapters merged (TASK-3.2)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-4.2-ci
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 .github/workflows/ci.yml runs on pull requests and main: pnpm install with cache, tokens build, lint, typecheck, unit tests (Vitest, jest-expo), i18n check, Supabase start + db reset + pgTAP, deno check, web build + Playwright smoke + quality kit + Lighthouse CI, and mobile `expo export` + `tsc`, using Turbo affected filtering where possible.
- [ ] #2 secretlint and `pnpm audit --audit-level high` fail the build on findings (shown with a planted fake secret on a throwaway branch that is then deleted).
- [ ] #3 `pnpm verify` runs the same sequence locally on Windows and Linux and is documented as mandatory before an implementer reports done.
- [ ] #4 Branch protection for main (required checks) is documented for when the GitHub repository exists.
<!-- AC:END -->

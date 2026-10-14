---
id: TASK-10.1
title: 'packages/i18n: ICU catalogues, key-parity and plural check, formatting helpers'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:39'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.8
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C16-i18n.md
  - docs/tech/adr/008-i18n.md
parent_task_id: TASK-10
priority: high
ordinal: 135000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Slovenian is the default with dual plural forms; one catalogue package with a CI check keeps web, mobile and server text complete in SL and EN.

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8)
Design: none (no UI of its own)
Contracts: C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-10.1-i18n-pkg
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 packages/i18n has messages/{sl,en}/<namespace>.json with common, errors (one key per C1 code), nav and footer seeded, and a build that merges them into dist/sl.json and dist/en.json.
- [ ] #2 `pnpm --filter @zivali/i18n check` fails on missing keys, placeholder mismatches, SL plurals without one/two/few/other, EN plurals without one/other and empty strings; tests use failing fixtures.
- [ ] #3 Format helpers (date, relative time, EUR, distance band, count) use Intl with Europe/Ljubljana; tests include '1 prijava', '2 prijavi', '3 prijave', '5 prijav' and '5,00 €'.
- [ ] #4 The README shows server use from Edge Functions (createTranslator from use-intl/core with the merged catalogue).
<!-- AC:END -->

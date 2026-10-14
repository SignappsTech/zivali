---
id: TASK-6.5
title: 'Domain wire types, zod schemas, chip normalisation and breed codes'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-6
priority: high
ordinal: 125000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web, mobile and Edge Functions build in parallel only if the wire types and validation schemas exist first (contracts first).

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1)
Contracts: C4, C8, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.5-domain
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 packages/types/src/domain defines enums and wire types for contracts C3–C14 plus forward types for organisations, organisation members, intake batches and entitlements (owner and Vet Partner); packages/validation exports matching zod schemas (CreateReportInput, PetInput, Location, AbuseReportInput, AdInput, LeadInput, CheckoutInput, AlertSubscriptionInput).
- [ ] #2 normalizeChip implements the C4 rules with unit tests (separators, 9–15 digits, 15-digit ISO 11784, invalid → null with status).
- [ ] #3 Breed code lists (about 60 dog and 20 cat breeds plus mixed and unknown) and the colour, pattern and size enums match C4; label keys are listed for the breeds and attributes i18n namespaces.
- [ ] #4 Both packages depend only on zod and import cleanly from Deno through the functions import map (a deno check fixture proves it).
- [ ] #5 `pnpm gen:types` writes packages/types/src/database.ts from the local database and is wired into Turbo.
<!-- AC:END -->

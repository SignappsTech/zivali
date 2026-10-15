---
id: TASK-6.5
title: >-
  Domain wire types and DTOs, zod request schemas, chip normalisation and breed
  codes
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 00:12'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.8
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

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8)
Contracts: C4, C8, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.5-domain
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 packages/types/src/domain defines enums and wire types for contracts C3–C18 plus forward types for organisations, members, intake batches and entitlements (owner and Vet Partner); packages/validation exports per-domain zod request schemas and response DTOs (CreateReportInput, PetInput with chip_registered_crhz, ear_tip and lifestyle, Location, AbuseReportInput, AdInput, LeadInput with interest, CheckoutInput, AlertSubscriptionInput, PublicReport, MatchSuggestion, Message and others) registered for OpenAPI.
- [ ] #2 normalizeChip implements the C4 rules with unit tests (separators, 9–15 digits, 15-digit ISO 11784, invalid → null with status).
- [ ] #3 Breed code lists (about 60 dog and 20 cat breeds plus mixed and unknown) and the colour, pattern and size enums match C4; label keys are listed for the breeds and attributes i18n namespaces.
- [ ] #4 Both packages depend only on zod (validation also on the zod-to-openapi extension) and are consumed by the API and both apps.
- [ ] #5 The C6 geocoder schemas (search and reverse requests, Place) with normalisePlace(), the C4 display-only reward fields (reward_eur, reward_note; lost only) and containsContactData() are included, with unit tests for both helpers.
<!-- AC:END -->

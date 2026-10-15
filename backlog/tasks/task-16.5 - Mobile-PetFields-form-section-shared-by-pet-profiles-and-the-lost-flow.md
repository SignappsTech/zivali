---
id: TASK-16.5
title: Mobile PetFields form section (shared by pet profiles and the lost flow)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 22:11'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-8.3
  - TASK-6.9
  - TASK-16.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P8-pet-profiles.md
  - docs/design/pages/P6-report-lost.md
parent_task_id: TASK-16
priority: high
ordinal: 156000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mobile lost flow and pet profiles share one form section (R-018).

## Packet

Unblocks on: Mobile UI kit: RN Reusables primitives styled to the design system, gallery screen merged (TASK-8.3); REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Pet profiles (P8) approved (TASK-16.2)
Design: P8 docs/design/pages/P8-pet-profiles.md (mockup docs/design/mockups/P8-pet-profiles.html; TASK-16.2)
Copy: docs/content/pages/P8-pet-profiles.md
Contracts: C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-16.5-petfields-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PetFields renders the same fields as web with react-hook-form and the zod schema, per P8, using RN Reusables components.
- [ ] #2 The chip field is equally prominent for dogs and cats, normalises input, warns on invalid numbers without blocking and notes that a vet or the responsible shelter can read the chip; the form asks 'Is the chip registered in CRHŽ with your current phone number?' (yes, no, don't know) with a reminder to update it at the vet, and cats also get ear tip and indoor or outdoor; there is no link to a public chip lookup.
- [ ] #3 Screen-reader labels, error announcements and 44 px targets are verified; component tests cover validation and chip warnings.
<!-- AC:END -->

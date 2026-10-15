---
id: TASK-16.4
title: Web PetFields form section (shared by pet profiles and the lost flow)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 22:39'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-8.2
  - TASK-6.9
  - TASK-16.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P8-pet-profiles.md
  - docs/design/pages/P6-report-lost.md
parent_task_id: TASK-16
priority: high
ordinal: 155000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The lost-report flow and pet profiles share one form section; building it first unblocks both and shortens the critical path (R-018).

## Packet

Unblocks on: Web UI kit: shadcn primitives styled to the design system, /dev/kit gallery merged (TASK-8.2); REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Pet profiles (P8) approved (TASK-16.2)
Design: P8 docs/design/pages/P8-pet-profiles.md (mockup docs/design/mockups/P8-pet-profiles.html; TASK-16.2)
Copy: docs/content/pages/P8-pet-profiles.md
Contracts: C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-16.4-petfields-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PetFields renders species, name, breeds (searchable, localised, Mixed/Unknown), colours, pattern, size, sex, birth year, chip number, collar and notes with react-hook-form and the zod schema, per P8.
- [x] #2 The chip field is equally prominent for dogs and cats, normalises input, warns on invalid numbers without blocking and notes that a vet or the responsible shelter can read the chip; the form asks 'Is the chip registered in CRHŽ with your current phone number?' (yes, no, don't know) with a reminder to update it at the vet, and cats also get ear tip and indoor or outdoor; there is no link to a public chip lookup.
- [ ] #3 Labels, hints and errors follow the design system; axe 0 violations on a test page; component tests cover validation and chip warnings.
<!-- AC:END -->

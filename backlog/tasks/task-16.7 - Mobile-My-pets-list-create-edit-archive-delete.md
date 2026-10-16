---
id: TASK-16.7
title: 'Mobile My pets: list, create, edit, archive, delete'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-16 02:04'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-16.5
  - TASK-14.3
  - TASK-9.4
  - TASK-16.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P8-pet-profiles.md
  - docs/tech/contracts/C5-photos-storage.md
parent_task_id: TASK-16
priority: high
ordinal: 158000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners manage pets mostly from their phones (FR-002).

## Packet

Unblocks on: Mobile PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.5); Mobile PhotoPicker: camera/gallery, resize, EXIF, drafts, upload with retry merged (TASK-14.3); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Design: Pet profiles (P8) approved (TASK-16.2)
Design: P8 docs/design/pages/P8-pet-profiles.md (mockup docs/design/mockups/P8-pet-profiles.html; TASK-16.2)
Copy: docs/content/pages/P8-pet-profiles.md
Contracts: C4, C5 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-16.7-pets-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Signed-in owners can create, view, edit, archive and delete pets with 1–5 photos from Profile → My pets, per P8; deletion asks for confirmation.
- [ ] #2 The chip is never shown outside the owner's own pet screens.
- [ ] #3 A free account adding a third pet sees the Premium option and can still report that pet lost with inline details (free limit 2).
- [ ] #4 Works in SL and EN; component tests cover the list and form states.
- [ ] #5 From the TASK-16.5 review (mobile PetFields): the breed search text is cleared on blur without a pick and when the species changes, so the input never shows an unsaved breed; breed rows are confirmed at 44pt (min-h-11).
<!-- AC:END -->

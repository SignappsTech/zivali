---
id: TASK-16.6
title: 'Web My pets: list, create, edit, archive, delete'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 22:42'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-16.4
  - TASK-14.2
  - TASK-9.3
  - TASK-16.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P8-pet-profiles.md
  - docs/tech/contracts/C5-photos-storage.md
parent_task_id: TASK-16
priority: high
ordinal: 157000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners who register pets in advance report a loss in seconds (FR-002).

## Packet

Unblocks on: Web PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.4); Web PhotoPicker: resize, EXIF read and strip, drafts, upload with retry merged (TASK-14.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Design: Pet profiles (P8) approved (TASK-16.2)
Design: P8 docs/design/pages/P8-pet-profiles.md (mockup docs/design/mockups/P8-pet-profiles.html; TASK-16.2)
Copy: docs/content/pages/P8-pet-profiles.md
Contracts: C4, C5 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-16.6-pets-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Signed-in owners see My pets and can create, view, edit, archive and delete pets with 1–5 photos, per P8; deletion asks for confirmation and removes the photos.
- [ ] #2 The chip is never shown outside the owner's own pet pages.
- [ ] #3 A free account adding a third pet sees the Premium option and a note that it can still report that pet lost with inline details (FR-002, free limit 2).
- [ ] #4 Works in SL and EN; axe 0 violations; Playwright covers create, edit and delete.
<!-- AC:END -->

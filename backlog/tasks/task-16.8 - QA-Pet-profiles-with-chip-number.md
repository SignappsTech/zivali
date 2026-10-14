---
id: TASK-16.8
title: 'QA: Pet profiles with chip number'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 23:38'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-16.3
  - TASK-16.4
  - TASK-16.5
  - TASK-16.6
  - TASK-16.7
  - TASK-16.1
  - TASK-16.2
references:
  - docs/tech/frontend.md
  - docs/design/pages/P8-pet-profiles.md
parent_task_id: TASK-16
priority: high
ordinal: 234000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-16 (Pet profiles with chip number) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Pets API: owner CRUD, chip rules incl. CRHŽ question, duplicate-chip flag, free limit merged (TASK-16.3); Web PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.4); Mobile PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.5); Web My pets: list, create, edit, archive, delete merged (TASK-16.6); Mobile My pets: list, create, edit, archive, delete merged (TASK-16.7); Image: empty state, no pets registered yet approved (TASK-16.1); Design: Pet profiles (P8) approved (TASK-16.2)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in owner, when they create a pet, then they can enter species (dog or cat), name, breeds, colours and pattern, size, sex, birth year, chip number, collar, 1-5 photos and notes (medication, temperament).
- [ ] #2 Given the My pets list, when opened, then the owner can view, edit, archive and delete pets and deletion removes the photos.
- [ ] #3 Given web and mobile, when the forms are used, then they work in SL and EN, meet WCAG 2.2 AA and expose a reusable PetFields section for the lost-report flow.
- [ ] #4 Given a free account, when adding pets, then up to 2 profiles can be saved (more needs Premium) and the limit never blocks reporting a lost pet (the report carries its own pet details).
- [ ] #5 Given a chip number, when entered, then it is normalised and validated (digits only, 9-15, 15-digit ISO 11784 expected) and a duplicate across owners is flagged to moderators without revealing the other owner; the chip field is equally prominent for dogs and cats, with a note that a vet or the responsible shelter can read the chip.
- [ ] #6 Given the pet form, when saved, then it asks Is the chip registered in CRHŽ with your current phone number? (yes, no, don't know) with a reminder to update it at the vet, and captures for cats the attributes ear tip (sterilised free-living cat) and indoor or outdoor.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

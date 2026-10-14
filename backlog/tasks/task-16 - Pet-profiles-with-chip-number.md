---
id: TASK-16
title: Pet profiles with chip number
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
updated_date: '2026-10-14 22:12'
labels:
  - story
  - 'req:FR-002'
milestone: m-1
dependencies:
  - TASK-9
  - TASK-14
  - TASK-6
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners who register pets in advance can report a loss in seconds and give matching a chip number and photos to work with; cats have no other register.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in owner, when they create a pet, then they can enter species (dog or cat), name, breeds, colours and pattern, size, sex, birth year, chip number, collar, 1-5 photos and notes (medication, temperament).
- [ ] #2 Given a chip number, when entered, then it is normalised and validated (digits only, 9-15, 15-digit ISO 11784 expected), a duplicate across owners is flagged to moderators without revealing the other owner, and dogs get a link to the official CRPsi lookup.
- [ ] #3 Given the My pets list, when opened, then the owner can view, edit, archive and delete pets and deletion removes the photos.
- [ ] #4 Given web and mobile, when the forms are used, then they work in SL and EN, meet WCAG 2.2 AA and expose a reusable PetFields section for the lost-report flow.
- [ ] #5 Given a free account, when adding pets, then up to 2 profiles can be saved (more needs Premium) and the limit never blocks reporting a lost pet (the report carries its own pet details).
<!-- AC:END -->

## Packet

Unblocks on: auth session contract (TASK-9); uploadPhoto API contract (TASK-14); pet schema (TASK-6)

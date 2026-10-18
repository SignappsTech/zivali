---
id: TASK-114.12
title: >-
  Lost report, pet step: "Enter details" looks like an action but only selects;
  skip the step without saved pets
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 15:05'
updated_date: '2026-10-18 02:37'
labels:
  - bug
  - fe
  - ux
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 361200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16 (screenshot, EN, dark): the first step "Which pet are you looking for?" shows a row "+ Enter details" with a check mark and a Next button. Clicking "Enter details" does nothing visible; the user still has to press Next. Misleading.

Code: apps/web/components/report-lost/lost-flow.tsx `PetStep`: a RadioGroup of the saved pets plus the new-pet option (`pet_enter` "Enter details" when there are no saved pets, `pet_other` otherwise); lost-form.ts `stepsFor` always starts with 'pet'. With no saved pets the only option is preselected, so the step asks nothing; the "+" icon reads as a button.

Fix:
1. No saved pets (or signed out): skip the pet step; the flow starts at the photos step with the new-pet path (progress bar without that segment). Keep `?pet=` deep links (from Moji ljubljenčki) as they are.
2. With saved pets: each row is a choice that moves on when chosen (buttons, one press: "Rex" continues with Rex, "Drug ljubljenček / Vnesi podatke" continues with the new-pet path), no separate Next on this step. Do not auto-advance a radio group on change (arrow keys would advance); use real buttons with the current selection marked when coming back.
3. Same on the mobile app's lost flow if it has the same step (follow-up task if it differs).
A bigger change to the step's layout would be a design rework: show the owner a component mock first (wireframe rule).

## Packet

Branch: agent/TASK-114.12-lost-pet-step
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Without saved pets the flow starts at the photo step; the progress bar shows the real number of steps
- [ ] #2 With saved pets, one press on a pet or on the new-pet row moves to the next step; the choice is kept and marked when going back; keyboard and screen-reader friendly (buttons, focus moves to the new step's heading)
- [ ] #3 Drafts and the hand-off (C3) still restore at the right step; unit and e2e tests (report-lost specs) updated; SL and EN
<!-- AC:END -->

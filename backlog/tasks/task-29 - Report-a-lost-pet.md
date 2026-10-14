---
id: TASK-29
title: Report a lost pet
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-14 23:08'
labels:
  - story
  - 'req:FR-005'
milestone: m-1
dependencies:
  - TASK-16
  - TASK-14
  - TASK-15
  - TASK-9
  - TASK-7
  - TASK-88
priority: high
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This is the entry point of the core loop; owners are panicked, so it must take minutes, work from a saved or new pet and immediately start matching and alerts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in owner, when they start a lost report, then they can pick a saved pet or enter pet details on the spot, set last-seen place and radius, date and time (default now), circumstances and contact preference (chat only by default).
- [ ] #2 Given a visitor without an account, when they reach submit, then the draft is kept and sign-up or sign-in completes the report without losing data.
- [ ] #3 Given a submitted report, when saved, then it appears on the map and list within a minute with fuzzed location, matching runs, nearby alerts fan out and the owner sees a confirmation with next steps (poster, share, tips).
- [ ] #4 Given the confirmation screen, when displayed, then it reserves a slot for the optional support contribution (FR-021), nothing is pre-selected, and no ad appears anywhere in the flow.
- [ ] #5 Given the flow, when it starts and when it is submitted, then report_lost_start and report_lost_submit fire with region and species only, and only with consent.
- [ ] #6 Given incomplete data, when the user submits, then errors are specific and localised and the form keeps their input.
- [ ] #7 Given a submitted lost report, when the confirmation shows, then a checklist offers a one-tap call to the responsible shelter from the directory and states the owner reporting duty (escape reported to a vet or the responsible shelter within 3 days; the nearest shelter within 72 h), never claiming the app replaces it; the legal timings appear only when the legal-content flag is on.
<!-- AC:END -->

## Packet

Unblocks on: responsible-shelter lookup contract (TASK-88); PetFields form section merged as the first PETS task (TASK-16); uploadPhoto API (TASK-14); LocationPicker API (TASK-15); session (TASK-9); track() (TASK-7)

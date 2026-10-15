---
id: TASK-30
title: Quick found or sighted report without an account
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-15 00:38'
labels:
  - story
  - 'req:FR-006'
milestone: m-1
dependencies:
  - TASK-14
  - TASK-15
  - TASK-17
  - TASK-7
  - TASK-88
priority: high
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finders will not register; conversion depends on a found report taking under 60 seconds on a phone (goal G-3).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor on a phone, when they open Report found, then a short sequence (photo, location pre-filled from GPS or EXIF, I have the animal or I only saw it, optional note, optional contact email) completes in under 60 s median in usability testing.
- [ ] #2 Given an accepted submission, when saved, then the report is live, the finder gets a private manage link (and an email if given) and matching and alerts run.
- [ ] #3 Given I have the animal, when published, then the public location is where it was found (fuzzed) and where it is kept is never asked for or shown.
- [ ] #4 Given a lost listing, when a visitor taps I saw this pet, then a SIGHTED report is created linked to that lost report.
- [ ] #5 Given anonymous submissions over the limits, when received, then the safeguards from the anonymous-reporter story apply and the user sees a friendly message.
- [ ] #6 Given the flow, when it starts and when it is submitted, then report_found_start and report_found_submit fire (consent only) and no ad appears anywhere in the flow.
- [ ] #7 Given a submitted found report, when the confirmation shows (after submit, so the 60 s target is unaffected), then a notice says the find should be reported to the responsible shelter within 24 hours with call buttons from the directory and that any vet or shelter can read the chip; the legal timing appears only when the legal-content flag is on, and the notice also shows once a queued offline report is sent.
- [ ] #8 Given the shelter row or call in the checklist, when the municipality is unconfirmed, then a suggested shelter shows as "Morda pristojno zavetišče" with a small "Ni potrjeno" note, else the nearest registered shelters by distance (max 2) with the same note; confirmed entries show normally (FR-044).
<!-- AC:END -->

## Packet

Unblocks on: responsible-shelter lookup contract (TASK-88); uploadPhoto API (TASK-14); LocationPicker API (TASK-15); anonymous submit endpoint and manage-token contract (TASK-17); track() (TASK-7)

---
id: TASK-30.3
title: Mobile quick found or sighted report (submits through the outbox)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 02:08'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-14.3
  - TASK-15.5
  - TASK-17.3
  - TASK-18.3
  - TASK-7.1
  - TASK-30.1
  - TASK-86.1
  - TASK-88.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
  - docs/design/pages/P7-report-found.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-30
priority: high
ordinal: 206000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finders report in the field, often offline or on a weak signal (FR-006, R-037.5).

## Packet

Unblocks on: Mobile PhotoPicker: camera/gallery, resize, EXIF, drafts, upload with retry merged (TASK-14.3); Mobile LocationPicker: GPS, pin, search, radius, permission fallback merged (TASK-15.5); Mobile anonymous session, captcha WebView and manage-link screen merged (TASK-17.3); Mobile report detail screen with slots merged (TASK-18.3); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1); Mobile outbox engine: queued found and sighting submissions sent once merged (TASK-86.1); Directory client in @zivali/api and useResponsibleShelter hook merged (TASK-88.3)
Design: P7 docs/design/pages/P7-report-found.md (mockup docs/design/mockups/P7-report-found.html; TASK-30.1)
Copy: docs/content/pages/P7-report-found.md
Contracts: C7, C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-30.3-found-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Report found follows the P7 sequence on mobile with GPS or EXIF location, have/saw choice, optional note and email; it never asks where the animal is kept.
- [ ] #2 Submit goes through submitReport() of the outbox (C17): online it sends at once and shows the success screen with the manage link; offline it shows "Waiting to send" and the original capture time is kept for matching.
- [ ] #3 Anonymous submission shows the manage link and stores the token securely; "I saw this pet" creates a linked SIGHTED report.
- [ ] #4 report_found_start and report_found_submit fire with consent only; no ad component in the flow.
- [ ] #5 After submit (so the 60 s target is unaffected) a notice says the find should be reported to the responsible shelter, with call buttons from the directory (C18), and that any vet or shelter can read the chip; the legal timing appears only when content.legal_timings is on, and the notice also shows when a queued offline report is sent.
<!-- AC:END -->

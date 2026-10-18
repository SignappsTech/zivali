---
id: TASK-41.1
title: 'Wireframe: AI pre-fill in the pet, lost and found forms (person approval gate)'
status: In Review
assignee:
  - '@design-lead'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-18 22:03'
labels:
  - design
  - wireframe
  - 'est:S'
milestone: m-2
dependencies: []
references:
  - docs/design/pages/P7-report-found.md§Flow
  - docs/design/pages/P6-report-lost.md§Flow
  - docs/design/pages/P8-pet-profiles.md§Add and edit
  - docs/tech/contracts/C19-ai-extraction.md§Client rules
parent_task_id: TASK-41
priority: high
ordinal: 377200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The pre-fill changes the photo and details steps of three forms, so per the owner rule (2026-10-16) a person-approved wireframe comes first. Low-fi, or a mock from our real components if that is no more work, in docs/design/wireframes/.

**Gate (owner rule 2026-10-16):** record the approval in this task's notes (who, date, version). No mockup or implementation task starts before it. A component mock that was approved also serves as the mockup.

## Packet

Unblocks on: - (no dependencies)
Review: the owner (or a person they name) approves; design-lead self-check against C19 §Client rules.
Branch: agent/task-41.1-ai-prefill-wireframe
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 docs/design/wireframes/M-ai-prefill.html covers the photo and details steps of P6 (new pet path), P7 and the P8 form, mobile and desktop, with the states: checking the photo, suggestions arrived (Suggested labels), low-confidence hint, notice (no animal, other animal, several animals), unavailable (nothing extra), and the user editing before a late suggestion
- [ ] #2 A person approved it; their name, the date and the approved version are in this task's notes
- [ ] #3 After approval, docs/design/pages/P7-report-found.md gets a section "AI suggestions" with the approved states (P6 and P8 point to it), so the FE packets are self-contained
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Wireframe: docs/design/wireframes/M-ai-prefill.html, TASK-41.1 v1, 2026-10-18. Status: awaiting owner approval. Agent reviews do not count as approval.

Frames (each Desktop 1440 and Mobile 390, light and dark):
F1 checking the photo (P7 step 1); F2 "Je to pravilno?" accept or edit (P7 step 2); F3 edit details with Predlog marks and the low-confidence hint (P7 step 2); F4 PetFields with suggestions (P8 web, P6 step 3); F5 edit and reject, species differs (P8); F6 late suggestion after the person started (P6 step 3); F7 check before saving (P6 review, P8 save); F8 notices: no animal, another animal, several animals (P7 step 1); F9 unavailable or failed (P7 step 2 manual); F10 no usable suggestion, one line or a hint per field (P6 step 3).

Design-lead self-check against C19 §Client rules: done (first photo only, 750 ms poll for at most 10 s; fill only empty and untouched fields; Predlog until edited or saved; value null gives the hint; mixed or unknown breed, never a guess; notice hint; a different species is a hint, never switched; one polite announcement; unavailable shows nothing). DOM check in both themes: no overflow, targets at least 44 px, contrast passes. Tokens identical to tokens.css.

Copy: report_found.ai_* from P7 content v0.6; all other strings are marked placeholders until TASK-40.6.

Questions for the owner: (1) filled and marked, or highlighted only until tapped; (2) confidence without numbers or levels; (3) F10: one line or a hint under every field; (4) breed in the found-flow sentence; (5) another animal: continue or stop the report; (6) several animals: crop tool in M3 or replace photo only; (7) check before saving: a non-blocking line, or confirm each field.

To do after approval: CHANGE rows for C19 §Client rules (fill only values valid for the chosen species; no fill with a notice; the one-line case if Q3 is answered so), then P7 §AI suggestions (AC #3).

Approval: pending. Record here who approved, the date and the version.

Lead, 2026-10-19: the wireframe (7780fd96) now uses the TASK-40.6 ai_prefill.* copy; the 'placeholder' wording above is out of date. Strings still to confirm: ai_prefill.info_body (owner + lawyer), report_found.ai_note (LQ-37); proposals without keys: 'Preveri predloge' and the P6 review-step note and row line. Awaiting owner approval.
<!-- SECTION:NOTES:END -->

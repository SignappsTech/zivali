---
id: TASK-41.5
title: 'Web: crop tool for form photos (react-image-crop), first photo checked again'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 10:45'
labels:
  - fe
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-41.1
  - TASK-41.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C19-ai-extraction.md§Crop
  - docs/design/wireframes/M-ai-prefill.html
  - docs/content/pages/P7-report-found.md§3a. AI pre-fill
parent_task_id: TASK-41
priority: high
ordinal: 414200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A photo with several animals, or a badly framed one, gets a crop tool in P6, P7 and P8 on the web, so the check and the matching see one animal (wireframe v2 F11 and F12; owner answer Q6 in TASK-41.1).

## Packet

Unblocks on: the owner's confirmation of wireframe v2 in the TASK-41.1 notes (who, date, version; the v1 approval does not cover the crop) and TASK-41.2 merged (it builds the pre-fill state and polling this task extends).
Design: docs/design/wireframes/M-ai-prefill.html F11 (crop tool, states touch and keys) and F12 (after the crop); entry points in F1 and F8.
Copy: docs/content/pages/P7-report-found.md §3a AI pre-fill, crop strings from CH-597; until their keys land, the F11/F12 proposals (SL and EN) under ai_prefill.crop_*.
Contracts: C19 §Crop and §Client rules; C5 §Client (preparePhoto, uploadPhoto); ADR-017 (react-image-crop row; this task adds it to apps/web/package.json).
Owns: apps/web/components/photos/use-photo-uploads.ts (adds replace) and the new crop dialog; the forms' pre-fill code comes from TASK-41.2 and is extended here.
Review: tech-lead code review and design-lead visual review against F11 and F12; run `pnpm verify` before reporting done.
Branch: agent/task-41.5-crop-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A crop button under every photo the form holds as a local file in P6, P7 and P8 (also with AI off), and 'Obreži fotografijo' in the multiple_animals note, open one crop dialog (full screen at phone width, 680 px dialog on desktop); a saved photo (SavedPhoto) has no crop button
- [ ] #2 Free frame with react-image-crop per F11: drag to move, corners and edges resize, rule-of-thirds lines, photo dimmed outside, no rotation or zoom; the frame stays inside the photo and never goes below 320 px on either side of the prepared image (C19 §Crop 2)
- [ ] #3 Keyboard and screen reader per F11: five tab stops (frame, four corners; edge handles hidden), arrows move or resize, Shift for bigger steps, Esc = Prekliči, focus kept in the dialog and returned to the photo's crop button; accessible names and the help line as the frame's description; axe clean in light and dark
- [ ] #4 Uporabi re-encodes the region through preparePhoto, puts the copy in the same slot and uploads it as a new photo; the original leaves like a removed photo (upload aborted, no API call); a whole-photo frame or a hash already in the form changes nothing; Prekliči changes nothing; nothing is saved before the form's own save; a draft restore brings back the copy
- [ ] #5 Cropping the first photo removes the notice, empties the fields still marked Predlog and polls the copy's attributes (750 ms, at most 10 s), so the new result fills them; fields the user changed or confirmed stay; one polite announcement 'Fotografija je obrezana.'; other slots are only replaced
- [ ] #6 Unit tests (crop rectangle and minimum, replace in usePhotoUploads, re-poll and field reset with the AI fixtures) and an e2e of a crop in the P7 flow on the mock API; react-image-crop added exactly as its ADR-017 row
<!-- AC:END -->

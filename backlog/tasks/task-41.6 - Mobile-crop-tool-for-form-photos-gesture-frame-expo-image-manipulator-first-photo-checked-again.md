---
id: TASK-41.6
title: >-
  Mobile: crop tool for form photos (gesture frame, expo-image-manipulator),
  first photo checked again
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 10:48'
labels:
  - fe
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-41.1
  - TASK-41.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C19-ai-extraction.md§Crop
  - docs/design/wireframes/M-ai-prefill.html
  - docs/content/pages/P7-report-found.md§3a. AI pre-fill
parent_task_id: TASK-41
priority: high
ordinal: 415200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A photo with several animals, or a badly framed one, gets a crop tool in P6, P7 and P8 in the app, so the check and the matching see one animal (wireframe v2 F11 and F12; owner answer Q6 in TASK-41.1).

## Packet

Unblocks on: the owner's confirmation of wireframe v2 in the TASK-41.1 notes (who, date, version; the v1 approval does not cover the crop) and TASK-41.3 merged (it builds the pre-fill state and polling this task extends).
Design: docs/design/wireframes/M-ai-prefill.html F11 (crop tool, Mobile 390 full screen) and F12 (after the crop); entry points in F1 and F8.
Copy: docs/content/pages/P7-report-found.md §3a AI pre-fill, crop strings from CH-597; until their keys land, the F11/F12 proposals (SL and EN) under ai_prefill.crop_*.
Contracts: C19 §Crop and §Client rules; C5 §Client (preparePhoto, uploadPhoto, outbox); ADR-017 mobile crop paragraph: no new package (react-native-gesture-handler, react-native-reanimated, expo-image-manipulator are already in), no new dev build.
Owns: apps/mobile/components/photos/use-photo-uploads.ts (adds replace) and the new crop screen; the forms' pre-fill code comes from TASK-41.3 and is extended here.
Review: tech-lead code review and design-lead visual review against F11 and F12 (screenshots from a dev build); run `pnpm verify` before reporting done.
Branch: agent/task-41.6-crop-mobile
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A crop button under every photo the form holds as a local file in P6, P7 and P8 (also with AI off), and 'Obreži fotografijo' in the multiple_animals note, open one full-screen crop view with Uporabi and Prekliči in the thumb zone; a saved photo (SavedPhoto) has no crop button
- [ ] #2 Frame drawn with react-native-gesture-handler and reanimated per F11: drag inside to move, four corners (44 px targets, drawn as brackets) and the edges resize, rule-of-thirds lines, photo dimmed outside, no rotation or zoom; it stays inside the photo and never goes below 320 px on either side of the prepared image (C19 §Crop 2); no new package
- [ ] #3 VoiceOver and TalkBack: the frame and each corner are accessibility elements with the copy's names and actions to move or resize them (10 % of the photo per action), the help line as their hint; Prekliči and the system back cancel; accessibility focus returns to the photo's crop button
- [ ] #4 Uporabi crops with expo-image-manipulator through preparePhoto (JPEG at most 1 MiB, new sha256), puts the copy in the same slot and uploads it as a new photo (a kept or offline photo: only the local file is replaced); the original leaves like a removed photo (no API call); a whole-photo frame or a hash already in the form changes nothing; nothing is saved before the form's own save
- [ ] #5 Cropping the first photo removes the notice, empties the fields still marked Predlog and polls the copy's attributes (750 ms, at most 10 s), so the new result fills them; fields the user changed or confirmed stay; one polite announcement 'Fotografija je obrezana.'; other slots are only replaced
- [ ] #6 Jest tests (crop rectangle and minimum, replace in usePhotoUploads, re-poll and field reset with the AI fixtures, the accessibility actions); a check on an iOS and an Android dev build is recorded in the task notes
<!-- AC:END -->

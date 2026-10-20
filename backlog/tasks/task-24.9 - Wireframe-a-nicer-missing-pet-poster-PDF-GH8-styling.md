---
id: TASK-24.9
title: 'Wireframe: a nicer missing-pet poster PDF (GH#8 styling)'
status: In Progress
assignee:
  - '@design-lead'
created_date: '2026-10-20 13:41'
updated_date: '2026-10-20 13:58'
labels:
  - design
  - 'est:S'
dependencies: []
references:
  - docs/design/system.md
parent_task_id: TASK-24
ordinal: 541200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub #8 styling part (tester, 2026-10-20), design rework (wireframe gate): make the missing-pet PDF poster more visually appealing and professional. Low-fi wireframe or a mock from the current poster template, A4 portrait, with and without photo, long name, SL and EN, in docs/design/wireframes/. Keep it printable in black and white, the QR code and the short code readable. The file-name part is TASK-24.8. No implementation until the owner approves (who, date, version in the notes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Wireframe in docs/design/wireframes/ for the poster (photo / no photo, long name, SL/EN) that also prints legibly in greyscale
- [ ] #2 Owner approval recorded in the notes before any implementation task starts
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
docs/design/wireframes/P18-poster.html: v1 ready for owner review (2026-10-20). WAITING FOR OWNER APPROVAL: not approved yet; no mockup or poster code change until the approval (who, date, version) is recorded here.
- Component mock from the current poster (apps/web/lib/poster-pdf.ts as built, TASK-24.2): same zones and sizes (photo 114 mm wide, QR 56 mm with a 4-module quiet zone, no contact data), print tokens only (ink, paper, one mid-grey), current poster.* strings (no new keys; the call to action is split at the first '? ', facts at ': ').
- Sheets: S1 today (as built) for comparison; proposed S2 lost dog SL photo reward (numbered changes), S3 lost dog EN no reward, S4 lost dog SL no photo (description card), S5 lost cat EN long name and reward, S6 found cat SL no name, S7 home again SL. Toggles: band solid or outline, greyscale, photocopy. Printing the page gives the seven sheets one per A4 page; each caption reports the photo height and whether the page fits the safe area (all fit, checked with the brand fonts).
- Owner questions (top of the file): 1 replace today's poster with S2-S7; 2 band solid ink (rec.) or outline; 3 allow posters without a photo with the description card (rec. yes; changes the P18 'No good photo' state); 4 band word in capitals; 5 'najdimo.si' at the footer's right edge.
- File name part stays TASK-24.8.
<!-- SECTION:NOTES:END -->

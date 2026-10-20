---
id: TASK-24.10
title: 'Poster PDF restyle per the approved wireframe P18-poster v1, sheet S2 (GH#8)'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 15:28'
updated_date: '2026-10-20 15:56'
labels:
  - fe
  - 'est:M'
dependencies:
  - TASK-24.9
references:
  - docs/design/wireframes/P18-poster.html
  - docs/design/pages/P18-poster-share.md
parent_task_id: TASK-24
priority: high
ordinal: 544200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner approved 2026-10-20 (TASK-24.9 notes): restyle the missing-pet poster PDF renderer to match docs/design/wireframes/P18-poster.html v1, sheet S2 (and its SL/EN, long-name and found/home variants S3, S5, S6, S7, which follow the same rules): solid ink top band (186x28 mm, 3 mm corners) with the status word in paper colour, Bricolage 800 capitals 64 pt shrinking to 40 pt; photo 114 mm wide, 4 mm corners, cropped from the top; the scan column and footer as numbered on S2, najdimo.si on the footer's right edge; QR 56 mm with its quiet zone; A4 safe area 12 mm; prints legibly in greyscale. Posters without a photo stay blocked as today (S4 not approved). No new message keys (the wireframe says none are needed). The PDF file name rule of TASK-24.8 stays.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The generated poster PDF matches S2 (band, photo crop, scan column, footer) for a lost report in SL and EN, and the long-name and found/home variants fit the A4 safe area (route/unit test on the layout numbers; one rendered-PDF check)
- [x] #2 QR still scans and keeps a 56 mm size with its quiet zone; greyscale print stays legible (contrast of band text >= 4.5:1)
- [x] #3 No photo still blocks the download as today; file name unchanged from TASK-24.8
<!-- AC:END -->

## Packet

Branch: agent/TASK-24.10-poster-s2

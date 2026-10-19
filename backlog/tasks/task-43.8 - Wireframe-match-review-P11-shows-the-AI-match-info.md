---
id: TASK-43.8
title: 'Wireframe: match review (P11) shows the AI match info'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-19 18:16'
updated_date: '2026-10-19 18:36'
labels:
  - design
  - 'est:S'
  - web
dependencies: []
references:
  - docs/design/pages/P11-match-review.md§Review screen
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C20-image-embeddings.md
  - docs/design/wireframes/M-ai-prefill.html
parent_task_id: TASK-43
priority: high
ordinal: 432200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner asked 2026-10-19: show the AI match info on the comparison page. Today (TASK-43.4) the review screen shows a three-band 'photos are similar' reason, a caveat and the most similar photo first. This wireframe proposes the fuller view. Owner rule: design reworks need a person-approved wireframe first; record the approval (who, date, version) in this task's notes. Web only.

## Packet
Unblocks on: -
Branch: agent/task-43-wireframe-ai-match-info
Privacy: the AI attributes of the other report's photo are a new use; list it as an open question (content-strategist CHANGE for the privacy text if the owner picks it).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Low-fi wireframe docs/design/wireframes/P11-match-ai.html (or a mock from our real components if no more work), 390 and 1200, built on the review screen as live after TASK-43.4
- [x] #2 Shows (1) a 'Zakaj ta predlog?' breakdown: every factor with its strength (chip, species, colours, size, distance in km, time between reports, photo similarity)
- [x] #3 Shows (2) what the AI saw on each photo side by side (species, breed, colours, with confidence), only for photos that have a clean AI result; marked as AI suggestions that can be wrong
- [x] #4 Shows (3) photo similarity in two variants for the owner to pick: three bands (today) vs a percentage; with the caveat that it is not the chance it is the same animal
- [x] #5 States: no vectors (old photos), only one side has AI data, chip match, low-signal match; nothing shown that the other party's report does not already show publicly; open questions listed at the top
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Wireframe v1 (2026-10-19, design-lead): docs/design/wireframes/P11-match-ai.html, 390 and 1200, component mock in the M-ai-prefill style, SL copy (proposals, no keys yet). Frames: F1 full match, F2 AI panel (+ 'Kako to deluje?' open), F3 old photos / no vectors, F4 only one side has AI data, F5 chip match (found, sighting), F6 weak match (few attributes, mainly photos). Global switches: Q2 photo similarity A bands (as live) / B percentage; Q1 AI data of the other photo A both / B mine only.
Open questions for the owner (top of the wireframe): Q1 privacy, show the AI result of the finder's photo (recommended B: only own photo, other column = public report); Q2 bands vs percentage (recommended A: bands); Q3 breakdown replaces reason list + facts table (recommended one table); Q4 per-factor strength words; Q5 AI panel closed at phone width; Q6 weak-match note.
CHANGEs to file after the answers (listed in the wireframe, none filed yet): tech-lead C8 a) 'compared, below 0.25' vs 'not compared', b) V in the visual reason (Q2=B), c) pattern in other, d) factor strength mapping in @zivali/validation/matching, e) AI result per shown photo on the match read (other side only if Q1=A); content strategist f) P11 copy keys, g) privacy text + lawyer (Q1=A).
Approval: PENDING. Not approved; record who, date and version here when the owner answers. No mockup or implementation before that.
<!-- SECTION:NOTES:END -->

---
id: TASK-43.8
title: 'Wireframe: match review (P11) shows the AI match info'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-19 18:16'
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
- [ ] #1 Low-fi wireframe docs/design/wireframes/P11-match-ai.html (or a mock from our real components if no more work), 390 and 1200, built on the review screen as live after TASK-43.4
- [ ] #2 Shows (1) a 'Zakaj ta predlog?' breakdown: every factor with its strength (chip, species, colours, size, distance in km, time between reports, photo similarity)
- [ ] #3 Shows (2) what the AI saw on each photo side by side (species, breed, colours, with confidence), only for photos that have a clean AI result; marked as AI suggestions that can be wrong
- [ ] #4 Shows (3) photo similarity in two variants for the owner to pick: three bands (today) vs a percentage; with the caveat that it is not the chance it is the same animal
- [ ] #5 States: no vectors (old photos), only one side has AI data, chip match, low-signal match; nothing shown that the other party's report does not already show publicly; open questions listed at the top
<!-- AC:END -->

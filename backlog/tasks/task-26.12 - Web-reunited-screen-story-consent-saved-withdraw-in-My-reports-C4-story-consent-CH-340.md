---
id: TASK-26.12
title: >-
  Web reunited screen: story consent saved, withdraw in My reports (C4
  story-consent; CH-340)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:35'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-26.11
  - TASK-26.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md§REST
  - docs/design/pages/P14-reunited.md
  - docs/content/pages/P14-reunited.md
parent_task_id: TASK-26
priority: medium
ordinal: 495200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The P14 story switch is not on the web yet (mobile keeps it on-screen only). It saves through the new endpoint and can be withdrawn.

## Packet
Unblocks on: TASK-26.11 (PUT /v1/reports/:code/story-consent) merged; design TASK-26.2 done
Branch: agent/task-26.12-web-story-consent
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The reunited screen shows the story switch (off by default, P14 §Reunited screen); turning it on calls PUT story-consent `{ consent: true }`; a failure shows the error toast and the switch returns to off
- [ ] #2 My reports shows the consent on a reunited lost report with a withdraw action (`{ consent: false }`)
- [ ] #3 Copy from the lifecycle `story_*` keys (final help text and toast follow CH-349); component tests
<!-- AC:END -->

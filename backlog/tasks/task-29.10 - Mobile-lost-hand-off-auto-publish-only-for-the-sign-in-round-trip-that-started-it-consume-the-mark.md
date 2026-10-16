---
id: TASK-29.10
title: >-
  Mobile lost hand-off: auto-publish only for the sign-in round trip that
  started it; consume the mark
status: Done
assignee: []
created_date: '2026-10-16 06:38'
updated_date: '2026-10-16 08:56'
labels:
  - bug
  - mobile
dependencies: []
parent_task_id: TASK-29
priority: high
ordinal: 349000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-29.4 web review (blocker on web): a hand-off mark that is not tied to the sign-in round trip lets any account that signs in on a shared device within the window auto-publish someone else's marked draft without a confirm, and a mark that is never consumed re-publishes on every visit (after a lost NETWORK response, a second report under a new key). Check the mobile hand-off (TASK-29.6, apps/mobile/components/report-lost/*) for both and mirror the web fix once TASK-29.4's fix round lands (nonce in the draft, matched on return, else the resume prompt; clear the mark before publishing; resolve relative times against the press time).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A marked draft with a different or missing round-trip nonce shows the resume prompt and sends nothing; the mark is cleared before the publish starts, so a reload never publishes again (jest tests, full mobile suite green)
<!-- AC:END -->

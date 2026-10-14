---
id: TASK-17
title: Anonymous reporter safeguards and manage link
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-006'
  - 'req:NFR-SEC'
milestone: m-1
dependencies:
  - TASK-6
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Anonymous found reports (Q-003 default) bring spam and scam risk, yet reporters still need to chat and close their report without signing up.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an anonymous submission, when received, then it needs a valid captcha token (privacy-friendly provider chosen in the TDD) and is rate limited per IP and device (default 5 per hour, 20 per day, configurable) with a friendly error.
- [ ] #2 Given a created report, when the finder returns through the secret manage link (high entropy, invalid after close), then they can edit, close or mark returned and open chat on any device without an account.
- [ ] #3 Given the anonymous finder, when they chat, then they act through an anonymous session bound to the report and can later claim it by creating an account.
- [ ] #4 Given other stories, when they need it, then the anonymous submit endpoint, token model and RLS rules are documented as a contract slice.
- [ ] #5 Given abuse patterns (many reports from one device, identical photo hash), when detected, then reports are held for moderation instead of published.
<!-- AC:END -->

## Packet

Unblocks on: reports and anonymous identity schema plus RLS pattern merged (TASK-6)

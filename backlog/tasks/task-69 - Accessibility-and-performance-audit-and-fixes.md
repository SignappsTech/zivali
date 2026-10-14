---
id: TASK-69
title: Accessibility and performance audit and fixes
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:NFR-A11Y'
  - 'req:NFR-PERF'
  - 'req:NFR-BROWSER'
milestone: m-4
dependencies:
  - TASK-39
  - TASK-45
  - TASK-62
  - TASK-36
priority: high
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
EAA compliance is a legal requirement and stressed outdoor users depend on it; a formal audit of the key flows catches what component-level checks miss.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the key flows (report lost and found, map and list, match review, chat, consent, shelter portal, admin tables), when audited, then there are no WCAG 2.2 AA failures (axe plus manual keyboard and screen reader checks with VoiceOver and TalkBack).
- [ ] #2 Given Lighthouse on home, detail, map and partners pages (mobile profile), when run, then performance is at least 90 (map at least 80), accessibility at least 95 and LCP under 2.5 s.
- [ ] #3 Given the latest 2 versions of Chrome, Edge, Firefox and Safari plus iOS and Android devices, when spot checked, then no blocking defects remain.
- [ ] #4 Given the results, when documented, then the input for the accessibility statement lists conformance, known gaps and a feedback channel.
- [ ] #5 Given reduced motion and 200 percent zoom, when used, then layouts remain usable.
<!-- AC:END -->

## Packet

Unblocks on: core loop complete (TASK-39); portal (TASK-45); admin queue (TASK-62); ad placements (TASK-36)

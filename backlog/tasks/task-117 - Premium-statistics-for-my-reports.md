---
id: TASK-117
title: 'Premium: statistics for my reports'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-19 14:34'
labels:
  - story
  - 'req:FR-026'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-18
  - TASK-23
  - TASK-24
  - TASK-44
priority: medium
ordinal: 421200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners want to know their report reaches people: Premium shows views, shares and alerts sent (reach) for their own reports (owner 2026-10-19). Counting is aggregate and cookieless, organisations get it free, and nothing changes for free owners.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium owner, when they open Statistics on a report they created (any type, open or closed), then views, shares by channel and alerts sent by channel show as totals and per day since creation, at most 1 h behind, with a table alternative to every chart.
- [ ] #2 Given a free owner, when they open their report, then everything it showed before is unchanged and the only statistics entry is one quiet Premium link (none in the report flows, no pop-up).
- [ ] #3 Given anyone opens a public listing on web or app, when the view is counted, then only an aggregate per report and day is stored, with no user identifier, cookie or device storage, and views by the owner, organisation members, moderators and known bots are not counted.
- [ ] #4 Given a boosted report, when its statistics show, then alerts sent during the Boost are marked as Boost reach; on-device proximity alerts are not counted and the view says so.
- [ ] #5 Given a shelter or municipality report, when a member opens its statistics in the portal, then they show with no entitlement check or upgrade prompt.
- [ ] #6 Given Premium lapses, when the period ends, then the view locks, counting continues and the history is back on resubscribing.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); owner report page on the detail model (TASK-18); nearby-alert fan-out and the notification log per channel (TASK-23, C10); share actions and poster download (TASK-24); organisation membership and roles (TASK-44)

Wireframe gate: TASK-117.1 (person-approved wireframe) before any mockup or implementation task. Counters and the stats endpoint: new C-contract (CHANGE to the tech lead). Privacy: R-026.6, NFR-PRIV. Labels: CHANGE to the content strategist.

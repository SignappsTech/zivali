---
id: TASK-49
title: Chip lookup for shelters and vets
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 23:08'
labels:
  - story
  - 'req:FR-016'
milestone: m-2
dependencies:
  - TASK-44
  - TASK-6
  - TASK-19
priority: high
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters and vets scan chips daily; a lookup that notifies the owner without exposing personal data, or points to the official register, makes us the cat register in practice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a chip on an open lost report, when looked up, then the owner receives an immediate alert that their pet may be at the organisation and chat opens on their confirmation.
- [ ] #2 Given enumeration abuse, when a member exceeds the limit (default 30 lookups per hour), then lookups are throttled and logged, and non-members cannot use the lookup.
- [ ] #3 Given any lookup, when performed, then an audit entry (organisation, user, chip hash, time) is stored without the plain chip number.
- [ ] #4 Given the response, when displayed, then it never contains owner name, contact or address.
- [ ] #5 Given a verified organisation member, when they enter a chip number, then it is normalised and validated and the result is either registered with us (owner notified, nothing personal shown) or not found, in which case the screen says a vet or the responsible shelter reads the chip and registry data (CRHŽ); a public register lookup link exists only behind a config flag, off by default.
<!-- AC:END -->

## Packet

Unblocks on: organisation role guard (TASK-44); chip normalisation util (TASK-6); notification of chip matches (TASK-19)

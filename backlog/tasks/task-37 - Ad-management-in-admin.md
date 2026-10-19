---
id: TASK-37
title: Ad management in admin
status: Done
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-19 19:49'
labels:
  - story
  - 'req:FR-031'
milestone: m-1
dependencies:
  - TASK-35
  - TASK-34
priority: high
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
There is no self-serve yet: the client or an admin books sponsors by hand, so admins must create, schedule, target and report on ads themselves.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an admin, when they create an ad, then they can upload an image and set title, text, link, language, slots, region or municipality, species, start and end dates and status (draft, active, paused) with a live preview per slot.
- [ ] #2 Given validation, when saving, then missing alt text, non-https links, wrong image size or overlapping dates in an exclusive slot are rejected with clear errors.
- [ ] #3 Given an ad, when its detail is opened, then impressions, clicks and CTR per day, slot and region are shown with CSV export for sponsor reports.
- [ ] #4 Given house ads, when managed, then admins can edit and enable the three default house ads (SL and EN) from the public copy story.
- [ ] #5 Given any edit or status change, when saved, then it is written to the audit log.
- [ ] #6 Given validation, when an ad is saved, then it is rejected if it advertises the sale, gift or change of ownership of animals.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Lead: closed after its QA pass; all child tasks Done.
<!-- SECTION:NOTES:END -->

## Packet

Unblocks on: ads CRUD and stats contract (TASK-35); admin layout and audit log (TASK-34)

---
id: TASK-13
title: Consent banner and preferences (web and mobile)
status: Done
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:01'
updated_date: '2026-10-19 19:49'
labels:
  - story
  - 'req:FR-039'
  - 'req:NFR-PRIV'
milestone: m-0
dependencies:
  - TASK-11
  - TASK-12
  - TASK-7
  - TASK-2
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
EU law requires opt-in before analytics; a clear, accessible banner with equal-weight Accept and Reject and an easy way to change the choice protects users and lets GA4 model data when consent is declined.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a first web visit or first mobile launch, when the page or app loads, then a banner or sheet in the user language offers Accept all, Reject all and Customise with equal visual weight and nothing pre-selected.
- [ ] #2 Given the user rejects or ignores the banner, when browsing, then only strictly necessary storage is used and Consent Mode signals stay denied.
- [ ] #3 Given the user accepts, when the choice is stored, then the record holds choice, version and timestamp, applies to analytics adapters at once and persists across sessions.
- [ ] #4 Given any page or the app settings, when the user opens Cookie settings, then they can change or withdraw consent as easily as they gave it.
- [ ] #5 Given keyboard and screen reader use, when the banner appears, then it is labelled, focus-managed and meets WCAG 2.2 AA.
- [ ] #6 Given the consent version changes (new vendor or purpose) or 12 months pass, when the user returns, then consent is requested again.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Lead: closed after its QA pass; all child tasks Done.
<!-- SECTION:NOTES:END -->

## Packet

Unblocks on: footer slot and app settings screen (TASK-11, TASK-12); consent state API and Consent Mode wiring (TASK-7); approved banner copy (TASK-2)

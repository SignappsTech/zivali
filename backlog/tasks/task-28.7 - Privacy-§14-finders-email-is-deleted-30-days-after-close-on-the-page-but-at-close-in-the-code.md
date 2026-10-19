---
id: TASK-28.7
title: >-
  Privacy §14: finder's email is deleted 30 days after close on the page but at
  close in the code
status: Done
assignee:
  - '@content-strategist'
created_date: '2026-10-19 20:28'
updated_date: '2026-10-19 20:51'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: low
ordinal: 464200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: read /zasebnost and /en/privacy §14 (row "E-naslov najditelja za zasebno povezavo" / "Finder's email address for the private link"), then apps/api/domains/reports/lifecycle.domain.ts close(), markReunited() and expire() (ReportsDao.deleteContacts) and apps/api/prisma/data-inventory.json "report_contacts".
Expected: the page, the master and the code state one rule.
Actual: the live page and the master (docs/content/legal/privacy-policy.md, SL row line 304, EN row line 625) say "deleted 30 days after the report closes"; the code and the data inventory delete report_contacts at close, reunite or expiry, in the same transaction (C7). The policy states a longer retention than the service applies.
Fix: e.g. "deleted when the report closes, is marked reunited or expires" in the master and both MDX files (or the lead picks the 30-day rule and the code changes; then file a CHANGE).
Severity: low.

## Packet

Unblocks on: -
Branch: agent/task-28.7-finder-email-retention from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Privacy §14 (master, SL and EN MDX) gives the same deletion point for the finder's email as the code (report_contacts deleted at close, reunite or expiry)
<!-- AC:END -->

---
id: TASK-47
title: CSV import for shelters
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-015'
milestone: m-2
dependencies:
  - TASK-44
  - TASK-6
priority: medium
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters with existing software export spreadsheets; a validated CSV import avoids retyping and reuses the intake contract of the bulk upload.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the portal, when the user downloads the template, then a CSV (SL and EN headers) with chip, species, breed, colours, sex, intake date, found location (address or coordinates), photo URL and notes is provided.
- [ ] #2 Given an uploaded CSV, when parsed, then a dry run shows valid rows, warnings and errors per line (row, field, message) before anything is saved.
- [ ] #3 Given a confirmed import, when run, then valid rows become FOUND reports for the organisation, photo URLs are fetched safely (https only, size and type limits, SSRF-safe) and a result report is downloadable.
- [ ] #4 Given a text-only address, when imported, then it is geocoded to an area within Slovenia and unresolved rows are flagged.
- [ ] #5 Given a file above 500 rows or 5 MB, when uploaded, then it is rejected with a message to split it.
<!-- AC:END -->

## Packet

Unblocks on: organisation guard (TASK-44); intake batch contract shared with bulk upload (TASK-6)

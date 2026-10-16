---
id: TASK-114.7
title: Poster PDF and square image file names carry the language
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 14:15'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
parent_task_id: TASK-114
priority: medium
ordinal: 360700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16: the generated poster PDF should have the language in its file name, so both the Slovenian and the English poster can be downloaded (today the second one overwrites the first or lands as "(1)").

Code: apps/web/lib/poster-link.ts `posterFileName(code)` returns `najdimo-<code>.pdf` for both languages, although the routes take `?lang=` (`posterPath`, `squarePath`). The same applies to the 1080 × 1080 Facebook image: apps/web/app/r/[code]/square.png/route.tsx and the share options (components/report/slots/slot-b.tsx, components/report-lost/lost-done.tsx `imageName: najdimo-<code>.png`).

Wanted: `najdimo-<code>-sl.pdf` / `najdimo-<code>-en.pdf` (and the same for the .png), in the Content-Disposition of both routes and in the client download names. Keep content P18 §1: no pet name in the file name.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The poster PDF downloads as najdimo-<code>-sl.pdf or najdimo-<code>-en.pdf per the chosen language; the square image likewise (.png)
- [ ] #2 Downloading both languages one after the other gives two distinct files
- [ ] #3 Unit tests for the names; e2e poster spec ("downloads najdimo-Rex12345.pdf") updated
<!-- AC:END -->

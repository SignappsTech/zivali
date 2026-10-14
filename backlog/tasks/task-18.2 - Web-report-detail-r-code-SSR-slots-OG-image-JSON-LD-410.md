---
id: TASK-18.2
title: 'Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-15.2
  - TASK-6.9
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P9-report-detail.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-18
priority: high
ordinal: 163000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every other story links to or acts from one listing page, and it is what Google and WhatsApp previews show (FR-007).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Web MapView: MapLibre + OpenFreeMap, markers, clusters, areas, list alternative merged (TASK-15.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Report detail (lost, found, sighted) (P9) approved (TASK-18.1)
Design: P9 docs/design/pages/P9-report-detail.md (mockup docs/design/mockups/P9-report-detail.html; TASK-18.1)
Copy: docs/content/pages/P9-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C4, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-18.2-detail-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /r/[code] and /en/r/[code] are server-rendered from get_public_report with photos, species, breed, colours, size, sex, chip-on-file indicator (never the number), date and time, the fuzzed area map, status and circumstances, per P9.
- [ ] #2 Named ReportSlot placeholders (contact, share, poster, report-abuse, owner-actions, ad, matches-link, sighting) render from components/report/slots/<name>.tsx so later tasks fill them without layout changes.
- [ ] #3 Title, description, Open Graph image (photo and type label, no location) and JSON-LD are present; hidden, removed and long-closed reports return the 410 page with noindex.
- [ ] #4 Content and meta are localised in SL and EN; Lighthouse performance ≥ 90 and SEO ≥ 95 on a seeded detail page; axe 0 violations.
<!-- AC:END -->

---
id: TASK-27.4
title: 'House ads seeded with placeholder copy, not the final P21 creatives'
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-16 04:55'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-27
ordinal: 345000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: read apps/api/prisma/seeders/30-commerce.seeder.ts houseAds (marked PLACEHOLDER COPY). Expected (TASK-27 AC#2): final creatives from P21 §3, e.g. SL supporter title 'Pomagajte ohraniti iskanje brezplačno', CTA 'Kako pomagati', link /o-nas#financiranje; partner 'Vaša ambulanta ali trgovina na tem mestu?'; adopt text 'Psi in mačke v zavetiščih čakajo na nov dom. Morda prav na vašega.' Actual: seeded copy differs ('Podprite Najdimo', 'Oglašujte pri nas', alt texts differ from the slice), supporter links to /o-nas without the anchor. Severity: Low (copy only; seeder is idempotent and never overwrites, so existing rows also need an admin edit or migration).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The three house ads (supporter, partner, adopt) in SL and EN seeded in every environment use the final copy of docs/content/pages/P21-ad-slots.md §3 (title, text, CTA, alt), with the slice links
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-16 (lead): filed from the QA content agent's salvaged file. The pilot DB on najdimo.si already holds the placeholder rows (the seeder never overwrites), so on the pilot the final copy goes in through /admin/oglasi (docs/tech/pilot-runbook.md §3); the seeder fix covers new environments.
<!-- SECTION:NOTES:END -->

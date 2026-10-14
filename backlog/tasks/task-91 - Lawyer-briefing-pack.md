---
id: TASK-91
title: Lawyer briefing pack
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-14 23:17'
labels:
  - story
  - 'req:FR-045'
  - 'req:NFR-PRIV'
  - 'req:FR-035'
milestone: m-4
dependencies: []
priority: high
ordinal: 275000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
One document (docs/legal/lawyer-briefing.md) a Slovenian lawyer can review quickly; sent early for lead time (Q-013).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the product, when the briefing is read, then it explains what the app does and the legally relevant features: anonymous found reports, location blurring, on-device geofencing, AI photo analysis, chat, payments (Boost, Premium, tips), reward escrow, ads and Vet Partner, shelter data uploads
- [ ] #2 Given the briefing, when a lawyer checks data flows, then it lists every processor with location (Supabase EU, Hetzner, Cloudflare R2, Stripe, Anthropic, Voyage, Brevo, Google/GA4/Firebase, Expo) and the data each receives
- [ ] #3 Given docs/content/legal/, when the briefing is read, then it links every legal draft
- [ ] #4 Given docs/content legal notes, docs/discovery/regulatory.md and risks R-0xx, when consolidated, then every open legal question appears once with our proposed answer
- [ ] #5 Given the briefing, when reviewed, then it contains a DPIA outline, a draft retention table and a processor-agreement (DPA) checklist
- [ ] #6 Given the briefing, when reviewed by the client, then the decisions the client must make are listed and the document is marked not legal advice, for lawyer review
<!-- AC:END -->

## Packet

Unblocks on: nothing (start now; lawyer needs lead time). Draft legal pages (docs/content/legal/) and discovery/regulatory.md are inputs; the briefing is refreshed as features change. Unblocks TASK-71 (final legal pages need the lawyer's answers).

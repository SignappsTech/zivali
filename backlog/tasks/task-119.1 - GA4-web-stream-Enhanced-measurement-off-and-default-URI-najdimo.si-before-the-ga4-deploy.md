---
id: TASK-119.1
title: >-
  GA4 web stream: Enhanced measurement off and default URI najdimo.si (before
  the ga4 deploy)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 23:50'
labels:
  - tech
  - 'est:XS'
milestone: m-1
dependencies: []
references:
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§8. GA4 property config
    (admin client; TASK-119 GA4 tasks)
  - docs/tech/contracts/C12-analytics-consent.md§GA4 property checklist
parent_task_id: TASK-119
priority: high
ordinal: 512200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
URGENT, before the next deploy that ships provider ga4 (repo variables set 2026-10-20, TASK-7.5). Read-only check on 2026-10-20: web stream G-PKY4SCX3RL (stream 16130765671) has Enhanced measurement ON with every toggle (page changes, site search q,s,search,query,keyword, outbound clicks, form interactions, file downloads, scrolls, video) and defaultUri https://test.com. With gtag live that sends history page views with real URLs (short codes), site-search text, outbound and form URLs, against C12. Fix with the GA admin client: node <project root>/.secrets/ga-admin.mjs <project root> PATCH <url> <json> (never print key material, never copy .secrets), then GET to verify and paste the GET output into the task notes.

Steps:
1. PATCH https://analyticsadmin.googleapis.com/v1alpha/properties/559038055/dataStreams/16130765671/enhancedMeasurementSettings?updateMask=streamEnabled with {"streamEnabled": false}
2. PATCH {PROPERTY}/dataStreams/16130765671?updateMask=webStreamData.defaultUri with {"webStreamData":{"defaultUri":"https://najdimo.si"}}
3. GET both, and dataRedactionSettings (emailRedactionEnabled stays true).

No code change. If the lead already did it inline, verify with the GETs and close.

## Packet
Unblocks on: - (ready now; TASK-7.5 waits on it)
Branch: - (no repo change; notes only)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET enhancedMeasurementSettings for stream 16130765671 returns streamEnabled false
- [ ] #2 GET the web stream returns webStreamData.defaultUri https://najdimo.si; dataRedactionSettings still has emailRedactionEnabled true
- [ ] #3 The GET outputs (no key material) and the date are in the task notes; the lead is told the ga4 deploy may go ahead
<!-- AC:END -->

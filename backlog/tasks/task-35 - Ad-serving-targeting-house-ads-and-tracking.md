---
id: TASK-35
title: 'Ad serving, targeting, house ads and tracking'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-14 23:08'
labels:
  - story
  - 'req:FR-029'
milestone: m-1
dependencies:
  - TASK-6
priority: high
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The client needs to pitch sponsors as soon as users exist; a cheap, privacy-safe serving core with fixed slots, region and species targeting, house-ad fallback and per-ad counts is the foundation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the slot registry (feed every N cards, lost-pet detail, reunited screen, web sidebar), when a client requests an ad for a slot with context (region, species, language), then the server returns the best active ad whose dates, region or municipality and species match, rotating fairly between several matches.
- [ ] #2 Given no sponsored ad matches, when a slot is requested, then a house ad (become a supporter, partner with us, adopt) is returned so a slot is never empty in the pilot.
- [ ] #3 Given the report-lost and report-found flows, when ads are requested for them, then the API refuses (no such slots exist) and a test enforces it.
- [ ] #4 Given impressions and clicks, when counted, then they are aggregated per ad, slot, day and region in our DB without user identifiers, cookies or device storage, clicks go through a counting redirect with rel sponsored, and this DB is the source of truth for sponsor reports.
- [ ] #5 Given targeting, when regions are used, then Slovenian statistical regions and municipalities (open data, licence checked) are loaded as reference data and a point maps to its region and municipality.
- [ ] #6 Given an ad record, when stored, then it has an image with required alt text, title, text, https link, language, dates, status and targeting, and only admins can write.
- [ ] #7 Given a request whose context marks the user as ad-free (active Premium entitlement), when a slot is requested, then no ad and no house ad is returned; Podpornik supporters are not ad-free.
- [ ] #8 Given an ad or house ad request, when content is checked, then ads selling, giving away or rehoming animals are not allowed (blocklist of categories and keywords, since the ad-space provider must verify marking data for pet ads).
<!-- AC:END -->

## Packet

Unblocks on: ads, slots and events schema merged (TASK-6)

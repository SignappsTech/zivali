---
id: TASK-35.3
title: 'QA: Ad serving, targeting, house ads and tracking'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 04:52'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-35.1
  - TASK-35.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-35
priority: high
ordinal: 253000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-35 (Ad serving, targeting, house ads and tracking) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Ad serving API: slot endpoint, targeting and rotation, house ads, impressions, no animal-sale ads merged (TASK-35.1); Ad click endpoint GET /v1/ads/:id/click (counting redirect, no open redirect) merged (TASK-35.2)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given the slot registry (feed every N cards, lost-pet detail, reunited screen, web sidebar), when a client requests an ad for a slot with context (region, species, language), then the server returns the best active ad whose dates, region or municipality and species match, rotating fairly between several matches.
- [x] #2 Given no sponsored ad matches, when a slot is requested, then a house ad (become a supporter, partner with us, adopt) is returned so a slot is never empty in the pilot.
- [x] #3 Given the report-lost and report-found flows, when ads are requested for them, then the API refuses (no such slots exist) and a test enforces it.
- [x] #4 Given impressions and clicks, when counted, then they are aggregated per ad, slot, day and region in our DB without user identifiers, cookies or device storage, clicks go through a counting redirect with rel sponsored, and this DB is the source of truth for sponsor reports.
- [x] #5 Given targeting, when regions are used, then Slovenian statistical regions and municipalities (open data, licence checked) are loaded as reference data and a point maps to its region and municipality.
- [x] #6 Given an ad record, when stored, then it has an image with required alt text, title, text, https link, language, dates, status and targeting, and only admins can write.
- [ ] #7 Given a request whose context marks the user as ad-free (active Premium entitlement), when a slot is requested, then no ad and no house ad is returned; Podpornik supporters are not ad-free.
- [x] #8 Given an ad or house ad request, when content is checked, then ads selling, giving away or rehoming animals are not allowed (blocklist of categories and keywords, since the ad-space provider must verify marking data for pet ads).
- [ ] #9 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 (code read + staging GETs; local DB unreachable so vitest not run; suites ads.domain/ads.routes/admin-ads.routes cover targeting, rotation, dates, house fallback, blocklist, impressions, click 404/https). AC1-6,8 pass. Staging api-staging.najdimo.si sha a244c7dc: slot feed sl/region 3/dog gives house ad, Cache-Control private max-age=60, Vary Accept-Language, label Oglas, no cookies; report_lost slot 400 VALIDATION; click unknown id 404 no Location; click with to=/url= params 302 only to stored https link, no-store; click slot report_lost 400. 3 test clicks on house ad ...103 plus ~8 GETs. AC7 NOT met: ad-free (Premium) not implemented, deferred to M4 (CHANGE row added). AC9: verify: merge queue on main at a244c7dc. Notes: no click dedupe or bot filtering beyond 300/min/IP rate limit (aggregates only; AC4 does not require it); impressions endpoint trusts the client (rate limited).
<!-- SECTION:NOTES:END -->

---
id: TASK-119.3
title: >-
  GA4 property v2: custom dimensions, key events and UI-only steps (unwanted
  referrals, Ads link, saved funnels)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 23:51'
labels:
  - tech
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-119.1
references:
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§8. GA4 property config
    (admin client; TASK-119 GA4 tasks)
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§7. Ads
  - docs/tech/contracts/C12-analytics-consent.md§GA4 property checklist
parent_task_id: TASK-119
priority: high
ordinal: 514200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Property 559038055 for tracking plan v2 through the GA admin client (node <project root>/.secrets/ga-admin.mjs <project root> <METHOD> <path|url> [json]; {PROPERTY} placeholder, v1beta default, a full URL for v1alpha). Never print key material, never copy .secrets or .env files. Creating a dimension or key event before the code sends it is harmless.

API steps: POST {PROPERTY}/customDimensions per new param (scope EVENT, displayName in English); POST {PROPERTY}/keyEvents for sign_up, generate_lead, ad_slot_click (countingMethod ONCE_PER_EVENT); DELETE the key events ad_click, boost_purchase, donation, supporter_subscribe (purchase stays the one monetary key event, C12 §Event registry). Leave the default lead and app events.

UI-only steps (Admin UI; the owner or lead with property access): unwanted referrals in the web stream tag settings; the saved funnel explorations as the C12b §8 recipe (shared with the property users). The Google Ads link waits for the owner answer on ads consent (C12b §7).

## Packet
Unblocks on: TASK-119.1 (Enhanced measurement off first, the same stream)
Branch: agent/TASK-119.3-ga4-property-v2 (docs only: C12 checklist and C12b §8 verification lines)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admin API GET customDimensions lists the 11 new event-scoped dimensions of C12b §8 (flow, step, dwell, error_code, error_field, outcome, method, purpose, plan, amount_bucket, lead_type) next to the 7 existing and user_role
- [ ] #2 Admin API GET keyEvents has sign_up, generate_lead, ad_slot_click, report_lost_submit, report_found_submit, match_confirmed, reunited, purchase, and no longer ad_click, boost_purchase, donation, supporter_subscribe
- [ ] #3 The UI-only steps are done or handed over: unwanted referrals (checkout.stripe.com, accounts.google.com, appleid.apple.com, omtpppzrugibquukhnyl.supabase.co) and the 8 saved funnel explorations of C12b §8, with who and when in the task notes; the Google Ads link is listed as waiting for the ads consent owner question
- [ ] #4 C12 §GA4 property checklist and C12b §8 say what was verified and when; no key material in notes or docs
<!-- AC:END -->

## Implementation Notes

2026-10-20. Property writes run by the Project Lead (ga.sh) at the owner's request; read back with GET (14 key events, 19 dimensions): 19 EVENT-scope custom dimensions (match_source user_role species report_type region ad_slot ad_id municipality purpose plan lead_type outcome amount_bucket step flow dwell error_code method error_field); key events incl. sign_up, generate_lead, ad_slot_click, report_lost_submit, report_found_submit, match_confirmed, reunited, purchase; deleted boost_purchase, ad_click, donation, supporter_subscribe. No key material recorded.

Owner decision 2026-10-20: no Google Ads link, conversion import or Meta Pixel; campaigns via GA4 UTM reports.

UI-only, owner to do (not done):
1. Web stream, Configure tag settings, List unwanted referrals: checkout.stripe.com, accounts.google.com, appleid.apple.com, omtpppzrugibquukhnyl.supabase.co.
2. Save the 8 funnel explorations of C12b section 8 and share with property users.

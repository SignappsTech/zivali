---
id: TASK-119.2
title: >-
  packages/analytics v2: flow events, checkout and lead events, flowTracker,
  landing UTMs, slot event rename
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:51'
updated_date: '2026-10-20 00:22'
labels:
  - tech
  - 'est:M'
milestone: m-1
dependencies: []
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12-analytics-consent.md
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§2. Event shape
    (decision)
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§4. Errors (where people
    get stuck)
parent_task_id: TASK-119
priority: high
ordinal: 513200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owns every registry and adapter change of tracking plan v2 (C12 2.0, C12b), so the flow tasks never edit packages/analytics. Files: packages/analytics/src/** (registry.ts, a new flow.ts for flowTracker and commerceParams, adapters/ga4.ts, index.ts), packages/analytics/test/**, packages/analytics/README.md, apps/web/e2e/analytics.spec.ts, and the two ad call sites for the rename (apps/web/components/ads/ad-unit.tsx and apps/mobile/components/ads/ad-slot.tsx plus their tests).

Notes:
- FLOWS (flow -> its steps) and the client error codes live in the registry, typed so that flowTracker(flow).step() only accepts that flow steps. error_code = ERROR_CODES from @zivali/types + NETWORK + the C12b §4 client codes. lead_type = LEAD_INTERESTS from @zivali/types. purpose on begin_checkout/purchase = PAYMENT_PURPOSES.
- dwell buckets per C12 §Parameters; use a monotonic clock (performance.now where present, else Date.now).
- GA4 reserves ad_impression on web streams and ad_click on app streams (C12 §Event registry): rename only, same triggers and params.
- No new dependency (ADR-017). Keep the public bundle small: the registry ships on every page through ScreenViews.

## Packet
Unblocks on: - (ready now)
Branch: agent/TASK-119.2-analytics-registry-v2
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 registry.ts matches C12 v2.0 §Event registry and §Parameters: new events match_rejected, login, begin_checkout, purchase, generate_lead, premium_subscribe, flow_step, flow_error, ai_prefill; sign_up method email|google|apple|convert; purpose per event; alert_opt_in without region; unit tests reject a step of another flow, an unknown error_code, an error_field with digits, capitals, @, spaces or over 32 chars, and the v1 names ad_impression and ad_click
- [ ] #2 flowTracker(flow): step() sends flow_step with the bucketed dwell of the previous step (none on the first) and does not resend the same step twice in a row; error() sends one flow_error; both are no-ops without consent (unit tests on the mock adapter with a fake clock)
- [ ] #3 commerceParams maps { purpose, amount_cents, currency, plan? } to { value (EUR, 2 decimals), currency, purpose, plan? } and is exported with flowTracker and the Flow/step/error-code types
- [ ] #4 ga4 adapter: the landing document utm_* are kept in memory and used on the first page_view after a grant when the current URL has none; gclid, gbraid, wbraid and fbclid never reach page_location; covered by a unit test and a case in apps/web/e2e/analytics.spec.ts
- [ ] #5 ad_impression and ad_click are renamed ad_slot_impression and ad_slot_click at both call sites (apps/web/components/ads/ad-unit.tsx, apps/mobile/components/ads/ad-slot.tsx) with their tests updated; packages/analytics/README.md documents the v2 registry and flowTracker; pnpm verify passes
<!-- AC:END -->

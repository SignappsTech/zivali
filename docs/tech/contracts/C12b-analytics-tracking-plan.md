source: C12 (v2.0) §Event registry; owner request 2026-10-20 (TASK-119: "GA4 … stats for our ads … see where people get stuck, every major step tracked"); FR-038, FR-039; C1 §Errors, C13, C14, C19

# C12b Analytics tracking plan v2: flows, drop-off, errors, ads

Version 1.0. Web first (pilot); mobile sends the same events later (TASK-119 mobile tasks). Event and parameter rules, consent and the API: C12.

## 1. Coverage audit (web, main, 2026-10-20)

| Event | Fires on web | From (`apps/web/components/…`) |
|---|---|---|
| `report_lost_start` / `_submit` | yes | `report-lost/lost-flow.tsx` (mount; after publish, region fetched with consent) |
| `report_found_start` / `_submit` | yes | `report-found/found-flow.tsx` |
| `match_suggested`, `match_confirmed` | yes | `matches/match-review.tsx` (review opened; first confirm) |
| `chat_started` | yes | `chat/thread.tsx` (first own message) |
| `reunited` | yes | `report/lifecycle-helpers.ts` `trackReunited` |
| `share`, `poster_download` | yes | `report/share-menu.tsx`; poster also `report-lost/lost-done.tsx` |
| `alert_opt_in` | yes | `alerts/alert-settings.tsx` |
| `sign_up` | `convert` only | `auth/sign-up.tsx` |
| `ad_impression`, `ad_click` | yes, but **reserved names** | `ads/ad-unit.tsx` (≥ 50 % visible for 1 s, once per ad per mount; click) |
| `donation` | yes | `payments/payment-return.tsx` (tip, report_contribution, support) |
| `supporter_subscribe` | **never** | the return page maps purpose `subscription` to nothing |
| `boost_purchase`, `premium_subscribe` | **never** | no web Boost or Premium checkout yet (TASK-53, TASK-54; M4) |
| `page_view` | yes | `analytics/screen-views.tsx` (route template) |
| user property `user_role` | **never set** | no `setUserRole` call on web or mobile |

Gaps: no step or error events in any wizard; no email or OAuth sign-up, login or verification; no match rejection; no checkout start; no partner lead; nothing for the shelter directory or the map; `user_role` configured in GA4 but never sent; `utm_*` lost when consent comes after an in-app navigation; `ad_impression` is reserved on GA4 web streams and `ad_click` on app streams, so our slot events do not reach reports under those names; **Enhanced measurement is on** on the web stream (all toggles), which would send real URLs, site-search text, outbound and form URLs as soon as provider `ga4` ships.

## 2. Event shape (decision)

Generic step events plus the existing outcome events, not per-flow step events: 3 new names instead of about 60, one funnel recipe per flow (`flow_step` filtered by `flow` and `step`), and well inside GA4 limits (500 event names, 25 params per event, 50 event-scoped custom dimensions: we use 18; 30 key events: we use 8; values ≤ 100 chars).

- `flow_step { flow, step, dwell? }`: a step is **shown** (entered), including the first step and a step restored from a draft. The tracker does not resend the same step twice in a row. `dwell` is the time spent on the previous step of the same flow instance, bucketed (C12 §Parameters); absent on the first step. Optional `species`, `report_type`, `municipality` where the step knows them (only the steps that say so below).
- `flow_error { flow, step, error_code, error_field? }`: a step refused to move on, or a request from that step failed. **One event per refused attempt**, with the first invalid field (the one that gets focus), not one per field.
- Completion: the flow's outcome event (§3). Events inherit `page_location` (the route template), so explorations can also split by page.

## 3. Flows and steps

`flowTracker(flow)` is created once per mounted flow instance (a new instance restarts `dwell`). Steps used only by `flow_error` are marked (e).

| flow | steps | starts with | completes with |
|---|---|---|---|
| `report_lost` | `pet`, `photos`, `details`, `where`, `when`, `what`, `review`, `auth_gate` | `report_lost_start` | `report_lost_submit` |
| `report_found` | `photo`, `what`, `where`, `situation`, `send` | `report_found_start` | `report_found_submit` (found) |
| `report_sighting` | `where`, `when`, `extra` | `report_found_start` | `report_found_submit` (sighted) |
| `pet` | `form` (e) | | (photo and AI errors on the pet form) |
| `sign_up` | `form`, `sent`, `verified` | | `sign_up` |
| `sign_in` | `form` | | `login` |
| `reset_password` | `request`, `sent`, `new_password`, `done` | | `done` step |
| `match_review` | `confirm` (e), `reject` (e) | `match_suggested` | `match_confirmed` or `match_rejected` |
| `chat` | `send` (e) | | `chat_started` |
| `reunite` | `dialog` | | `reunited` |
| `share` | `open` | | `share`, `poster_download` |
| `alerts` | `form` | | `alert_opt_in` |
| `shelter_search` | `search`, `answer`, `no_answer`, `contact` | | `contact` step |
| `browse` | `filter`, `report_open` | | |
| `checkout` | `amount`, `return` | | `begin_checkout` → `purchase` (§6) |
| `partner_enquiry` | `form` | | `generate_lead` |

Triggers:
- **report_lost** (`lost-flow.tsx`): each step shown by the flow's step change, with the steps `stepsFor()` returns (a saved pet skips `photos`/`details`); `auth_gate` when Publish opens the P16 dialog for a signed-out owner. `review` carries `species`. Errors: Naprej with an invalid `STEP_FIELDS` field (code from the form error, §4); `photos` with no photo → `photo`/`required`; a refused publish on `review` → its C1 code (`DUPLICATE_OPEN_REPORT`, `VALIDATION` with its field, `RATE_LIMITED`, `NETWORK`, …).
- **report_found / report_sighting** (`found-flow.tsx`): `FOUND_STEPS` or `SIGHTING_STEPS` (a linked report = sighting) the same way; a refused send on the last step. `send`/`extra` carry `species` when known.
- **Photos** (PhotoPicker, any flow): a failed or refused photo → `flow_error { flow, step: <the flow's photo step>, error_field: 'photo', error_code: too_large | file_type | upload_failed | NETWORK | RATE_LIMITED }`, once per photo.
- **sign_up** (`components/auth`): `form` when the sign-up form shows (page or P16 dialog); `sent` when "check your email" shows; `verified` when a confirmation link lands (the callback marks a successful `type=signup` exchange; the marker never reaches GA, `trackScreen` drops the query). `sign_up { method }` per C12. Errors: client checks on name, email, password; `CONFLICT` (email taken), `CAPTCHA_FAILED`, `RATE_LIMITED`, `NETWORK`.
- **sign_in**: `form` shown; `login { method }` on success (OAuth: on return for an existing account). Errors: `invalid_credentials`, `UNVERIFIED_EMAIL`, `CAPTCHA_FAILED`, `RATE_LIMITED`, `link_expired` (callback `link=expired`), `oauth_failed` (callback `error=failed`).
- **reset_password** (`auth/reset.tsx`): `request` form shown, `sent`, `new_password` (link opened, form shown), `done` (saved). Errors as sign_in.
- **match_review**: `match_suggested` as today; `match_rejected` when a rejection succeeds; refused confirm or reject → `flow_error` on `confirm`/`reject` (`UNVERIFIED_EMAIL`, `NETWORK`, …).
- **chat**: a refused send → `flow_error` on `send` (`FORBIDDEN` = blocked, `RATE_LIMITED`, `NETWORK`).
- **reunite**: `dialog` when the mark-reunited dialog opens; `reunited` on success; refusals on `dialog`.
- **share**: `open` when the share menu opens.
- **alerts**: `form` when the alert opt-in form shows; `alert_opt_in` on save; errors `permission_denied` (browser notifications), C1 codes.
- **shelter_search** (`shelters/`): `search` when a municipality is chosen or located, `answer` when a responsible shelter shows, `no_answer` when none, `contact` when its phone, email or website is pressed; `search`/`answer`/`no_answer` carry `municipality`. Errors `location_unavailable`, `permission_denied`, `NETWORK`.
- **browse** (`browse/`, map and list): `filter` when filters are applied (with `species`, `report_type` when exactly one is chosen); `report_open` when a report is opened from the map or the list.
- **checkout**: §6. **partner_enquiry** (`partners/enquiry-form.tsx`): `form` on the first interaction (once); `generate_lead { lead_type }` on success; errors field checks, `CAPTCHA_FAILED`, `RATE_LIMITED`, `NETWORK`.

## 4. Errors (where people get stuck)

`error_code` (registry enum): every C1 `ERROR_CODES` value (from `@zivali/types`, so a new C1 code is accepted at once), `NETWORK` (no response), and the client codes `required`, `invalid`, `too_short`, `too_long`, `too_large`, `file_type`, `upload_failed`, `permission_denied`, `location_unavailable`, `timeout`, `canceled`, `payment_failed`, `invalid_credentials`, `link_expired`, `oauth_failed`.

Form errors map to client codes: react-hook-form `required` → `required`; `minLength`/zod `too_small` → `too_short`; `maxLength`/zod `too_big` → `too_long`; anything else → `invalid`. A `VALIDATION` answer that names a field sends that field. `error_field` is the form's own key (`colours`, `date`, `email`, `photo`, `location`, `amount`, …), never anything typed or chosen; never the message.

## 5. AI pre-fill (C19)

`ai_prefill { flow: report_lost | report_found | pet, outcome }`, sent from the pre-fill hooks (`components/ai`):
- once per first-photo check: `filled` (ready, at least one field filled), `empty` (ready, nothing filled: low confidence or hints only), `unavailable` (status `unavailable`), `timeout` (10 s without an answer), `error` (request failed). Nothing when `ai.enabled` is false.
- then at most once each per photo: `confirmed` (the person accepted the suggestions, P7 "Da, nadaljuj"), `edited` (the first change to a field the AI filled).

Exploration: `ai_prefill` by `outcome` per `flow`; `confirmed`/`edited` over `filled`.

## 6. Checkout

Premium, Boost, donations and Podpornik. GA4 recommended events, one product per checkout:
- `begin_checkout { value, currency, purpose, plan? }` right before the redirect to Stripe, also on Retry (`commerceParams`; fixed prices from `payments.prices`). `flow_step { checkout, amount }` when an amount ask (P15) shows; refusals on `amount` (`MIN_AMOUNT`, `SERVICE_UNAVAILABLE`, `VALIDATION`, `NETWORK`).
- Return page, once per payment (the existing `settlePayment` guard): `flow_step { checkout, return }`; succeeded → `purchase { value, currency, purpose, plan? }` plus the product event (`donation` for tip, report_contribution, support; `supporter_subscribe` for a Podpornik subscription; `boost_purchase`; `premium_subscribe`); canceled, failed or timed out → `flow_error` on `return` (`canceled`, `payment_failed`, `timeout`).
- No `transaction_id` (a payment id is a record id, C12 §Forbidden; the once-per-payment guard stops a reload resend) and no `items` (one product; `purpose` and `plan` carry it; revenue comes from `value`).
- Boost (TASK-53) and Premium (TASK-54) build their checkouts on the same helper and events; their build tasks own those call sites. Renewals are not sent to GA: recurring revenue is a DB/Stripe number (TASK-64).

**Server truth (decision): `purchase` stays client-side on the return page, no Measurement Protocol.** The return page already waits for the server's answer (it polls `GET /v1/payments/:id` until the webhook settles the payment), so `purchase` is only sent for a payment our DB marks succeeded. Measurement Protocol would need each payer's GA client id (`_ga`) and consent state stored with the payment (new personal data and a server consent check), and it attributes only when client and session ids match, so it would not improve ad attribution. Cost: a payer who closes the tab before the payment settles (≤ 90 s) is missing in GA; revenue truth stays in our DB. Owner option for later: MP for renewals or offline conversions if Ads bidding needs them.

## 7. Ads

**Acquisition (campaigns that bring people in)**
- Conversions for Google Ads import (once linked): `purchase` (with value), `report_lost_submit`, `report_found_submit`, `sign_up`, `generate_lead`. `match_confirmed`, `reunited` and `ad_slot_click` stay GA-only key events.
- Attribution works in GA4 now through UTMs for consenting visitors: `page_location` keeps `utm_*` only, and the adapter keeps the landing page's `utm_*` for the first page_view after a late consent (C12 §Web wiring). Click ids (`gclid`, `gbraid`, `wbraid`, `fbclid`) are dropped, so **every campaign URL must carry UTMs**; auto-tagging alone would show paid Google clicks as google / organic. Recipe: Google Ads account-level final URL suffix `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}`; Meta URL parameters `utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`; print and QR `utm_medium=offline`. Campaign names are ours, never a person's data.
- Consent as built: the banner has one category, `analytics`. `ad_storage`, `ad_user_data` and `ad_personalization` stay **denied always** (ga4 adapter), and the banner, cookie policy (§5) and privacy policy (§10) say we use no advertising cookies. So GA4 can report campaigns (sessions, key events, revenue by source / medium / campaign), but Google Ads conversion import and bidding for EEA traffic need `ad_user_data` (and `ad_storage` for click ids) granted; with them denied, Ads gets no usable conversions. That needs an advertising consent category, legal text, a `CONSENT_VERSION` bump and click ids kept: owner question (TASK-119), CH-688 (product manager, FR-039), CH-689 and CH-690 (content strategist, privacy policy §10 and P17). Not designed here. The PRD event list follows in CH-687.
- Advanced Consent Mode (cookieless pings for modelled conversions) is an owner option only; we stay on basic.

**Our own ad slots (C14)**: `ad_slot_impression` when at least half the unit is in view for 1 s, once per ad per slot mount (one page view), the same moment our DB counts it; `ad_slot_click` on a press (opens in a new tab), both with `ad_slot`, `ad_id`, `region?`, `species?`. Same trigger code as today (`ads/ad-unit.tsx`), only the names change. Exploration: clicks over impressions by `ad_id` and `ad_slot`.

## 8. GA4 property config (admin client; TASK-119 GA4 tasks)

Admin API (`.secrets/ga-admin.mjs`), property 559038055, web stream 16130765671:
1. **Before the first `ga4` build**: `enhancedMeasurementSettings` `streamEnabled: false` (v1alpha PATCH); page views come only from `trackScreen`, so nothing is counted twice and no real URL, search text, outbound or form URL is sent. Stream `defaultUri` → `https://najdimo.si`. Keep `emailRedactionEnabled: true`.
2. Event-scoped custom dimensions to add: `flow`, `step`, `dwell`, `error_code`, `error_field`, `outcome`, `method`, `purpose`, `plan`, `amount_bucket`, `lead_type` (with the 7 existing: 18 event + 1 user).
3. Key events: add `sign_up`, `generate_lead`, `ad_slot_click`; remove `ad_click`, `boost_purchase`, `donation`, `supporter_subscribe`; keep `report_lost_submit`, `report_found_submit`, `match_confirmed`, `reunited`, `purchase`. The default lead and app events stay.

UI only (record who and when in the task notes):
- Data streams → Web → Configure tag settings → **List unwanted referrals**: `checkout.stripe.com`, `accounts.google.com`, `appleid.apple.com`, `omtpppzrugibquukhnyl.supabase.co` (a payment or sign-in return must not take the credit for a conversion).
- **Google Ads link** (Admin → Product links) when the Ads account exists, then import the §7 conversions; only after the ads consent question is answered.
- **Saved funnel explorations** (Explore → Funnel exploration; closed; users; breakdown session source / medium, device category):
  1. Lost: `report_lost_start` → `flow_step` report_lost `where` → `when` → `what` → `review` → `report_lost_submit`; second funnel `photos` → `details` (new-pet path).
  2. Found: `report_found_start` → `flow_step` report_found `photo` → `what` → `where` → `situation` → `send` → `report_found_submit`.
  3. Sighting: `flow_step` report_sighting `where` → `when` → `extra` → `report_found_submit` (report_type `sighted`).
  4. Sign-up: `flow_step` sign_up `form` → `sign_up` → `flow_step` sign_up `verified`.
  5. Match loop (open funnel, TASK-64 AC #2): `match_suggested` → `match_confirmed` → `chat_started` → `reunited`.
  6. Checkout: `flow_step` checkout `amount` → `begin_checkout` → `purchase`, breakdown `purpose`.
  7. Partners: page_view with page path `/advertise` → `flow_step` partner_enquiry `form` → `generate_lead`.
  8. Stuck (free form): rows `flow`, `step`, `error_field`, `error_code`, value event count of `flow_error`; second tab `flow_step` by `step` × `dwell`.

## 9. Privacy (unchanged)

Consent-gated, basic Consent Mode v2, nothing before consent. Every new parameter is a code constant (`flow`, `step`, `error_code`, `error_field`, `outcome`) or an enum; nothing comes from input, and `flow_error` never carries a message or the rejected value. No names, emails, phones, chip numbers, coordinates, free text, report, payment or user ids. Payment values were already sent (`donation`). `user_role` (C12): `admin` or `shelter` from the profile role, `finder` for an anonymous finder session (C7), else `owner`.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-20 | TASK-119: coverage audit, flows and steps, errors, AI pre-fill, checkout (client-side purchase), ads (UTMs, consent limits, slot events renamed), GA4 property config and funnel recipes |

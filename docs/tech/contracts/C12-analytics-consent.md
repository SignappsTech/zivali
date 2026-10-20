source: docs/04-technical-design.md§Technology stack (analytics), ADR-009; FR-038, FR-039, brief §Analytics (GA4 property 559038055); tracking plan v2: C12b (TASK-119)

# C12 Analytics taxonomy and consent (`@zivali/analytics`)

Version 2.0. Which flows, steps, errors and ad events fire where, and the GA4 property set-up: C12b.

## API

```ts
track<E extends EventName>(event: E, params: EventParams[E]): void   // no-op without consent; throws in dev/test on unknown event/param
setUserRole(role: 'owner' | 'finder' | 'shelter' | 'admin'): void     // GA user property `user_role`
trackScreen(path: string): void                                      // web page_view / mobile screen_view (route template, no ids)
flowTracker(flow: Flow): {                                           // C12b §Flows: one per mounted flow instance
  step(step: StepOf<Flow>, extra?: { species?, report_type?, municipality? }): void  // flow_step; same step twice in a row is not resent; adds `dwell`
  error(step: StepOf<Flow>, code: ErrorCodeParam, field?: string): void             // flow_error; field = form key, never a value
}
commerceParams(p: { purpose: PaymentPurpose; amount_cents: number; currency: 'EUR'; plan?: 'monthly' | 'yearly' })
  : { value, currency, purpose, plan? }                              // begin_checkout / purchase (C12b §Checkout)
type ConsentChoice = { analytics: boolean }
getConsent(): ConsentState | null           // { v: number, analytics: boolean, ts: string }; null = not asked yet
setConsent(choice: ConsentChoice): void      // persists, applies to the adapter at once (grant or withdraw)
initAnalytics(opts?: { provider?, storage?, firebase?, nonce? }): void   // mobile injects the Firebase instance and expo-secure-store; optional on web
subscribeConsent(cb: (s: ConsentState | null) => void): () => void
needsConsentPrompt(): boolean                // null, version changed, or ts older than 12 months
CONSENT_VERSION: number                      // bump when vendors or purposes change
```
`value` is capped at 10000 EUR. An expired consent (older than 12 months) or a `CONSENT_VERSION` bump also blocks `track()` (same as no consent). `flowTracker` is pure TypeScript (no React): a component keeps one in a ref.

Adapters: `ga4` (web), `firebase` (mobile), `mock` (default locally and in tests; `getMockEvents()`/`resetMockEvents()` for assertions). Selected by `NEXT_PUBLIC_ANALYTICS_PROVIDER` / `EXPO_PUBLIC_ANALYTICS_PROVIDER` (`mock` unless set).

## Parameters (exact GA4 names; values are enums or slugs only)

| Param | Values |
|---|---|
| `municipality` | municipality slug (C6), e.g. `ljubljana` |
| `region` | statistical region slug, e.g. `osrednjeslovenska` |
| `species` | `dog` \| `cat` |
| `report_type` | `lost` \| `found` \| `sighted` |
| `ad_slot` | `feed` \| `detail` \| `reunited` \| `sidebar` |
| `ad_id` | ad uuid (not personal) |
| `match_source` | `chip` \| `image` \| `attributes` |
| `value` + `currency` | number (EUR, 2 decimals) + `"EUR"`; monetary events only |
| `amount_bucket` | `2-4` \| `5-9` \| `10-19` \| `20+` (donation) |
| `method` | share: `whatsapp` \| `facebook` \| `copy_link` \| `native`; sign_up: `email` \| `google` \| `apple` \| `convert`; login: `password` \| `google` \| `apple` |
| `purpose` | donation: `tip` \| `report_contribution` \| `support`; begin_checkout, purchase: any C13 `payment_purpose` (adds `boost`, `subscription`) |
| `plan` | `monthly` \| `yearly` (Premium only) |
| `flow` | a C12b §Flows key, e.g. `report_lost` |
| `step` | a step of that flow (C12b §Flows); the registry rejects a step of another flow |
| `dwell` | seconds on the previous step of the flow: `0-9` \| `10-29` \| `30-59` \| `60-179` \| `180+` |
| `error_code` | a C1 `ERROR_CODES` value, `NETWORK`, or a C12b §Errors client code |
| `error_field` | the form's field key, a code constant (lowercase words joined by `_`, ≤ 32 chars); never the value |
| `outcome` | ai_prefill: `filled` \| `empty` \| `unavailable` \| `timeout` \| `error` \| `confirmed` \| `edited` |
| `lead_type` | C14 lead interest: `ad` \| `vet_partner` \| `unsure` |

Forbidden always: names, emails, phone, chip numbers, coordinates, free text, report ids/short codes, user ids, payment ids, error messages and rejected values.

## Event registry

| Event | Params | Key event |
|---|---|---|
| `report_lost_start` | species?, region?, municipality? | |
| `report_lost_submit` | report_type, species, region, municipality | yes |
| `report_found_start` | (none) | |
| `report_found_submit` | report_type (`found`\|`sighted`), species, region, municipality | yes |
| `match_suggested` | species, region, match_source | |
| `match_confirmed` | species, region, match_source | yes |
| `match_rejected` | species, region, match_source | |
| `chat_started` | species?, region? | |
| `reunited` | species, region, municipality | yes |
| `boost_purchase` | value, currency, species, region | |
| `donation` | value, currency, amount_bucket, purpose | |
| `supporter_subscribe` | value, currency | |
| `premium_subscribe` | plan, value, currency (`EUR`) | |
| `begin_checkout` | value, currency, purpose, plan? | |
| `purchase` | value, currency, purpose, plan? | yes |
| `ad_slot_impression` | ad_slot, ad_id, region?, species? | |
| `ad_slot_click` | ad_slot, ad_id, region?, species? | yes |
| `share` | method, report_type, species | |
| `poster_download` | species, region | |
| `alert_opt_in` | species? | |
| `sign_up` | method | yes |
| `login` | method | |
| `generate_lead` | lead_type | yes |
| `flow_step` | flow, step, dwell?, species?, report_type?, municipality? | |
| `flow_error` | flow, step, error_code, error_field? | |
| `ai_prefill` | flow (`report_lost`\|`report_found`\|`pet`), outcome | |

`ad_slot_impression` and `ad_slot_click` replace v1 `ad_impression` and `ad_click`: GA4 reserves `ad_impression` on web streams and `ad_click` on app streams, so those names never reach reports (C12b §Ads). `purchase` is the one monetary key event; the product events (`donation`, `supporter_subscribe`, `boost_purchase`, `premium_subscribe`) are sent beside it for product detail and are no longer key events, so a payment is not counted twice.

`alert_opt_in` carries no area (decision CH-327: drop the `region` dimension rather than add `region_slug` to `Place` or a municipality → region table). The opt-in area is the person's home area, which analytics does not need; the KPI is the opt-in count (by species when exactly one is chosen, as both clients send it). Registry v2 drops the unused optional `region`.

`sign_up` (GA4 recommended event, TASK-17.12, CH-450): `convert` when an anonymous finder session's conversion request succeeds (before the address is confirmed); `email` when the sign-up request succeeds; `google`/`apple` on the first return from the provider for a new account. Never the address.

`match_suggested` fires when the owner **views** (opens) a suggestion in a consenting session (FR-038 edge), with `match_source = chip` if chip match else `attributes` (`image` from M3).

## Web wiring (basic Consent Mode v2)

- No GA script, request or cookie before `analytics: true`.
- On grant: `window.dataLayer` + `gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})` → `gtag('consent','update',{analytics_storage:'granted'})` → load `https://www.googletagmanager.com/gtag/js?id=<NEXT_PUBLIC_GA_MEASUREMENT_ID>` with CSP nonce → `gtag('config', id, { send_page_view: false })`; page views sent by `trackScreen`, which sets `page_location` = origin + route template (`utm_*` kept) and `page_title` = the template (no ids, short codes or query text).
- Landing campaign (v2): the adapter keeps the first document's `utm_*` parameters in memory (never in storage); when the first page_view after a grant has none in the current URL, it uses those, so a consent given after an in-app navigation still attributes the session. Click ids (`gclid`, `gbraid`, `wbraid`, `fbclid`) are never sent (C12b §Ads).
- On withdraw: `gtag('consent','update',{analytics_storage:'denied'})`, `window['ga-disable-<id>'] = true`, delete `_ga`, `_ga_*` cookies for the site domain.

## Mobile wiring

`firebase.json`: `analytics_auto_collection_enabled: false`, `google_analytics_default_allow_analytics_storage: false`, `…ad_storage/ad_user_data/ad_personalization: false`. On grant: `setConsent({ analytics_storage: true, ad_storage: false, ad_user_data: false, ad_personalization: false })` + `setAnalyticsCollectionEnabled(true)`. Screen views from Expo Router pathname (template form, e.g. `/r/[code]`).

## Consent storage

Web: first-party cookie `zz_consent` (strictly necessary, 12 months, `SameSite=Lax`, JSON `{v,analytics,ts}`); mobile: `expo-secure-store` key `zz_consent`. Clearing it re-prompts. On each `CONSENT_VERSION` bump add `consent.change_<n>` to both the `sl` and `en` catalogues: web and mobile show it as the re-ask line, and without it they show none (CH-183).

## GA4 property checklist

Property `559038055`, web stream `G-PKY4SCX3RL` (stream id 16130765671); retention 14 months (verified 2026-10-20); Google signals off (verified 2026-10-20); data sharing off; email redaction on (verified 2026-10-20); custom dimensions and key events as C12b §8 (verified 2026-10-20: 19 event-scoped dimensions, key events sign_up, generate_lead, ad_slot_click added and ad_click, boost_purchase, donation, supporter_subscribe removed; Enhanced measurement turned off by TASK-119.1); **Enhanced measurement OFF on the web stream (required)**: history page views, site search, outbound clicks, form interactions and file downloads would send real URLs with short codes and query text. On 2026-10-20 it was still **on** (all toggles), so it must be switched off before the first build with provider `ga4` (TASK-119 GA4 stream task). Firebase app `si.signapps.zivali` (project `zivali-bb123`) is linked as Android and iOS streams (Q-009). DebugView: web `?debug_mode=1` adds `debug_mode: true`; Android `adb shell setprop debug.firebase.analytics.app si.signapps.zivali`.

## Example

```ts
track('report_lost_submit', { report_type: 'lost', species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' });
track('donation', { value: 5, currency: 'EUR', amount_bucket: '5-9', purpose: 'tip' });
const flow = flowTracker('report_lost');
flow.step('photos');                                   // flow_step { flow: 'report_lost', step: 'photos' }
flow.step('details');                                  // … step: 'details', dwell: '30-59'
flow.error('details', 'required', 'colours');          // flow_error { …, error_code: 'required', error_field: 'colours' }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-37/38/41: initAnalytics options, value cap and consent-expiry note, trackScreen page_location/page_title, Enhanced measurement OFF checklist |
| 1.2 | 2026-10-18 | CH-183: consent.change_<n> in sl and en on every CONSENT_VERSION bump |
| 1.3 | 2026-10-19 | CH-635 (R-038.3): `premium_subscribe { plan, value, currency }` and the `plan` param; the registry entry ships with the TASK-54 web task |
| 1.4 | 2026-10-19 | CH-450: event `sign_up` { method: `convert` } |
| 1.5 | 2026-10-19 | CH-327: `alert_opt_in` without `region` (home area is personal; not needed for the KPI) |
| 2.0 | 2026-10-20 | TASK-119 tracking plan v2 (C12b): `flow_step`, `flow_error`, `ai_prefill`, `match_rejected`, `login`, `begin_checkout`, `purchase`, `generate_lead`; `flowTracker`, `commerceParams`; params flow, step, dwell, error_code, error_field, outcome, lead_type, wider method and purpose; `ad_impression`/`ad_click` renamed `ad_slot_impression`/`ad_slot_click` (GA4 reserved names); `purchase` the one monetary key event; `premium_subscribe` registered now (not by TASK-54); landing utm_* kept in memory; Enhanced measurement found on |

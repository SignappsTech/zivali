source: docs/04-technical-design.md§Technology stack (analytics), ADR-009; FR-038, FR-039, brief §Analytics (GA4 property 559038055)

# C12 Analytics taxonomy and consent (`@zivali/analytics`)

## API

```ts
track<E extends EventName>(event: E, params: EventParams[E]): void   // no-op without consent; throws in dev/test on unknown event/param
setUserRole(role: 'owner' | 'finder' | 'shelter' | 'admin'): void     // GA user property `user_role`
trackScreen(path: string): void                                      // web page_view / mobile screen_view (route template, no ids)
type ConsentChoice = { analytics: boolean }
getConsent(): ConsentState | null           // { v: number, analytics: boolean, ts: string }; null = not asked yet
setConsent(choice: ConsentChoice): void      // persists, applies to the adapter at once (grant or withdraw)
initAnalytics(opts?: { provider?, storage?, firebase?, nonce? }): void   // mobile injects the Firebase instance and expo-secure-store; optional on web
subscribeConsent(cb: (s: ConsentState | null) => void): () => void
needsConsentPrompt(): boolean                // null, version changed, or ts older than 12 months
CONSENT_VERSION: number                      // bump when vendors or purposes change
```
`value` is capped at 10000 EUR. An expired consent (older than 12 months) or a `CONSENT_VERSION` bump also blocks `track()` (same as no consent).

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
| `method` | `whatsapp` \| `facebook` \| `copy_link` \| `native` (share) |
| `purpose` | `tip` \| `report_contribution` \| `support` (donation) |

Forbidden always: names, emails, phone, chip numbers, coordinates, free text, report ids/short codes, user ids.

## Event registry

| Event | Params | Key event |
|---|---|---|
| `report_lost_start` | species?, region?, municipality? | |
| `report_lost_submit` | report_type, species, region, municipality | yes |
| `report_found_start` | (none) | |
| `report_found_submit` | report_type (`found`\|`sighted`), species, region, municipality | yes |
| `match_suggested` | species, region, match_source | |
| `match_confirmed` | species, region, match_source | yes |
| `chat_started` | species?, region? | |
| `reunited` | species, region, municipality | yes |
| `boost_purchase` | value, currency, species, region | yes |
| `donation` | value, currency, amount_bucket, purpose | yes |
| `supporter_subscribe` | value, currency | yes |
| `ad_impression` | ad_slot, ad_id, region?, species? | |
| `ad_click` | ad_slot, ad_id, region?, species? | yes |
| `share` | method, report_type, species | |
| `poster_download` | species, region | |
| `alert_opt_in` | species?, region? | |

`match_suggested` fires when the owner **views** a suggestion in a consenting session (FR-038 edge), with `match_source = chip` if chip match else `attributes` (`image` from M3).

## Web wiring (basic Consent Mode v2)

- No GA script, request or cookie before `analytics: true`.
- On grant: `window.dataLayer` + `gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})` → `gtag('consent','update',{analytics_storage:'granted'})` → load `https://www.googletagmanager.com/gtag/js?id=<NEXT_PUBLIC_GA_MEASUREMENT_ID>` with CSP nonce → `gtag('config', id, { send_page_view: false })`; page views sent by `trackScreen`, which sets `page_location` = origin + route template (`utm_*` kept) and `page_title` = the template (no ids, short codes or query text).
- On withdraw: `gtag('consent','update',{analytics_storage:'denied'})`, `window['ga-disable-<id>'] = true`, delete `_ga`, `_ga_*` cookies for the site domain.

## Mobile wiring

`firebase.json`: `analytics_auto_collection_enabled: false`, `google_analytics_default_allow_analytics_storage: false`, `…ad_storage/ad_user_data/ad_personalization: false`. On grant: `setConsent({ analytics_storage: true, ad_storage: false, ad_user_data: false, ad_personalization: false })` + `setAnalyticsCollectionEnabled(true)`. Screen views from Expo Router pathname (template form, e.g. `/r/[code]`).

## Consent storage

Web: first-party cookie `zz_consent` (strictly necessary, 12 months, `SameSite=Lax`, JSON `{v,analytics,ts}`); mobile: `expo-secure-store` key `zz_consent`. Clearing it re-prompts. On each `CONSENT_VERSION` bump add `consent.change_<n>` to both the `sl` and `en` catalogues: web and mobile show it as the re-ask line, and without it they show none (CH-183).

## GA4 property checklist (already configured by the client, verified in TASK-7 docs)

Property `559038055`, web stream `G-PKY4SCX3RL`; retention 14 months; Google signals off; data sharing off; custom dimensions (event scope) `municipality`, `region`, `species`, `report_type`, `ad_slot`, `ad_id`, `match_source`; user property `user_role`; key events as in the table above; **Enhanced measurement OFF on the web stream (required)**: history page views, site search, outbound clicks and file downloads would send real URLs with short codes and query text (client to confirm the property setting); Firebase app `si.signapps.zivali` (project `zivali-bb123`) to be linked as a second stream (Q-009). DebugView: web `?debug_mode=1` adds `debug_mode: true`; Android `adb shell setprop debug.firebase.analytics.app si.signapps.zivali`.

## Example

```ts
track('report_lost_submit', { report_type: 'lost', species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' });
track('donation', { value: 5, currency: 'EUR', amount_bucket: '5-9', purpose: 'tip' });
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-37/38/41: initAnalytics options, value cap and consent-expiry note, trackScreen page_location/page_title, Enhanced measurement OFF checklist |
| 1.2 | 2026-10-18 | CH-183: consent.change_<n> in sl and en on every CONSENT_VERSION bump |

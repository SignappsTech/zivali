# @zivali/analytics

One typed `track()` for web (GA4, gtag.js) and mobile (Firebase Analytics, same GA4 property), with basic Consent Mode v2: nothing is loaded or sent before analytics consent. Contract C12 (v2.0), tracking plan C12b, ADR-009. Source is consumed as TypeScript (`transpilePackages: ['@zivali/analytics']` in `next.config.ts`).

| Export                                                                  | What                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `track(event, params)`                                                  | registered event with allowlisted params; no-op without current consent                                  |
| `trackScreen(path)`                                                     | web `page_view` / mobile `screen_view`; pass the route template (`/r/[code]`), never a path with ids     |
| `setUserRole(role)`                                                     | user property `user_role` (`owner` \| `finder` \| `shelter` \| `admin`); applied once consent is granted |
| `getConsent()`, `setConsent({ analytics })`, `subscribeConsent(cb)`     | consent record `{ v, analytics, ts }` (`null` = not asked yet); `setConsent` grants or withdraws at once |
| `needsConsentPrompt()`, `CONSENT_VERSION`                               | prompt when not asked, version bumped or older than 12 months                                            |
| `initAnalytics(options)`                                                | optional on web; mobile passes `firebase` and `storage`; also resets state in tests                      |
| `getMockEvents()`, `resetMockEvents()`                                  | what the `mock` adapter received (only consented traffic)                                                |
| `flowTracker(flow)`                                                     | `{ step(step, extra?), error(step, code, field?) }` for one mounted flow (`flow_step`, `flow_error`)     |
| `commerceParams({ purpose, amount_cents, currency, plan? })`            | `{ value, currency, purpose, plan? }` for `begin_checkout` and `purchase` (EUR, 2 decimals)              |
| types `Flow`, `StepOf<F>`, `ErrorCodeParam`, `EventName`, `EventParams` | flow keys, the steps of one flow, the `error_code` enum, the registry                                    |

```ts
track('report_lost_submit', {
	report_type: 'lost',
	species: 'dog',
	region: 'osrednjeslovenska',
	municipality: 'ljubljana',
});
track('donation', { value: 5, currency: 'EUR', amount_bucket: '5-9', purpose: 'tip' });
track('report_found_start');

// A wizard keeps one tracker in a ref (a new instance restarts dwell).
const flow = useRef(flowTracker('report_lost')).current;
flow.step('photos'); // flow_step { flow: 'report_lost', step: 'photos' }
flow.step('details'); // … step: 'details', dwell: '30-59'
flow.error('details', 'required', 'colours'); // flow_error { …, error_code: 'required', error_field: 'colours' }
track('begin_checkout', commerceParams({ purpose: 'tip', amount_cents: 500, currency: 'EUR' })); // value: 5
```

## Rules

- **Registry** (`src/registry.ts`, C12 v2.0 §Event registry): 26 events and their parameters under the exact GA4 names (`municipality`, `region`, `species`, `report_type`, `ad_slot`, `ad_id`, `match_source`, `value`, `currency`, `amount_bucket`, `method`, `purpose`, `plan`, `flow`, `step`, `dwell`, `error_code`, `error_field`, `outcome`, `lead_type`). Values are enums, C6 slugs (lowercase words and hyphens), an ad uuid, code constants, or EUR with two decimals (max 10 000). Names, emails, phone and chip numbers, coordinates, report codes, user ids, messages and free text cannot pass. `method` and `purpose` are per event (share methods; `sign_up` `email | google | apple | convert`; `login` `password | google | apple`; donation `tip | report_contribution | support`; `begin_checkout`/`purchase` any C13 payment purpose). `alert_opt_in` carries no area.
- **v2 names**: our ad slots send `ad_slot_impression` and `ad_slot_click` (GA4 reserves `ad_impression` on web streams and `ad_click` on app streams); the v1 names are unknown events. `purchase` is the one monetary key event; `donation`, `supporter_subscribe`, `boost_purchase` and `premium_subscribe` go beside it for product detail.
- **Flows** (`FLOWS`, C12b §3): each flow and its steps; `flow_step` and `flow_error` accept only a step of their `flow` (a type error, and rejected at runtime). `error_code` = every C1 `ERROR_CODES` value (from `@zivali/types`), `NETWORK`, or a C12b §4 client code (`CLIENT_ERROR_CODES`: `required`, `invalid`, `too_short`, `too_long`, `too_large`, `file_type`, `upload_failed`, `permission_denied`, `location_unavailable`, `timeout`, `canceled`, `payment_failed`, `invalid_credentials`, `link_expired`, `oauth_failed`). `error_field` is the form's field key: lowercase words joined by `_`, at most 32 characters, never the value or the message.
- **flowTracker** (`src/flow.ts`): one per mounted flow instance. `step()` sends `flow_step` when a step shows, with `dwell` = the time on the previous step (`0-9`, `10-29`, `30-59`, `60-179`, `180+` seconds; none on the first step), measured with `performance.now()` (else `Date.now()`); the same step twice in a row is not resent; `extra` adds `species`, `report_type`, `municipality` where C12b says so. `error()` sends one `flow_error` per refused attempt. Both are no-ops without consent (they go through `track()`).
- **Violations** (unknown event, unknown param, bad value, missing param, non-template screen path) throw in development and tests; in production the event is dropped (unknown event) or the bad parameter stripped. Messages name keys, never values.
- **Consent**: checked on every call. Grant: the adapter is enabled, then the remembered role and current screen are sent. Withdraw, decline, version bump or expiry: the adapter is disabled, also at start (`initAnalytics` or the first call), so a stale grant's `_ga` cookies are deleted on the next visit. Storage: web cookie `zz_consent` (strictly necessary, 12 months, `SameSite=Lax`, URI-encoded JSON); mobile injects secure storage under the same key.

## Adapters

Chosen by `NEXT_PUBLIC_ANALYTICS_PROVIDER` / `EXPO_PUBLIC_ANALYTICS_PROVIDER` (or `initAnalytics({ provider })`); `mock` unless set. A provider that cannot start (missing `NEXT_PUBLIC_GA_MEASUREMENT_ID`, or `firebase` without an injected instance) throws outside production and falls back to `mock` in production.

- **`ga4`** (web): on grant pushes `consent default` (all four signals denied), `consent update { analytics_storage: 'granted' }`, then loads gtag.js with the CSP nonce (`initAnalytics({ nonce })`, else the first `script[nonce]` on the page) and `config { send_page_view: false }`. `trackScreen` sets `page_location` to origin + template (only `utm_*` query params kept; click ids `gclid`, `gbraid`, `wbraid`, `fbclid` never), `page_referrer` to the referrer's origin and `page_title` to the template, so short codes, search text and pet names in the real URL, referrer or title never reach GA. The landing document's `utm_*` stay in memory (never in storage): when the first page_view after a grant has none in the current URL, it carries those, so a consent given after an in-app navigation still attributes the session. In `apps/web`, `components/analytics/screen-views.tsx` (rendered by `providers.tsx`) calls it on every route change with the template built from `usePathname()` and `useParams()`; pages never call it. On withdraw (a no-op during SSR): `consent update` denied, `window['ga-disable-<id>'] = true`, `_ga` and `_ga_*` cookies deleted on the host and its parent domains.
- **`firebase`** (mobile): inject the `@react-native-firebase/analytics` instance. On grant `setConsent({ analytics_storage: true, ad_*: false })` and `setAnalyticsCollectionEnabled(true)`; on withdraw consent denied, collection off and `resetAnalyticsData()`. Errors from the native module are swallowed. `firebase.json` keeps auto collection off and all consent defaults denied (C12 §Mobile wiring).
- **`mock`** (default locally and in tests): records events in memory, no network.

```ts
// apps/mobile/app/_layout.tsx, at module scope (before the first render)
import analytics from '@react-native-firebase/analytics';
import * as SecureStore from 'expo-secure-store';

initAnalytics({
	firebase: analytics(),
	storage: { get: () => SecureStore.getItem('zz_consent'), set: (v) => SecureStore.setItem('zz_consent', v) },
});
```

## GA4 property checklist

Verify in GA4 Admin for property `559038055` (web stream `G-PKY4SCX3RL`) before release:

- [ ] Data retention: event data **14 months**
- [ ] **Google signals off**
- [ ] **Data sharing off** (Account settings, all data sharing options unticked)
- [ ] Custom dimensions, event scope (18): `municipality`, `region`, `species`, `report_type`, `ad_slot`, `ad_id`, `match_source`, `flow`, `step`, `dwell`, `error_code`, `error_field`, `outcome`, `method`, `purpose`, `plan`, `amount_bucket`, `lead_type`
- [ ] Custom dimension, user scope: `user_role`
- [ ] Key events (C12b §8): `report_lost_submit`, `report_found_submit`, `match_confirmed`, `reunited`, `purchase`, `sign_up`, `generate_lead`, `ad_slot_click` (not `ad_click`, `boost_purchase`, `donation`, `supporter_subscribe`)
- [ ] **Enhanced measurement off** for the web stream (**required**): its page views on history changes, site search, outbound clicks and file downloads send real URLs, site-search text and outbound links, bypassing the template-only `page_location`; our `page_view`, `share` and `poster_download` cover them
- [ ] Firebase app `si.signapps.zivali` (project `zivali-bb123`) linked as the second data stream (Q-009; until then mobile uses `mock`)

## DebugView

**Web**

1. In `apps/web/.env.local`: `NEXT_PUBLIC_ANALYTICS_PROVIDER=ga4`, `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-PKY4SCX3RL`; run `pnpm dev`.
2. Open any page with `?debug_mode=1` (for example `http://localhost:3000/?debug_mode=1`) and accept analytics in the consent banner; the flag is read when gtag.js loads, so reload with the parameter if consent was given earlier.
3. GA4 Admin, DebugView: the device appears with `page_view` and every `track()` event, each with `debug_mode: true`. In DevTools, Network shows no `googletagmanager.com` or `google-analytics.com` request and Application shows no `_ga` cookie before consent.

**Android** (development build)

1. `EXPO_PUBLIC_ANALYTICS_PROVIDER=firebase`, `google-services.json` from `.secrets/` (`GOOGLE_SERVICES_JSON`), build and install the dev client (`eas build --profile development --platform android`).
2. `adb shell setprop debug.firebase.analytics.app si.signapps.zivali`, then restart the app and accept analytics.
3. GA4 Admin, DebugView (Firebase stream): `screen_view` and events appear within seconds. Logs: `adb logcat -v time -s FA FA-SVC`.
4. Turn it off with `adb shell setprop debug.firebase.analytics.app .none.`

## Tests

`pnpm --filter @zivali/analytics test` runs `node --test` on `test/*.test.ts` (Node 22 type stripping): registry and privacy rejections (v1 ad names, a step of another flow, unknown error codes, bad error fields), flowTracker dwell buckets and dedupe on a fake clock, commerceParams, consent gating and expiry, ga4 Consent Mode order, cleanup and landing `utm_*` against a fake DOM, firebase calls. `@ts-expect-error` lines prove that bad events and values do not compile.

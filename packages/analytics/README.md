# @zivali/analytics

One typed `track()` for web (GA4, gtag.js) and mobile (Firebase Analytics, same GA4 property), with basic Consent Mode v2: nothing is loaded or sent before analytics consent. Contract C12, ADR-009. Source is consumed as TypeScript (`transpilePackages: ['@zivali/analytics']` in `next.config.ts`).

| Export                                                              | What                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `track(event, params)`                                              | registered event with allowlisted params; no-op without current consent                                  |
| `trackScreen(path)`                                                 | web `page_view` / mobile `screen_view`; pass the route template (`/r/[code]`), never a path with ids     |
| `setUserRole(role)`                                                 | user property `user_role` (`owner` \| `finder` \| `shelter` \| `admin`); applied once consent is granted |
| `getConsent()`, `setConsent({ analytics })`, `subscribeConsent(cb)` | consent record `{ v, analytics, ts }` (`null` = not asked yet); `setConsent` grants or withdraws at once |
| `needsConsentPrompt()`, `CONSENT_VERSION`                           | prompt when not asked, version bumped or older than 12 months                                            |
| `initAnalytics(options)`                                            | optional on web; mobile passes `firebase` and `storage`; also resets state in tests                      |
| `getMockEvents()`, `resetMockEvents()`                              | what the `mock` adapter received (only consented traffic)                                                |

```ts
track('report_lost_submit', {
	report_type: 'lost',
	species: 'dog',
	region: 'osrednjeslovenska',
	municipality: 'ljubljana',
});
track('donation', { value: 5, currency: 'EUR', amount_bucket: '5-9', purpose: 'tip' });
track('report_found_start');
```

## Rules

- **Registry** (`src/registry.ts`): the 16 taxonomy events and their parameters under the exact GA4 names (`municipality`, `region`, `species`, `report_type`, `ad_slot`, `ad_id`, `match_source`, `value`, `currency`, `amount_bucket`, `method`, `purpose`). Values are enums, C6 slugs (lowercase words and hyphens), an ad uuid, or EUR with two decimals (max 10 000). Names, emails, phone and chip numbers, coordinates, report codes, user ids and free text cannot pass.
- **Violations** (unknown event, unknown param, bad value, missing param, non-template screen path) throw in development and tests; in production the event is dropped (unknown event) or the bad parameter stripped. Messages name keys, never values.
- **Consent**: checked on every call. Grant: the adapter is enabled, then the remembered role and current screen are sent. Withdraw, decline, version bump or expiry: the adapter is disabled. Storage: web cookie `zz_consent` (strictly necessary, 12 months, `SameSite=Lax`, URI-encoded JSON); mobile injects secure storage under the same key.

## Adapters

Chosen by `NEXT_PUBLIC_ANALYTICS_PROVIDER` / `EXPO_PUBLIC_ANALYTICS_PROVIDER` (or `initAnalytics({ provider })`); `mock` unless set. A provider that cannot start (missing `NEXT_PUBLIC_GA_MEASUREMENT_ID`, or `firebase` without an injected instance) throws outside production and falls back to `mock` in production.

- **`ga4`** (web): on grant pushes `consent default` (all four signals denied), `consent update { analytics_storage: 'granted' }`, then loads gtag.js with the CSP nonce (`initAnalytics({ nonce })`, else the first `script[nonce]` on the page) and `config { send_page_view: false }`. `trackScreen` sets `page_location` to origin + template (only `utm_*` query params kept) and `page_title` to the template, so short codes, search text and pet names in the real URL or title never reach GA. On withdraw: `consent update` denied, `window['ga-disable-<id>'] = true`, `_ga` and `_ga_*` cookies deleted on the host and its parent domains.
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
- [ ] Custom dimensions, event scope: `municipality`, `region`, `species`, `report_type`, `ad_slot`, `ad_id`, `match_source`
- [ ] Custom dimension, user scope: `user_role`
- [ ] Key events: `report_lost_submit`, `report_found_submit`, `match_confirmed`, `reunited`, `boost_purchase`, `donation`, `supporter_subscribe`, `ad_click`
- [ ] Enhanced measurement off for the web stream (recommended): its history page views, site search, outbound clicks and file downloads send real URLs and query text; our `page_view`, `share` and `poster_download` cover them
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

`pnpm --filter @zivali/analytics test` runs `node --test` on `test/*.test.ts` (Node 22 type stripping): registry and privacy rejections, consent gating and expiry, ga4 Consent Mode order and cleanup against a fake DOM, firebase calls. `@ts-expect-error` lines prove that bad events and values do not compile.

# ADR-009: GA4 (web) and Firebase Analytics (mobile) behind one typed `track()`; basic Consent Mode v2

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: FR-038, FR-039, NFR-PRIV, brief §Analytics (GA4 property 559038055 configured), R-004, R-020

## Context

The GA4 property already exists with event-scoped custom dimensions whose parameter names are fixed: `municipality`, `region`, `species`, `report_type`, `ad_slot`, `ad_id`, `match_source`; user property `user_role`; key events; monetary events with `value` and `currency: "EUR"`. The acceptance criteria require that **no request reaches Google and no GA script loads before consent** (TASK-7 AC#1, FR-038 AC#1).

## Decision

- **`packages/analytics`** exports `track(event, params)`, `setUserRole(role)`, `getConsent()`, `setConsent(choice)` and `subscribeConsent()`. Event names and their allowed parameters are a typed registry (contract C12); unknown events or parameters throw in development and tests and are dropped in production. Values are enums or slugs only; no names, emails, chip numbers, coordinates or free text.
- **Adapters** chosen by environment: `ga4` (web, gtag.js), `firebase` (mobile, `@react-native-firebase/analytics`), `mock` (local and tests; records events in memory, no network). `ANALYTICS_PROVIDER=mock` is the default outside staging and production.
- **Consent Mode v2, basic implementation (web)**: before consent nothing is loaded. On grant we push `consent default` (all four signals denied), then `consent update { analytics_storage: 'granted' }` and only then load gtag.js. `ad_storage`, `ad_user_data` and `ad_personalization` stay denied (we never use Google ads features). On withdrawal: `consent update` denied, `window['ga-disable-<ID>'] = true`, delete `_ga*` cookies, reload GA state.
- **Mobile**: `firebase.json` disables auto collection and sets all consent defaults to denied; on grant `setConsent({ analytics_storage: true, ad_* false })` and `setAnalyticsCollectionEnabled(true)`. Screen views from Expo Router path changes. Firebase config files come from `.secrets/` (project `zivali-bb123`, bundle id `si.signapps.zivali`) through EAS file secrets, never committed.
- **Consent record**: strictly necessary first-party storage (`zz_consent` cookie on web, secure key-value store on mobile) with `{ v: <consent version>, analytics: boolean, ts }`; re-asked after 12 months or on version change.
- **Our DB stays the source of truth** for ad counts and KPIs (cookieless aggregates, ADR-003 / C14); GA is for audience, funnels and geography.

## Consequences

- **Client note**: the brief mentions "modelled data when declined". With basic Consent Mode, Google receives no cookieless pings, so GA4 behavioural modelling for declined users is not available (only limited conversion modelling). This is the price of the stricter acceptance criteria; switching to advanced mode later is a one-line change plus a legal review.
- Firebase needs a dev build; until the Firebase stream is linked to the GA4 property (Q-009) mobile events go to the mock adapter.
- A unit test enforces the parameter allowlist (TASK-7 AC#4).

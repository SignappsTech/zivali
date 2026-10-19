source: docs/04-technical-design.md§External integrations, ADR-011; FR-020, FR-021

# C13 Payments (Stripe test mode, mock provider)

## Tables

```sql
create type payment_purpose as enum ('tip','report_contribution','support','boost','subscription');  -- tip: reunited screen; report_contribution: lost confirmation; support: profile card; boost/subscription from M4
create type payment_status as enum ('pending','succeeded','failed','canceled','refunded');
payments(id, user_id, purpose, amount_cents int check (amount_cents >= 200), currency text default 'EUR' check (currency = 'EUR'),
         status payment_status default 'pending', provider text ('stripe'|'mock'), provider_session_id text unique,
         provider_payment_id text, refs jsonb,          -- e.g. { "report_id": "…" }
         receipt_sent_at, created_at, updated_at)
payment_events(id, provider, provider_event_id text unique, type text, payload jsonb, received_at)
```
`payment_events.payload` is redacted before storage (TASK-32.1): keep only `id`, `type`, the event object id (`data.object.id`), `payment_intent`, `amount`, `currency`, `status` and `livemode`; never `customer_details`, card data or the raw event. Access only through the API (RLS deny-all): users read their own payments; staff read all. Models in `prisma/schemas/payments.prisma`.

## `POST /v1/payments/checkout` (auth, not anonymous, `Idempotency-Key` required; owned by TASK-32.1)

Request:
```json
{ "purpose": "tip", "amount_cents": 500, "refs": { "report_id": "…" }, "locale": "sl", "return_to": "/r/Hk3vT9qP/spet-doma" }
```
Response `200 { "payment_id": "…", "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…" }`
`payments.prices` (`app_config`, public, as built in TASK-6.8): `{ "boost_cents": 499, "premium_monthly_cents": 399, "premium_yearly_cents": 2999, "vet_partner_monthly_cents": 3900, "podpornik_min_monthly_cents": 200, "support_suggested_cents": [300, 500, 1000], "support_highlight_cents": 500, "custom_min_cents": 200 }` (EUR cents). `payments.live_allowed` (`false`, not public) keeps live Stripe keys refused.
Rules: integer cents; `amount_cents ≥ 200` else `422 MIN_AMOUNT` (C1 `ERROR_HTTP_STATUS`; `VALIDATION` stays 400); user-chosen amounts (`tip`, `report_contribution`, `support`) 200–50 000; fixed prices (`boost`, subscriptions) come only from `app_config` key `payments.prices` (Boost EUR 4.99, Premium EUR 3.99/month or EUR 29.99/year, Vet Partner EUR 39/month; §Prices and entitlements) and never from the client; `refs.report_id` must belong to the caller for `report_contribution`; `return_to` must be a same-origin path. `CheckoutInput`: `amount_cents` required for `tip`, `report_contribution`, `support` (integer, ≤ 50 000; the lower bound 200 is checked by the domain → `MIN_AMOUNT`), forbidden for `boost` and `subscription` (`VALIDATION`); `refs.report_id` required for `report_contribution`. `return_to` is the browser path as shown (localised), e.g. `/r/Hk3vT9qP/spet-doma` or `/en/r/Hk3vT9qP/reunited`, never an internal route (CH-253). `GET /v1/payments/:id` (owner) → `Payment = { id, purpose, amount_cents, currency, status, refs, created_at, updated_at }` (`refs` carries `report_id`, so the return page's "Try again" can re-open checkout with the same purpose, amount and report) (CH-253). Success URL is per C15 with `return_to` and `payment_id`: `/placila/zakljucek?payment_id=…` (SL), `/en/payments/return?payment_id=…` (EN), app `zivali://payments/return?payment_id=…`; cancel URL adds `&canceled=1`; mobile passes `return_scheme: true` → URLs go through `zivali://payments/return` (CH-224). `boost` and `subscription` checkout answer 503 `SERVICE_UNAVAILABLE` until M4 (CH-224). Stripe test mode accepts the `zivali://` scheme: a session created with `return_scheme: true` stored success_url `zivali://payments/return?payment_id=…&return_to=…` and cancel_url `…&canceled=1` (QA TASK-32.4, 2026-10-16, Najdimo sandbox; CH-313). Still open: the device check that the in-app browser hands the scheme back to the app.

## `POST /v1/webhooks/stripe` (no JWT; Stripe signature on the raw body; mounted before `express.json`)

Verifies signature (`STRIPE_WEBHOOK_SECRET`; mock provider uses `MOCK_WEBHOOK_SECRET`), rejects `livemode: true` (`LIVE_MODE_FORBIDDEN`), inserts `payment_events` (duplicate `provider_event_id` → 200, no-op), handles `checkout.session.completed` / `checkout.session.async_payment_failed` / `checkout.session.expired` / `charge.refunded`, updates `payments.status`, sends job `payment.effects { payment_id }` (receipt email `payment_receipt`, later boosts/entitlements).

## Provider guard

Live keys are refused at boot outside `APP_ENV=production`. In production a live key boots (`adapter.live`) and checkout answers 422 `LIVE_MODE_FORBIDDEN` until `PaymentsDomain.liveGateOpen`: `payments.live_allowed` is true AND (the fiscal adapter is live, i.e. FURS production, none yet; OR `fiscal.required = false` with `FISCAL_PROVIDER=off`, so no mock ZOI/EOR reaches a real receipt). Livemode webhook events are accepted only with a live key (money a live checkout took is always recorded). `PAYMENTS_PROVIDER` other than `stripe|mock|off` is refused; unit test proves it. Go-live is then configuration only (CH-287; replaces "refuses to initialise with live keys in any environment").

## Mock provider

`checkout_url = APP_URL/dev/checkout?payment_id=…&return_to=…` (TASK-114.38, CH-566: the mock takes `return_to` from the success URL and keeps it only when it passes the `CheckoutInput.return_to` rule, a same-origin path; otherwise the parameter is left out); the dev page (web, only when `APP_ENV !== 'production'`) shows Success, Fail, Cancel and posts a signed mock event to `POST /v1/webhooks/stripe`.

## Client (`@zivali/api/payments`)

```ts
startCheckout(dispatch, input: { purpose; amountCents; refs?; returnTo; locale; returnScheme?: boolean; idempotencyKey?: string }): Promise<{ paymentId; checkoutUrl }>
// locale: 'sl'|'en'; returnScheme: true on mobile (zivali:// URLs); idempotencyKey defaults to a generated uuid, reuse it on retry.
// Backend sets operationIds in the OpenAPI document to the client stub names (startCheckout, getPayment, listMyPayments) so generated hooks keep them.
// web: window.location.assign(checkoutUrl); mobile: WebBrowser.openAuthSessionAsync(checkoutUrl, 'zivali://payments/return')
getPayment(api, id) (`GET /v1/payments/:id`) / listMyPayments(api, { cursor? }) (`GET /v1/me/payments`)
```
Analytics: `donation` fires on the return page when status is `succeeded` (consent only, C12).

Planned (TASK-92.1, CH-293; not built): the `Payment` DTO carries no invoice state, so a client cannot know whether `GET /v1/payments/:id/invoice.pdf` exists (the P15 "Potrdilo" button waits for it). Add `Payment.invoice: { number, status: 'pending' | 'verified' | 'failed' } | null`; until then a client treats 404 as "no invoice yet".

## Scope now and later (brief v0.7)

- M2 (this contract): one-off owner payments for `tip`, `report_contribution` and `support` (profile card "Pomagajte nam izboljšati Najdimo"; suggested EUR 3 / 5 / 10, custom ≥ EUR 2).
- M4 extends the same ledger, provider interface and webhook: owner one-time payments (`boost`), owner subscriptions (Premium, Podpornik) and one organisation subscription, **Vet Partner** (vet organisations only, Stripe Billing with VAT invoices, indicative EUR 39/month). Entitlements are keyed by `user_id` or `organisation_id` (vet). Shelters and municipalities never pay; all reunite features stay free for every organisation. QR/NFC tags are out of scope (brief v0.7).
- Reward escrow is out of scope (brief v1.1): no Stripe Connect, payouts or platform fee; money never flows between users. Owners arrange rewards outside the app; a lost report may carry a display-only reward (C4). M6: Stripe invoices for ad sponsors.
- A Stripe implementation plan from the client is pending; it may refine this contract (tech lead updates C13 and dependent tasks).

## Prices and entitlements (M4; owner 2026-10-19, PRD v0.11 R-026.1, R-026.2, R-026.10; TASK-52, TASK-54)

- **Premium test prices**: EUR 3.99/month and EUR 29.99/year (were 2.99 and 24.99), VAT included, yearly shown first. `payments.prices` holds the amounts (`premium_monthly_cents` 399, `premium_yearly_cents` 2999); the TASK-6.8 migration inserted 299/2499 with `on conflict do nothing`, so the TASK-52 migration updates those two fields in place.
- **Stripe prices by lookup key, no ids in config**: recurring EUR prices on one Premium product with `lookup_key` `premium_monthly` and `premium_yearly`. Checkout resolves the active price by lookup key (`GET /v1/prices?lookup_keys[]=…&active=true`, cached in memory for 10 min) and refuses with 503 `SERVICE_UNAVAILABLE` (log `payments.price_mismatch`) when its `unit_amount`, currency or interval differs from `payments.prices`, so the page never shows one price and charges another. A price change = a new price created with `transfer_lookup_key: true`, the old price archived (never deleted: existing test subscriptions keep it).
- **Where Stripe objects live**: only the "Najdimo sandbox" account (`acct_1UQa5wAbrzQytqtO`), written only with `STRIPE_SECRET_KEY` from `.env.local` (an `sk_test` key), never through the claude.ai Stripe connector (another account). The products and prices are created by `apps/api/scripts/stripe-prices.ts` (idempotent: finds the product and lookup keys first, prints what it would change, writes only with `--apply`; TASK-52 backend task), run once by a person or with the lead's approval.
- **As built (TASK-52.1, CH-655)**: `PaymentsDomain.premiumPrice(plan: 'monthly' | 'yearly', ctx)` returns `{ price_id, amount_cents, currency: 'eur', interval }`; adapter method `findPrice(lookupKey)` (Stripe `GET /v1/prices?lookup_keys[]=…&active=true`; mock from `payments.prices` `<lookup key>_cents`); cache per adapter instance, failed lookups not cached; a missing lookup-key price also answers 503 `SERVICE_UNAVAILABLE` with log `payments.price_mismatch` (`found: null`). `scripts/stripe-prices.ts`: product custom id `najdimo_premium` (found by `GET /v1/products?ids[]=`), name "Najdimo Premium"; prices with `tax_behavior=inclusive` (VAT included); the key must be `sk_test_` (`rk_` refused), read only from the root `.env.local` (a different key in the environment is refused).
- **Mock provider**: the same lookup keys- **Mock provider**: the same lookup keys resolve to fixture prices built from `payments.prices`, so local and CI never call Stripe.
- **Entitlement** `premium` (`hasEntitlement(user_id, 'premium')`, users only; TASK-52): unlimited pets (`pets.free_limit` does not apply), AI extras including the sightings heatmap `search_plan_heatmap` (C6), `report_stats` (C21), `chat_translation` (C9), one-tap lost mode and the free Boost. A missing or ended entitlement answers 403 `UPGRADE_REQUIRED` on these features only, never on the core loop (report, match, alert, chat). Organisation reports, shelters and municipalities never pass through `hasEntitlement`.
- **Free Boost**: yearly plan at once; monthly plan after its 3rd paid month (OQ-004 default); at most 1 per 12 months per user, counted from the last grant, so a plan switch never doubles it.
- **Yearly renewal reminder**: our own email, not Stripe's: daily job `subscription.reminders` sends notification type `premium_renewal` (C10; transactional, in the user's language: renewal date, amount, how to cancel) for yearly subscriptions whose `current_period_end` is 7 days away, once per period.
- **Analytics**: `premium_subscribe { plan: monthly | yearly, value, currency: 'EUR' }` on the return page when the payment succeeded (consent only, C12; R-038.3).

## Fiscal invoices (TASK-92, FR-046, Q-012)

Card payments may need fiscally verified invoices (ZDavPR: payment cards count as cash). Built behind an adapter so the decision only switches configuration:
- `fiscal` adapter: `issue(invoice) → { zoi, eor, issued_at }`; the input carries `subsequent` (FURS SubsequentSubmit on retries). It also has `zoi(invoice)` (deterministic, stored at creation so a FAILED invoice still prints it), `live`, `tax_number`, `premise_id`, `device_id`. Providers as built (TASK-92.1): `mock` (default everywhere) and `furs` (FURS test environment directly: mutual TLS, JWS RS256; the production endpoint is refused) (CH-286).
- Model `invoices` (`payment_id`, `number` = premises/device/sequence, `net_cents`, `vat_rate` 22, `vat_cents`, `gross_cents`, `zoi`, `eor`, `status` PENDING | VERIFIED | FAILED, `attempts`; as built also `premise_id`, `device_id`, `sequence` (number = premise-device-sequence, unique per series), `issued_at` (fixed: it is the ZOI input), `provider`, `verified_at`, `pdf_key`; counter table `invoice_sequences`, row lock in the insert transaction, gapless; FAILED after 5 attempts, then the receipt goes without EOR) (CH-286); created by `payment.effects` for every succeeded payment, verified through the adapter with retries; ZOI and EOR printed on the receipt email and PDF (`GET /v1/payments/:id/invoice.pdf`, PDF rendered in the worker; owner only, 404 until the worker rendered it, 60/h per user). `app_config` `fiscal.required` (null/true/false, Q-012, private) and `fiscal.invoiced_purposes` (private).
- **Retries and resubmit (TASK-92.3, CH-358, CH-359)**: a FURS retry is a `SubsequentSubmit` with the stored number, issue time and ZOI. `invoices.lease_until` is an in-flight lease (2 min, taken with the attempt claim; chosen over a pg-boss singleton queue because two queues verify invoices, `payment.effects` and `fiscal.resubmit`, and changing a queue's policy means recreating it) and `invoices.alerted_at`. `app_config` `fiscal.retry` `{ "delay_minutes": 2, "max_delay_minutes": 30 }` (not public; bounds 1-10 and 1-30) drives the `payment.effects` retries. After the 5th failure the invoice is FAILED; the hourly `fiscal.resubmit` job sends FAILED and PENDING-older-than-3-h invoices again. Invoices unverified 24 h after issue are logged as errors and emailed once to the confirmed admin addresses.
- **Credit notes (TASK-92.4, CH-370)**: a credit note (dobropis) is an `invoices` row of the same series with negative amounts (`gross/net/vat_cents` ≤ 0, VAT at the invoice's rate), `reference_invoice_id` → the invoice (FURS ReferenceInvoice: premise, device, number, issue time) and `refund_total_cents` (0 on the invoice). Unique (`payment_id`, `refund_total_cents`): one invoice per payment and one credit note per refund; it replaces the unique `payment_id`. `payments.refunded_cents` (0..`amount_cents`) follows Stripe's cumulative `amount_refunded`: every `charge.refunded` (partial too) raises it under a row lock and sends `payment.effects { payment_id, refund: { total_cents, amount_cents } }`; only a full refund still moves the status to `refunded`. `payment.effects` issues the invoice first (also for a payment refunded before its effects ran), then the credit note, fiscalised and rendered like an invoice; out-of-order refund events of one charge yield one credit note for both. The `Payment` DTO gains `refunded_cents` (`GET /v1/payments/:id`, `GET /v1/me/payments`). No download route for credit-note PDFs yet (private bucket `invoices/<id>.pdf`); like the invoice PDF it waits for a UI link.
- **Live gate**: see §Provider guard (APP_ENV=production plus `payments.live_allowed`; the adapter itself no longer refuses a live key — CH-294): `payments.live_allowed` stays false until fiscal invoicing is live or the accountant records that it is not required (`fiscal.required = false`).

## Payments off (TASK-76.1)

A switch per environment, no code change, for an environment that must not take payments yet (e.g. production before the fiscal questions are cleared, TASK-92.x). The web-first pilot does not use it: it runs Stripe test mode with `FISCAL_PROVIDER=mock` (`docs/tech/pilot-runbook.md`).
- API and worker: `PAYMENTS_PROVIDER=off` (also the default when `APP_ENV=production` sets no provider): `POST /v1/payments/checkout` and the webhook answer 503 `SERVICE_UNAVAILABLE`; no payment row is written (the provider call comes before the insert). `GET /v1/config/public` reports `payments.enabled: false` (true with `stripe` or `mock`; computed from the adapter, not an `app_config` row).
- Web and app follow it: the reunited tip, the lost contribution row and the Profile support card hide themselves once the config says false (shown while it loads); the reunited ad then shows at once (no ask to stand beside). `GET /v1/me/payments` and the payments history stay.
- Explicit overrides: `PAYMENTS_ENABLED=false` on the web server (runtime; the asks are left out of the server render, no flash) and `EXPO_PUBLIC_PAYMENTS_ENABLED=false` in an app build. Unset, both follow the API.

## Example

```json
// POST /v1/payments/checkout → 422
{ "error": { "code": "MIN_AMOUNT", "message": "Minimum card amount is EUR 2.00", "details": { "min_cents": 200 } } }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-63: startCheckout(dispatch, {…, locale, returnScheme?, idempotencyKey?}); operationIds = stub names |
| 1.2 | 2026-10-15 | CH-138: payments.prices app_config JSON shape as built; payment_events payload redaction rule |
| 1.3 | 2026-10-18 | CH-224: success URL per C15, boost/subscription 503 until M4; CH-225: custom-scheme return URL open; CH-253: Payment.refs, return_to is the browser path; CH-286: fiscal adapter, invoices and config as built; CH-287: live gate replaces the live-key refusal |
| 1.4 | 2026-10-18 | CH-294/313/358/359/370: FURS adapter and live gate as built, Stripe accepts the app scheme, fiscal retry/resubmit, credit notes and refunded_cents |
| 1.5 | 2026-10-19 | CH-635: §Prices and entitlements: Premium EUR 3.99/29.99, Stripe prices by lookup key in the sandbox only, mock prices, premium entitlement features, free Boost rule, renewal reminder, premium_subscribe |
| 1.6 | 2026-10-19 | CH-566: mock `return_to`; CH-655: `premiumPrice`, `findPrice`, `stripe-prices.ts` as built |
| 1.7 | 2026-10-19 | CH-293: planned `Payment.invoice` |

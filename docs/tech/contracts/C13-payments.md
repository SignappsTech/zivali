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
`payments.prices` (`app_config`, public, as built in TASK-6.8): `{ "boost_cents": 499, "premium_monthly_cents": 299, "premium_yearly_cents": 2499, "vet_partner_monthly_cents": 3900, "podpornik_min_monthly_cents": 200, "support_suggested_cents": [300, 500, 1000], "support_highlight_cents": 500, "custom_min_cents": 200 }` (EUR cents). `payments.live_allowed` (`false`, not public) keeps live Stripe keys refused.
Rules: integer cents; `amount_cents ≥ 200` else `422 MIN_AMOUNT` (C1 `ERROR_HTTP_STATUS`; `VALIDATION` stays 400); user-chosen amounts (`tip`, `report_contribution`, `support`) 200–50 000; fixed prices (`boost`, subscriptions) come only from `app_config` key `payments.prices` (Boost EUR 4.99, Premium EUR 2.99/month or EUR 24.99/year, Vet Partner EUR 39/month; M4) and never from the client; `refs.report_id` must belong to the caller for `report_contribution`; `return_to` must be a same-origin path. `CheckoutInput`: `amount_cents` required for `tip`, `report_contribution`, `support` (integer, ≤ 50 000; the lower bound 200 is checked by the domain → `MIN_AMOUNT`), forbidden for `boost` and `subscription` (`VALIDATION`); `refs.report_id` required for `report_contribution`. `return_to` is the browser path as shown (localised), e.g. `/r/Hk3vT9qP/spet-doma` or `/en/r/Hk3vT9qP/reunited`, never an internal route (CH-253). `GET /v1/payments/:id` (owner) → `Payment = { id, purpose, amount_cents, currency, status, refs, created_at, updated_at }` (`refs` carries `report_id`, so the return page's "Try again" can re-open checkout with the same purpose, amount and report) (CH-253). Success URL is per C15 with `return_to` and `payment_id`: `/placila/zakljucek?payment_id=…` (SL), `/en/payments/return?payment_id=…` (EN), app `zivali://payments/return?payment_id=…`; cancel URL adds `&canceled=1`; mobile passes `return_scheme: true` → URLs go through `zivali://payments/return` (CH-224). `boost` and `subscription` checkout answer 503 `SERVICE_UNAVAILABLE` until M4 (CH-224). Open (CH-225): that Stripe accepts the `zivali://` custom scheme as a return URL is unconfirmed; confirm in the AC5 staging run, else add an https bounce page.

## `POST /v1/webhooks/stripe` (no JWT; Stripe signature on the raw body; mounted before `express.json`)

Verifies signature (`STRIPE_WEBHOOK_SECRET`; mock provider uses `MOCK_WEBHOOK_SECRET`), rejects `livemode: true` (`LIVE_MODE_FORBIDDEN`), inserts `payment_events` (duplicate `provider_event_id` → 200, no-op), handles `checkout.session.completed` / `checkout.session.async_payment_failed` / `checkout.session.expired` / `charge.refunded`, updates `payments.status`, sends job `payment.effects { payment_id }` (receipt email `payment_receipt`, later boosts/entitlements).

## Provider guard

Live keys are refused at boot outside `APP_ENV=production`. In production a live key boots (`adapter.live`) and checkout answers 422 `LIVE_MODE_FORBIDDEN` until `PaymentsDomain.liveGateOpen`: `payments.live_allowed` is true AND (the fiscal adapter is live, i.e. FURS production, none yet; OR `fiscal.required = false` with `FISCAL_PROVIDER=off`, so no mock ZOI/EOR reaches a real receipt). Livemode webhook events are accepted only with a live key (money a live checkout took is always recorded). `PAYMENTS_PROVIDER` other than `stripe|mock|off` is refused; unit test proves it. Go-live is then configuration only (CH-287; replaces "refuses to initialise with live keys in any environment").

## Mock provider

`checkout_url = APP_URL/dev/checkout?payment_id=…`; the dev page (web, only when `APP_ENV !== 'production'`) shows Success, Fail, Cancel and posts a signed mock event to `POST /v1/webhooks/stripe`.

## Client (`@zivali/api/payments`)

```ts
startCheckout(dispatch, input: { purpose; amountCents; refs?; returnTo; locale; returnScheme?: boolean; idempotencyKey?: string }): Promise<{ paymentId; checkoutUrl }>
// locale: 'sl'|'en'; returnScheme: true on mobile (zivali:// URLs); idempotencyKey defaults to a generated uuid, reuse it on retry.
// Backend sets operationIds in the OpenAPI document to the client stub names (startCheckout, getPayment, listMyPayments) so generated hooks keep them.
// web: window.location.assign(checkoutUrl); mobile: WebBrowser.openAuthSessionAsync(checkoutUrl, 'zivali://payments/return')
getPayment(api, id) (`GET /v1/payments/:id`) / listMyPayments(api, { cursor? }) (`GET /v1/me/payments`)
```
Analytics: `donation` fires on the return page when status is `succeeded` (consent only, C12).

## Scope now and later (brief v0.7)

- M2 (this contract): one-off owner payments for `tip`, `report_contribution` and `support` (profile card "Pomagajte nam izboljšati Najdimo"; suggested EUR 3 / 5 / 10, custom ≥ EUR 2).
- M4 extends the same ledger, provider interface and webhook: owner one-time payments (`boost`), owner subscriptions (Premium, Podpornik) and one organisation subscription, **Vet Partner** (vet organisations only, Stripe Billing with VAT invoices, indicative EUR 39/month). Entitlements are keyed by `user_id` or `organisation_id` (vet). Shelters and municipalities never pay; all reunite features stay free for every organisation. QR/NFC tags are out of scope (brief v0.7).
- Reward escrow is out of scope (brief v1.1): no Stripe Connect, payouts or platform fee; money never flows between users. Owners arrange rewards outside the app; a lost report may carry a display-only reward (C4). M6: Stripe invoices for ad sponsors.
- A Stripe implementation plan from the client is pending; it may refine this contract (tech lead updates C13 and dependent tasks).

## Fiscal invoices (TASK-92, FR-046, Q-012)

Card payments may need fiscally verified invoices (ZDavPR: payment cards count as cash). Built behind an adapter so the decision only switches configuration:
- `fiscal` adapter: `issue(invoice) → { zoi, eor, issued_at }`; the input carries `subsequent` (FURS SubsequentSubmit on retries). It also has `zoi(invoice)` (deterministic, stored at creation so a FAILED invoice still prints it), `live`, `tax_number`, `premise_id`, `device_id`. Providers as built (TASK-92.1): `mock` (default everywhere) and `furs` (FURS test environment directly: mutual TLS, JWS RS256; the production endpoint is refused) (CH-286).
- Model `invoices` (`payment_id`, `number` = premises/device/sequence, `net_cents`, `vat_rate` 22, `vat_cents`, `gross_cents`, `zoi`, `eor`, `status` PENDING | VERIFIED | FAILED, `attempts`; as built also `premise_id`, `device_id`, `sequence` (number = premise-device-sequence, unique per series), `issued_at` (fixed: it is the ZOI input), `provider`, `verified_at`, `pdf_key`; counter table `invoice_sequences`, row lock in the insert transaction, gapless; FAILED after 5 attempts, then the receipt goes without EOR) (CH-286); created by `payment.effects` for every succeeded payment, verified through the adapter with retries; ZOI and EOR printed on the receipt email and PDF (`GET /v1/payments/:id/invoice.pdf`, PDF rendered in the worker; owner only, 404 until the worker rendered it, 60/h per user). `app_config` `fiscal.required` (null/true/false, Q-012, private) and `fiscal.invoiced_purposes` (private).
- **Live gate**: see §Provider guard: `payments.live_allowed` stays false until fiscal invoicing is live or the accountant records that it is not required (`fiscal.required = false`).

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

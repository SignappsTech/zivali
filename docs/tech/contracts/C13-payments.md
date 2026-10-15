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
Access only through the API (RLS deny-all): users read their own payments; staff read all. Models in `prisma/schemas/payments.prisma`.

## `POST /v1/payments/checkout` (auth, not anonymous, `Idempotency-Key` required; owned by TASK-32.1)

Request:
```json
{ "purpose": "tip", "amount_cents": 500, "refs": { "report_id": "…" }, "locale": "sl", "return_to": "/r/Hk3vT9qP/reunited" }
```
Response `200 { "payment_id": "…", "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…" }`
Rules: integer cents; `amount_cents ≥ 200` else `422 MIN_AMOUNT` (C1 `ERROR_HTTP_STATUS`; `VALIDATION` stays 400); user-chosen amounts (`tip`, `report_contribution`, `support`) 200–50 000; fixed prices (`boost`, subscriptions) come only from `app_config` key `payments.prices` (Boost EUR 4.99, Premium EUR 2.99/month or EUR 24.99/year, Vet Partner EUR 39/month; M4) and never from the client; `refs.report_id` must belong to the caller for `report_contribution`; `return_to` must be a same-origin path. `CheckoutInput`: `amount_cents` required for `tip`, `report_contribution`, `support` (integer, ≤ 50 000; the lower bound 200 is checked by the domain → `MIN_AMOUNT`), forbidden for `boost` and `subscription` (`VALIDATION`); `refs.report_id` required for `report_contribution`. `GET /v1/payments/:id` (owner) → `Payment = { id, purpose, amount_cents, currency, status, created_at, updated_at }`. Success URL `APP_URL/<locale>/payments/return?payment_id=…`, cancel URL `…&canceled=1`; mobile passes `return_scheme: true` → URLs go through `zivali://payments/return`.

## `POST /v1/webhooks/stripe` (no JWT; Stripe signature on the raw body; mounted before `express.json`)

Verifies signature (`STRIPE_WEBHOOK_SECRET`; mock provider uses `MOCK_WEBHOOK_SECRET`), rejects `livemode: true` (`LIVE_MODE_FORBIDDEN`), inserts `payment_events` (duplicate `provider_event_id` → 200, no-op), handles `checkout.session.completed` / `checkout.session.async_payment_failed` / `checkout.session.expired` / `charge.refunded`, updates `payments.status`, sends job `payment.effects { payment_id }` (receipt email `payment_receipt`, later boosts/entitlements).

## Provider guard

The `payments` adapter refuses to initialise with keys starting `sk_live_`, `rk_live_`, or `pk_live_`, and `PAYMENTS_PROVIDER` other than `stripe|mock`; unit test proves it.

## Mock provider

`checkout_url = APP_URL/dev/checkout?payment_id=…`; the dev page (web, only when `APP_ENV !== 'production'`) shows Success, Fail, Cancel and posts a signed mock event to `POST /v1/webhooks/stripe`.

## Client (`@zivali/api/payments`)

```ts
startCheckout(api, input: { purpose; amountCents; refs?; returnTo }): Promise<{ paymentId; checkoutUrl }>
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
- `fiscal` adapter: `issue(invoice) → { zoi, eor, issued_at }`; implementations `mock` (deterministic ZOI/EOR) and one FURS-certified provider API (chosen with the client; credentials are a client item).
- Model `invoices` (`payment_id`, `number` = premises/device/sequence, `net_cents`, `vat_rate` 22, `vat_cents`, `gross_cents`, `zoi`, `eor`, `status` PENDING | VERIFIED | FAILED, `attempts`); created by `payment.effects` for every succeeded payment, verified through the adapter with retries; ZOI and EOR printed on the receipt email and PDF (`GET /v1/payments/:id/invoice.pdf`, PDF rendered in the worker).
- **Live gate**: `app_config` `payments.live_allowed` is false and the payments adapter refuses live keys until fiscal invoicing is enabled or the accountant records that it is not required.

## Example

```json
// POST /v1/payments/checkout → 422
{ "error": { "code": "MIN_AMOUNT", "message": "Minimum card amount is EUR 2.00", "details": { "min_cents": 200 } } }
```

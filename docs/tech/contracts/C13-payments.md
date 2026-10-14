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
RLS: users select their own payments; no client writes (Edge Functions only); staff select all.

## Edge Function `payments-checkout` (POST, user JWT required, not anonymous)

Request:
```json
{ "purpose": "tip", "amount_cents": 500, "refs": { "report_id": "…" }, "locale": "sl", "return_to": "/r/Hk3vT9qP/reunited" }
```
Response `200 { "payment_id": "…", "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…" }`
Rules: integer cents; `amount_cents ≥ 200` else `400 MIN_AMOUNT`; user-chosen amounts (`tip`, `report_contribution`, `support`) 200–50 000; fixed prices (`boost`, subscriptions) come only from `app_config` key `payments.prices` (Boost EUR 4.99, Premium EUR 2.99/month or EUR 24.99/year, Vet Partner EUR 39/month; M4) and never from the client; `refs.report_id` must belong to the caller for `report_contribution`; `return_to` must be a same-origin path. Success URL `APP_URL/<locale>/payments/return?payment_id=…`, cancel URL `…&canceled=1`; mobile passes `return_scheme: true` → URLs go through `zivali://payments/return`.

## Edge Function `stripe-webhook` (POST, no JWT; Stripe signature)

Verifies signature (`STRIPE_WEBHOOK_SECRET`; mock provider uses `MOCK_WEBHOOK_SECRET`), rejects `livemode: true` (`LIVE_MODE_FORBIDDEN`), inserts `payment_events` (duplicate `provider_event_id` → 200, no-op), handles `checkout.session.completed` / `checkout.session.async_payment_failed` / `checkout.session.expired` / `charge.refunded`, updates `payments.status`, enqueues `payment_effects {payment_id}` (receipt email `payment_receipt`, later boosts/entitlements).

## Provider guard

The `payments` adapter refuses to initialise with keys starting `sk_live_`, `rk_live_`, or `pk_live_`, and `PAYMENTS_PROVIDER` other than `stripe|mock`; unit test proves it.

## Mock provider

`checkout_url = APP_URL/dev/checkout?payment_id=…`; the dev page (web, only when `APP_ENV !== 'production'`) shows Success, Fail, Cancel and posts a signed mock event to `stripe-webhook`.

## Client (`@zivali/api/payments`)

```ts
startCheckout(input: { purpose; amountCents; refs?; returnTo }): Promise<{ paymentId; checkoutUrl }>
// web: window.location.assign(checkoutUrl); mobile: WebBrowser.openAuthSessionAsync(checkoutUrl, 'zivali://payments/return')
getPayment(id) / listMyPayments({ cursor? })
```
Analytics: `donation` fires on the return page when status is `succeeded` (consent only, C12).

## Scope now and later (brief v0.7)

- M2 (this contract): one-off owner payments for `tip`, `report_contribution` and `support` (profile card "Pomagajte nam izboljšati Najdimo"; suggested EUR 3 / 5 / 10, custom ≥ EUR 2).
- M4 extends the same ledger, provider interface and webhook: owner one-time payments (`boost`), owner subscriptions (Premium, Podpornik) and one organisation subscription, **Vet Partner** (vet organisations only, Stripe Billing with VAT invoices, indicative EUR 39/month). Entitlements are keyed by `user_id` or `organisation_id` (vet). Shelters and municipalities never pay; all reunite features stay free for every organisation. QR/NFC tags are out of scope (brief v0.7).
- M4 (legal-gated, Q-011): Stripe Connect for reward escrow. M6: Stripe invoices for ad sponsors.
- A Stripe implementation plan from the client is pending; it may refine this contract (tech lead updates C13 and dependent tasks).

## Example

```json
// payments-checkout → 400
{ "error": { "code": "MIN_AMOUNT", "message": "Minimum card amount is EUR 2.00", "details": { "min_cents": 200 } } }
```

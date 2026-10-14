# ADR-011: Stripe Checkout (test mode) through Edge Functions with a webhook ledger and a mock provider

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): checkout and the webhook are Express routes (`POST /v1/payments/checkout`, `POST /v1/webhooks/stripe` with the raw body), using the Node Stripe SDK; effects run in the `payment.effects` job.
- Source: FR-020, FR-021, P-6, R-003, A-014

## Decision

- **Provider interface** `payments` with `createCheckout({ paymentId, purpose, amountCents, currency: 'EUR', userId, refs, successUrl, cancelUrl })` (`paymentId` is the `payments.id` of the row inserted `pending`; the mock checkout URL is built from it) and `parseWebhook(rawBody, signature)`. Implementations: `stripe` (Stripe SDK in Deno with the fetch HTTP client and async signature verification) and `mock`.
- **Edge Function `payments-checkout`**: validates purpose and amount (integer cents, minimum 200, purpose-specific bounds), inserts a `payments` row `pending`, returns the Checkout URL.
- **Edge Function `stripe-webhook`**: verifies the signature, inserts `payment_events(provider_event_id unique)` (idempotency), updates `payments` status, enqueues `payment_effects` (receipt email, entitlements later, analytics server-side milestones in DB only).
- **Live mode is impossible in this phase**: the adapter refuses keys starting with `sk_live_` or `rk_live_` and the `livemode: true` flag on events, with a unit test (FR-020 R-020.2).
- **Mock provider**: `createCheckout` returns `<APP_URL>/dev/checkout?session=…`, a dev-only page with Success, Fail and Cancel buttons that posts a mock-signed event to `stripe-webhook`. Used locally and in CI.
- **Mobile** opens web checkout with `expo-web-browser` (`openAuthSessionAsync`) and returns through the app scheme. No native purchase UI; the IAP risk (R-003) stays documented.

## Consequences

- One ledger for tips, contributions, boosts, tags and subscriptions (M4 adds `subscriptions` and `entitlements`).
- Stripe test keys (Q-002) are needed only for staging; everything else runs on the mock.

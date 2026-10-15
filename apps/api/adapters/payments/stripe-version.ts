// Stripe API version pinned for every request (adapter header, webhook endpoint api_version in
// scripts/stripe-webhook.mjs). 2026-04-22.dahlia is the first stable version with managed_payments on Checkout Sessions.
export const STRIPE_API_VERSION = '2026-04-22.dahlia';

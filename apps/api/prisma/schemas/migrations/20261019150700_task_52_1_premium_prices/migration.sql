-- task: TASK-52.1
-- rollback: update app.app_config set value = jsonb_set(jsonb_set(value, '{premium_monthly_cents}', '299'), '{premium_yearly_cents}', '2499'), updated_at = now() where key = 'payments.prices'; (in a new migration)
-- Premium test prices EUR 3.99/month and EUR 29.99/year (owner 2026-10-19, C13 §Prices and entitlements). The TASK-6.8
-- migration inserted 299/2499 with on conflict do nothing, so only these two fields change in place; every other field
-- of payments.prices stays as it is. Stripe's prices (lookup keys premium_monthly/premium_yearly) must match them:
-- apps/api/scripts/stripe-prices.ts, and checkout refuses a mismatch.
update app.app_config
set value = jsonb_set(jsonb_set(value, '{premium_monthly_cents}', '399'), '{premium_yearly_cents}', '2999'),
	updated_at = now()
where key = 'payments.prices';

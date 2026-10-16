-- task: TASK-92.3
-- rollback: alter table app.invoices drop column lease_until, drop column alerted_at; delete from app.app_config where key = 'fiscal.retry';
-- Fiscal resubmission (C13 §Fiscal invoices): an in-flight lease per invoice, the admin alert mark, and the retry delay
-- of payment.effects (pg-boss backoff, in minutes).

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "alerted_at" TIMESTAMPTZ(6),
ADD COLUMN     "lease_until" TIMESTAMPTZ(6);

-- payment.effects retries a failed FURS verification after delay_minutes, doubling (with jitter) up to
-- max_delay_minutes; after the fifth failure the invoice is FAILED and the hourly fiscal.resubmit job takes over.
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('fiscal.retry', '{"delay_minutes": 2, "max_delay_minutes": 30}', false, 'FURS verification retries of payment.effects: first delay and cap in minutes (exponential backoff); delay 1-10, cap 1-30', now())
on conflict (key) do nothing;

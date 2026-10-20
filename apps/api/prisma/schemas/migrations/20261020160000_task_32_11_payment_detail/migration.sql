-- task: TASK-32.11
-- rollback: alter table app.payments drop constraint payments_method_check, drop column method, drop column livemode, drop column refunded_at;
-- P15 payment detail (CH-701..703): the payment method (card brand and last 4 digits or a wallet, never the number or
-- expiry), the provider key's live mode at checkout (test flag) and the time of the last refund. Additive, nullable.

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "livemode" BOOLEAN,
ADD COLUMN     "method" JSONB,
ADD COLUMN     "refunded_at" TIMESTAMPTZ(6);

-- An object of only these keys; last4 is four digits (C13: brand and last 4 only, never card data). CASE, since
-- deleting keys from a scalar would raise instead of failing the check.
alter table app.payments
    add constraint payments_method_check check (
        method is null or case when jsonb_typeof(method) = 'object' then
            method - array['type', 'brand', 'last4', 'wallet'] = '{}'::jsonb
            and coalesce(method->>'last4', '0000') ~ '^[0-9]{4}$'
        else false end
    );

-- Refunds before this migration: the last charge.refunded event of the payment, else its last change.
update app.payments p set refunded_at = coalesce(
    (select max(e.received_at) from app.payment_events e
        where e.type = 'charge.refunded' and e.payload->>'payment_intent' = p.provider_payment_id),
    p.updated_at)
where p.refunded_cents > 0;

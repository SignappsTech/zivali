-- task: TASK-92.4
-- rollback: delete from app.invoices where reference_invoice_id is not null; alter table app.invoices drop constraint invoices_reference_invoice_id_fkey, drop constraint invoices_amounts_check, drop column reference_invoice_id, drop column refund_total_cents, add constraint invoices_amounts_check check (gross_cents > 0 and net_cents >= 0 and vat_cents >= 0 and net_cents + vat_cents = gross_cents); drop index app.invoices_payment_id_refund_total_cents_key; create unique index invoices_payment_id_key on app.invoices (payment_id); alter table app.payments drop column refunded_cents;
-- Credit notes (dobropis, C13 §Fiscal invoices): rows of the invoice series with negative amounts that reference the
-- invoice, one per refund (keyed by the refunded total it reached); payments.refunded_cents follows Stripe's
-- cumulative amount_refunded. Check constraints are hand-written below (Prisma does not model them).

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "reference_invoice_id" UUID,
ADD COLUMN     "refund_total_cents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex, before the old one goes: one invoice per payment (refund_total_cents 0) stays enforced
CREATE UNIQUE INDEX "invoices_payment_id_refund_total_cents_key" ON "invoices"("payment_id", "refund_total_cents");

-- DropIndex
DROP INDEX "invoices_payment_id_key";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refunded_cents" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reference_invoice_id_fkey" FOREIGN KEY ("reference_invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- An invoice has positive amounts and no refund; a credit note references an invoice and has negative amounts.
alter table app.invoices
    drop constraint invoices_amounts_check,
    add constraint invoices_amounts_check check (net_cents + vat_cents = gross_cents and (
        (reference_invoice_id is null and refund_total_cents = 0 and gross_cents > 0 and net_cents >= 0 and vat_cents >= 0)
        or (reference_invoice_id is not null and refund_total_cents > 0 and gross_cents < 0 and net_cents <= 0 and vat_cents <= 0)
    ));
alter table app.payments
    add constraint payments_refunded_cents_check check (refunded_cents between 0 and amount_cents);

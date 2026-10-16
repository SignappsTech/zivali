-- task: TASK-92.1
-- rollback: drop table app.invoices, app.invoice_sequences; drop type app."INVOICE_STATUS"; delete from app.app_config where key in ('fiscal.required', 'fiscal.invoiced_purposes');
-- Fiscal invoices of card payments (C13 §Fiscal invoices, ZDavPR). ADR-021: RLS enabled, no policies. Check constraints
-- are hand-written below (Prisma does not model them).

-- CreateEnum
CREATE TYPE "INVOICE_STATUS" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "premise_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "net_cents" INTEGER NOT NULL,
    "vat_rate" INTEGER NOT NULL,
    "vat_cents" INTEGER NOT NULL,
    "gross_cents" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "zoi" TEXT NOT NULL,
    "eor" TEXT,
    "status" "INVOICE_STATUS" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMPTZ(6),
    "pdf_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "premise_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "last_sequence" INTEGER NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("premise_id","device_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_premise_id_device_id_sequence_key" ON "invoices"("premise_id", "device_id", "sequence");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

alter table app.invoices
    add constraint invoices_amounts_check check (gross_cents > 0 and net_cents >= 0 and vat_cents >= 0 and net_cents + vat_cents = gross_cents),
    add constraint invoices_vat_rate_check check (vat_rate between 0 and 100),
    add constraint invoices_sequence_check check (sequence > 0),
    add constraint invoices_number_check check (number = premise_id || '-' || device_id || '-' || sequence),
    add constraint invoices_provider_check check (provider in ('mock', 'furs')),
    add constraint invoices_verified_check check (status <> 'VERIFIED' or eor is not null);
alter table app.invoice_sequences
    add constraint invoice_sequences_last_sequence_check check (last_sequence > 0);

-- Q-012 (the accountant): null = open, true = fiscal verification required, false = not required. With the live switch
-- payments.live_allowed it gates live payments (C13). OQ-001: whether tips and contributions are invoiced at all is
-- open, so the invoiced purposes are configuration (default: every purpose, FR-046).
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('fiscal.required', 'null', false, 'Accountant decision Q-012: true = fiscally verified invoices required, false = not required, null = open; gates live payments (C13)', now()),
    ('fiscal.invoiced_purposes', '["tip", "report_contribution", "support", "boost", "subscription"]', false, 'Payment purposes that get a fiscal invoice (OQ-001 open: tips and contributions)', now())
on conflict (key) do nothing;

alter table app.invoices enable row level security;
alter table app.invoice_sequences enable row level security;

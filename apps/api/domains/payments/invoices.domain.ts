// Fiscal invoices (C13 §Fiscal invoices, TASK-92, FR-046): payment.effects issues one per succeeded payment, numbered
// <premise>-<device>-<sequence> without gaps, with a VAT breakdown, verified through the fiscal adapter (retried by
// pg-boss with backoff), then rendered to a PDF in the private bucket. Every step is idempotent per payment.
import { PAYMENT_PURPOSES, type PaymentPurpose } from '@zivali/types';

import type { FiscalInvoice } from '../../adapters/fiscal/index.ts';
import { Prisma } from '../../generated/client.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { renderInvoicePdf } from '../../lib/invoice-pdf.ts';
import { prisma } from '../../prisma/prisma.ts';
import PaymentsDao, { type InvoiceRow, type PaymentRow } from './payments.dao.ts';

/** Standard Slovenian VAT rate (ZDDV-1); FR-046 itemises it on every invoice. */
export const VAT_RATE = 22;
/**
 * Verification attempts before an invoice is FAILED. Below the job's runs (1 + 5 retries), so the last attempt still
 * hands over the receipt and the PDF with the ZOI; a FAILED invoice is submitted to FURS later (deploy/README.md §10).
 */
export const MAX_ATTEMPTS = 5;

/** Net and VAT of a VAT-inclusive amount, in whole cents; net + vat = gross. */
export function vatBreakdown(gross_cents: number, vat_rate = VAT_RATE): { net_cents: number; vat_cents: number } {
	const net_cents = Math.round((gross_cents * 100) / (100 + vat_rate));
	return { net_cents, vat_cents: gross_cents - net_cents };
}

/** app_config fiscal.invoiced_purposes (OQ-001); a missing or malformed value means every purpose (FR-046). */
async function invoicedPurposes(): Promise<readonly string[]> {
	const value = await configStore.get('fiscal.invoiced_purposes');
	return Array.isArray(value) ? value : PAYMENT_PURPOSES;
}

const toFiscal = (invoice: InvoiceRow, subsequent: boolean): FiscalInvoice => ({
	premise_id: invoice.premise_id,
	device_id: invoice.device_id,
	sequence: invoice.sequence,
	issued_at: invoice.issued_at,
	zoi: invoice.zoi,
	gross_cents: invoice.gross_cents,
	net_cents: invoice.net_cents,
	vat_rate: invoice.vat_rate,
	vat_cents: invoice.vat_cents,
	subsequent,
});

async function createInvoice(payment: PaymentRow, ctx: Ctx): Promise<InvoiceRow> {
	const { fiscal } = ctx.adapters;
	const { premise_id, device_id } = fiscal;
	const amounts = { gross_cents: payment.amount_cents, vat_rate: VAT_RATE, ...vatBreakdown(payment.amount_cents) };
	try {
		return await prisma.$transaction(async (tx) => {
			const sequence = await PaymentsDao.nextInvoiceSequence(premise_id, device_id, tx);
			// After the sequence lock (held to commit), so number order and time order cannot invert.
			const draft = { premise_id, device_id, sequence, issued_at: new Date(), ...amounts };
			return PaymentsDao.insertInvoice(
				{
					...draft,
					payment_id: payment.id,
					number: `${premise_id}-${device_id}-${sequence}`,
					provider: fiscal.provider,
					zoi: fiscal.zoi({ ...draft, subsequent: false }),
				},
				tx
			);
		});
	} catch (err) {
		// A concurrent run inserted this payment's invoice first: the rollback returned our number, so use theirs.
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
			const existing = await PaymentsDao.getInvoiceByPayment(payment.id);
			if (existing) return existing;
		}
		throw err;
	}
}

async function verify(invoice: InvoiceRow, ctx: Ctx): Promise<InvoiceRow> {
	const { fiscal } = ctx.adapters;
	const attempt = invoice.attempts + 1;
	// A row made by another provider (mock vs furs) is never sent on: its ZOI and number belong to that series.
	if (invoice.provider !== fiscal.provider) {
		ctx.logger.error(
			{ invoice_id: invoice.id, row_provider: invoice.provider, provider: fiscal.provider },
			'fiscal: invoice was created by another provider, not verifying'
		);
		throw new Error(
			`fiscal: invoice ${invoice.id} belongs to provider ${invoice.provider}, not ${fiscal.provider}`
		);
	}
	// The claim counts the attempt before the call, so a crash mid-call still counts; a concurrent run loses and retries.
	if (!(await PaymentsDao.claimInvoiceAttempt(invoice.id, invoice.attempts)))
		throw new Error('fiscal: invoice verification already in progress');
	const log = { invoice_id: invoice.id, attempt };
	try {
		const { eor } = await fiscal.issue(toFiscal(invoice, attempt > 1));
		ctx.logger.info(log, 'fiscal: invoice verified');
		return await PaymentsDao.updateInvoice(invoice.id, { status: 'VERIFIED', eor, verified_at: ctx.now });
	} catch (err) {
		if (attempt < MAX_ATTEMPTS) {
			ctx.logger.warn({ ...log, err }, 'fiscal: verification failed, retrying');
			throw err;
		}
		ctx.logger.error({ ...log, err }, 'fiscal: verification failed for good, invoice FAILED (submit it later)');
		return PaymentsDao.updateInvoice(invoice.id, { status: 'FAILED' });
	}
}

async function storePdf(invoice: InvoiceRow, item: string, ctx: Ctx): Promise<InvoiceRow> {
	const { fiscal, storage } = ctx.adapters;
	const pdf = await renderInvoicePdf({
		...invoice,
		item,
		tax_number: fiscal.tax_number,
		test: !fiscal.live,
	});
	const key = `invoices/${invoice.id}.pdf`;
	await storage.put({ bucket: 'private', key }, pdf, 'application/pdf');
	return PaymentsDao.updateInvoice(invoice.id, { pdf_key: key });
}

/**
 * The payment's invoice, created, verified and rendered as far as it can get; null when fiscal invoicing is off or the
 * purpose is not invoiced. Throws while verification is still retrying, so payment.effects runs again later.
 */
export async function issueInvoice(payment: PaymentRow, item: string, ctx: Ctx): Promise<InvoiceRow | null> {
	if (ctx.adapters.fiscal.provider === 'off') return null;
	let invoice = await PaymentsDao.getInvoiceByPayment(payment.id);
	if (!invoice) {
		const purpose = payment.purpose.toLowerCase() as PaymentPurpose;
		if (!(await invoicedPurposes()).includes(purpose)) return null;
		invoice = await createInvoice(payment, ctx);
	}
	if (invoice.status === 'PENDING') invoice = await verify(invoice, ctx);
	if (!invoice.pdf_key) invoice = await storePdf(invoice, item, ctx);
	return invoice;
}

export default { issueInvoice, vatBreakdown };

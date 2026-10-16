// Fiscal invoices (C13 §Fiscal invoices, TASK-92, FR-046): payment.effects issues one per succeeded payment, numbered
// <premise>-<device>-<sequence> without gaps, with a VAT breakdown, verified through the fiscal adapter (retried by
// pg-boss with a backoff in minutes, app_config fiscal.retry), then rendered to a PDF in the private bucket. The
// hourly fiscal.resubmit job sends what is still unverified again (TASK-92.3). A refund gets a credit note of the same
// series that references the invoice (TASK-92.4). Every step is idempotent per payment and refund.
import { z } from 'zod';

import { PAYMENT_PURPOSES, type PaymentPurpose } from '@zivali/types';

import type { FiscalInvoice } from '../../adapters/fiscal/index.ts';
import { Prisma } from '../../generated/client.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { renderInvoicePdf } from '../../lib/invoice-pdf.ts';
import { prisma } from '../../prisma/prisma.ts';
import { DirectoryDomain } from '../directory/index.ts';
import PaymentsDao, { type InvoiceRow, type PaymentRow } from './payments.dao.ts';

/** Standard Slovenian VAT rate (ZDDV-1); FR-046 itemises it on every invoice. */
export const VAT_RATE = 22;
/**
 * Verification attempts before an invoice is FAILED. Below the job's runs (1 + 5 retries), so the last attempt still
 * hands over the receipt and the PDF with the ZOI; fiscal.resubmit then sends a FAILED invoice again.
 */
export const MAX_ATTEMPTS = 5;
/** In-flight lease of one attempt: far above the FURS call's 30 s deadline; after a crash mid-call it frees the invoice. */
export const LEASE_MS = 2 * 60_000;
/** PENDING this long after issue = past every payment.effects retry (at most 5 × 30 min): fiscal.resubmit takes it. */
export const STALE_PENDING_MS = 3 * 3_600_000;
/** Still unverified this long after issue: the admins are alerted (FURS expects it within 2 working days). */
export const ALERT_AFTER_MS = 24 * 3_600_000;
const RESUBMIT_BATCH = 100;

// app_config fiscal.retry (minutes). The bounds keep the whole retry ladder below STALE_PENDING_MS.
const RetryConfig = z.object({
	delay_minutes: z.number().int().min(1).max(10),
	max_delay_minutes: z.number().int().min(1).max(30),
});
const DEFAULT_RETRY: z.infer<typeof RetryConfig> = { delay_minutes: 2, max_delay_minutes: 30 };

/**
 * pg-boss retry options of payment.effects: the first retry after fiscal.retry delay_minutes, then doubling (with
 * jitter) up to max_delay_minutes. A missing or malformed value means the default (2 and 30 minutes).
 */
export async function retryOptions(): Promise<{ retryBackoff: true; retryDelay: number; retryDelayMax: number }> {
	const parsed = RetryConfig.safeParse(await configStore.get('fiscal.retry'));
	const { delay_minutes, max_delay_minutes } = parsed.success ? parsed.data : DEFAULT_RETRY;
	return {
		retryBackoff: true,
		retryDelay: delay_minutes * 60,
		retryDelayMax: Math.max(delay_minutes, max_delay_minutes) * 60,
	};
}

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

const toFiscal = (invoice: InvoiceRow, subsequent: boolean, reference: InvoiceRow | null): FiscalInvoice => ({
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
	...(reference && {
		reference: {
			premise_id: reference.premise_id,
			device_id: reference.device_id,
			sequence: reference.sequence,
			issued_at: reference.issued_at,
		},
	}),
});

type Amounts = Pick<InvoiceRow, 'gross_cents' | 'net_cents' | 'vat_rate' | 'vat_cents'>;
/** A credit note's link: the invoice it corrects and the payment's refunded total it covers up to. */
type CreditOf = { reference_invoice_id: string; refund_total_cents: number };

/**
 * Numbers and stores an invoice, or a credit note of the same series, in `tx`: after the sequence lock (held to
 * commit), so number order and time order cannot invert, and a rollback gives the number back.
 */
async function insertRow(
	tx: Prisma.TransactionClient,
	payment_id: string,
	amounts: Amounts,
	ctx: Ctx,
	credit?: CreditOf
): Promise<InvoiceRow> {
	const { fiscal } = ctx.adapters;
	const { premise_id, device_id } = fiscal;
	const sequence = await PaymentsDao.nextInvoiceSequence(premise_id, device_id, tx);
	const draft = { premise_id, device_id, sequence, issued_at: new Date(), ...amounts };
	return PaymentsDao.insertInvoice(
		{
			...draft,
			...credit,
			payment_id,
			number: `${premise_id}-${device_id}-${sequence}`,
			provider: fiscal.provider,
			zoi: fiscal.zoi({ ...draft, subsequent: false }),
		},
		tx
	);
}

/** The payment's invoice, once: a concurrent run that loses the insert gives its number back and returns the winner's. */
async function createInvoice(payment: PaymentRow, ctx: Ctx): Promise<InvoiceRow> {
	const amounts = { gross_cents: payment.amount_cents, vat_rate: VAT_RATE, ...vatBreakdown(payment.amount_cents) };
	try {
		return await prisma.$transaction((tx) => insertRow(tx, payment.id, amounts, ctx));
	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
			const existing = await PaymentsDao.getInvoiceByPayment(payment.id);
			if (existing) return existing;
		}
		throw err;
	}
}

/**
 * The credit note of what was refunded since the last one, from stored state: payments.refunded_cents (raised by the
 * webhook) above the highest refunded total a note covers. Under the payment row lock, so concurrent runs see each
 * other's notes and never credit a cent twice. The VAT is cumulative (the breakdown of the new total minus that of the
 * previous one), so the notes of a fully refunded payment net its invoice exactly (the lead's default until the
 * accountant decides otherwise). Null when nothing is left.
 */
async function createCreditNote(invoice: InvoiceRow, ctx: Ctx): Promise<InvoiceRow | null> {
	const { payment_id, vat_rate } = invoice;
	return prisma.$transaction(async (tx) => {
		const total = await PaymentsDao.lockRefunded(payment_id, tx);
		const previous = await PaymentsDao.creditedTotal(payment_id, tx);
		if (total <= previous) return null;
		const [now, before] = [vatBreakdown(total, vat_rate), vatBreakdown(previous, vat_rate)];
		const amounts = {
			gross_cents: previous - total,
			net_cents: before.net_cents - now.net_cents,
			vat_cents: before.vat_cents - now.vat_cents,
			vat_rate,
		};
		return insertRow(tx, payment_id, amounts, ctx, { reference_invoice_id: invoice.id, refund_total_cents: total });
	});
}

/**
 * One verification attempt. From payment.effects a failure before the last attempt throws (pg-boss retries); a
 * resubmission (fiscal.resubmit) is always a SubsequentSubmit and leaves the invoice FAILED when FURS fails again.
 */
async function verify(invoice: InvoiceRow, ctx: Ctx, resubmit = false): Promise<InvoiceRow> {
	const { fiscal } = ctx.adapters;
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
	// A credit note names the invoice it corrects (FURS ReferenceInvoice).
	const reference = invoice.reference_invoice_id ? await PaymentsDao.getInvoice(invoice.reference_invoice_id) : null;
	// The claim counts the attempt and takes the in-flight lease before the call: a crash mid-call still counts, and no
	// other run (a payment.effects retry or redelivery, fiscal.resubmit) sends this invoice until the lease ends. A run
	// that read the invoice before another run's attempt loses too, so overlapping runs send it once.
	const now = new Date();
	const lease_until = new Date(now.getTime() + LEASE_MS);
	const claimed = await PaymentsDao.claimInvoiceAttempt({
		id: invoice.id,
		attempts: invoice.attempts,
		now,
		lease_until,
	});
	if (!claimed) throw new Error('fiscal: invoice verification already in progress');
	const attempt = claimed.attempts;
	const log = { invoice_id: invoice.id, attempt, resubmit };
	// Every write that ends the attempt is fenced on its attempt number: a run that outlived its lease (a hung call) may
	// not overwrite the result of the run that took the invoice over, nor clear that run's lease.
	const settle = async (data: Parameters<typeof PaymentsDao.settleInvoiceAttempt>[2]) => {
		const row = await PaymentsDao.settleInvoiceAttempt(invoice.id, attempt, data);
		if (row) return row;
		ctx.logger.warn({ ...log, status: data.status }, 'fiscal: attempt outlived its lease, another run took over');
		return (await PaymentsDao.getInvoice(invoice.id))!;
	};
	let eor: string;
	try {
		// The stored row: the same number, issue time, amounts and ZOI on every attempt.
		({ eor } = await fiscal.issue(toFiscal(claimed, resubmit || attempt > 1, reference)));
	} catch (err) {
		if (!resubmit && attempt < MAX_ATTEMPTS) {
			ctx.logger.warn({ ...log, err }, 'fiscal: verification failed, retrying');
			await settle({ lease_until: null });
			throw err;
		}
		ctx.logger.error(
			{ ...log, err },
			'fiscal: verification failed, invoice FAILED (fiscal.resubmit sends it again)'
		);
		return settle({ status: 'FAILED', lease_until: null });
	}
	ctx.logger.info(log, 'fiscal: invoice verified');
	return settle({ status: 'VERIFIED', eor, verified_at: ctx.now, lease_until: null });
}

async function storePdf(
	invoice: InvoiceRow,
	item: string,
	ctx: Ctx,
	reference: InvoiceRow | null
): Promise<InvoiceRow> {
	const { fiscal, storage } = ctx.adapters;
	const pdf = await renderInvoicePdf({
		...invoice,
		item,
		tax_number: fiscal.tax_number,
		test: !fiscal.live,
		...(reference && { reference: { number: reference.number, issued_at: reference.issued_at } }),
	});
	const key = `invoices/${invoice.id}.pdf`;
	await storage.put({ bucket: 'private', key }, pdf, 'application/pdf');
	return PaymentsDao.updateInvoice(invoice.id, { pdf_key: key });
}

/** Verified (or FAILED after the last attempt) and rendered; throws while verification is still retrying. */
async function settle(row: InvoiceRow, item: string, ctx: Ctx, reference: InvoiceRow | null): Promise<InvoiceRow> {
	if (row.status === 'PENDING') row = await verify(row, ctx);
	if (!row.pdf_key) row = await storePdf(row, item, ctx, reference);
	return row;
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
	return settle(invoice, item, ctx, null);
}

/**
 * The invoice's credit notes (dobropis, TASK-92.4): one for what was refunded since the last note (createCreditNote),
 * its own number in the invoice's series, negative amounts at the invoice's VAT rate, referencing the invoice's number
 * and issue time (FURS ReferenceInvoice); then every note not yet verified or rendered is verified through the same
 * adapter and rendered to a PDF. Built from stored state, so any later payment.effects run (a retry, the next refund,
 * fiscal.resubmit) completes what a failed one left. Throws while verification is still retrying.
 */
export async function issueCreditNotes(invoice: InvoiceRow, item: string, ctx: Ctx): Promise<void> {
	const { fiscal } = ctx.adapters;
	if (fiscal.provider === 'off') return;
	// A credit note joins the invoice's series and FURS record: never for a row another provider (mock vs furs) made.
	if (invoice.provider !== fiscal.provider) {
		ctx.logger.error(
			{ invoice_id: invoice.id, row_provider: invoice.provider, provider: fiscal.provider },
			'fiscal: invoice was created by another provider, no credit note'
		);
		throw new Error(
			`fiscal: invoice ${invoice.id} belongs to provider ${invoice.provider}, not ${fiscal.provider}`
		);
	}
	const note = await createCreditNote(invoice, ctx);
	if (note)
		ctx.logger.info(
			{ invoice_id: invoice.id, credit_note_id: note.id, refund_cents: -note.gross_cents },
			'fiscal: credit note issued'
		);
	for (const unsettled of await PaymentsDao.listUnsettledCreditNotes(invoice.id))
		await settle(unsettled, item, ctx, invoice);
}

/**
 * Alerts the admins (the ops email channel: confirmed admin addresses) once about each invoice still unverified 24 h
 * after issue, and logs it as an error. The mark is taken before the email; when no admin could be emailed it is
 * given back, so the next run alerts again. Returns the number of invoices alerted.
 */
async function alertUnverified(ctx: Ctx): Promise<number> {
	const due = await PaymentsDao.claimUnverifiedAlerts(new Date(ctx.now.getTime() - ALERT_AFTER_MS), ctx.now);
	if (!due.length) return 0;
	ctx.logger.error({ invoices: due.map((i) => i.number) }, 'fiscal: invoices unverified 24 h after issue');
	const lines = [
		'Ti računi 24 ur po izdaji še niso davčno potrjeni. FURS pričakuje naknadno potrditev v 2 delovnih dneh; ' +
			'opravilo fiscal.resubmit jih pošilja vsako uro. Preverite povezavo s FURS in certifikat (deploy/README.md §10).',
		...due.map((i) => `- ${i.number}: ${i.status}, poskusov ${i.attempts}, izdan ${i.issued_at.toISOString()}`),
	];
	const subject = `Davčno potrjevanje: nepotrjeni računi (${due.length})`;
	const admins = await DirectoryDomain.listAdminEmails(undefined, ctx);
	if (await DirectoryDomain.emailAdmins(admins, { subject, lines }, ctx)) return due.length;
	await PaymentsDao.releaseAlerts(due.map((i) => i.id));
	ctx.logger.error('fiscal: no admin could be emailed about unverified invoices');
	return 0;
}

/**
 * fiscal.resubmit (hourly cron, Europe/Ljubljana; FURS expects a late submission within 2 working days): sends FAILED
 * invoices and PENDING ones payment.effects stopped short of again, as SubsequentSubmit with the stored number, issue
 * time and ZOI (nothing is renumbered or re-signed), one claim per invoice, fewest attempts first; once FURS fails, the
 * rest waits for the next run. An invoice still without its PDF (a VERIFIED one too) goes back to payment.effects (PDF
 * and receipt), and so does a payment refunded beyond its credit notes (its refund's job ran out of retries). Then the
 * 24 h admin alert.
 */
export async function resubmitInvoices(
	_input: void,
	ctx: Ctx
): Promise<{ resubmitted: number; verified: number; alerted: number }> {
	const { fiscal } = ctx.adapters;
	let resubmitted = 0;
	let verified = 0;
	if (fiscal.provider !== 'off') {
		const stale_before = new Date(ctx.now.getTime() - STALE_PENDING_MS);
		const due = await PaymentsDao.listResubmittable({
			provider: fiscal.provider,
			stale_before,
			now: new Date(),
			take: RESUBMIT_BATCH,
		});
		let fursDown = false;
		for (const invoice of due) {
			let row = invoice;
			if (invoice.status !== 'VERIFIED') {
				// FURS failed on this run: no more calls (each may hang to the deadline); PDFs and receipts still go out.
				if (fursDown) continue;
				try {
					row = await verify(invoice, ctx, true);
				} catch (err) {
					// Claimed by an attempt in flight since the listing: that attempt settles it.
					ctx.logger.warn({ invoice_id: invoice.id, err }, 'fiscal.resubmit: invoice skipped');
					continue;
				}
				resubmitted++;
				if (row.status === 'VERIFIED') verified++;
				else if (row.status === 'FAILED') fursDown = true;
			}
			if (!row.pdf_key)
				await ctx.jobs.send(
					'payment.effects',
					{ payment_id: row.payment_id },
					{ singletonKey: row.payment_id, ...(await retryOptions()) }
				);
		}
		const uncredited = await PaymentsDao.listUncredited({
			provider: fiscal.provider,
			stale_before,
			take: RESUBMIT_BATCH,
		});
		for (const payment_id of uncredited)
			await ctx.jobs.send('payment.effects', { payment_id }, await retryOptions());
		if (uncredited.length)
			ctx.logger.warn({ payments: uncredited }, 'fiscal.resubmit: refunds without a credit note');
	}
	const alerted = await alertUnverified(ctx);
	ctx.logger.info({ resubmitted, verified, alerted }, 'fiscal.resubmit: done');
	return { resubmitted, verified, alerted };
}

export default { issueInvoice, issueCreditNotes, resubmitInvoices, retryOptions, vatBreakdown };

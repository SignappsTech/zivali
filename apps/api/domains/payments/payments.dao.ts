// Prisma access for payments and the webhook ledger (C13). Every function takes tx?: Prisma.TransactionClient.
import type { Prisma } from '../../generated/client.ts';
import type { PAYMENT_PURPOSE, PAYMENT_STATUS } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PaymentRow = NonNullable<Awaited<ReturnType<typeof getPayment>>>;

export async function insertPayment(
	data: {
		id: string;
		user_id: string;
		purpose: PAYMENT_PURPOSE;
		amount_cents: number;
		provider: 'stripe' | 'mock';
		provider_session_id: string;
		refs?: { report_id: string };
	},
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	return db.payments.create({ data });
}

export async function getPayment(id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.payments.findUnique({ where: { id } });
}

/** Newest first, keyset on (created_at, id); `cursor` is the last id of the previous page. */
export async function listByUser(
	input: { user_id: string; cursor?: string; take: number },
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const { user_id, cursor, take } = input;
	const after = cursor
		? await db.payments.findFirst({ where: { id: cursor, user_id }, select: { id: true, created_at: true } })
		: null;
	if (cursor && !after) return [];
	return db.payments.findMany({
		where: {
			user_id,
			...(after && {
				OR: [{ created_at: { lt: after.created_at } }, { created_at: after.created_at, id: { lt: after.id } }],
			}),
		},
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take,
	});
}

export async function isReportManager(report_id: string, user_id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return (await db.report_managers.count({ where: { report_id, user_id } })) > 0;
}

/** The ledger row; false when the provider event id is already stored (duplicate delivery). */
export async function insertEvent(
	data: { provider: string; provider_event_id: string; type: string; payload: Prisma.InputJsonObject },
	tx?: Prisma.TransactionClient
): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.payment_events.createMany({ data: [data], skipDuplicates: true });
	return count === 1;
}

/** The payment an event is about: metadata.payment_id first, then the session id, then the payment intent. */
export async function findForEvent(
	ref: { payment_id?: string; object_id: string; payment_intent?: string | null },
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const or: Prisma.paymentsWhereInput[] = [{ provider_session_id: ref.object_id }];
	if (ref.payment_id && UUID.test(ref.payment_id)) or.unshift({ id: ref.payment_id });
	if (ref.payment_intent) or.push({ provider_payment_id: ref.payment_intent });
	return db.payments.findFirst({ where: { OR: or } });
}

/** Moves the status only from one of `from` (a late or repeated event never moves it back); true when moved. */
export async function moveStatus(
	id: string,
	from: PAYMENT_STATUS[],
	data: { status: PAYMENT_STATUS; provider_payment_id?: string },
	tx?: Prisma.TransactionClient
): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.payments.updateMany({ where: { id, status: { in: from } }, data });
	return count === 1;
}

/** Claims the receipt once per succeeded payment; true for the caller that set it. */
export async function markReceiptSent(id: string, at: Date, tx?: Prisma.TransactionClient): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.payments.updateMany({
		where: { id, status: 'SUCCEEDED', receipt_sent_at: null },
		data: { receipt_sent_at: at },
	});
	return count === 1;
}

/**
 * Raises the refunded total to `total_cents` (Stripe's cumulative amount_refunded) and returns what it was before,
 * under a row lock, so concurrent refund events each see the total the other left; null when it is not higher (a
 * late or repeated event) or above the amount.
 */
export async function raiseRefunded(
	id: string,
	total_cents: number,
	tx: Prisma.TransactionClient
): Promise<number | null> {
	const [row] = await tx.$queryRaw<{ before: number }[]>`
		update app.payments p set refunded_cents = ${total_cents}, updated_at = now()
		from (select id, refunded_cents as before from app.payments where id = ${id}::uuid for update) old
		where p.id = old.id and old.before < ${total_cents} and ${total_cents} <= p.amount_cents
		returning old.before`;
	return row ? row.before : null;
}

export type InvoiceRow = NonNullable<Awaited<ReturnType<typeof getInvoiceByPayment>>>;

/** The payment's invoice (refund_total_cents 0), not its credit notes. */
export async function getInvoiceByPayment(payment_id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.invoices.findUnique({ where: { payment_id_refund_total_cents: { payment_id, refund_total_cents: 0 } } });
}

/**
 * The payment's refunded total, under a row lock held to commit: credit note issuers for one payment run one after
 * another, each seeing the notes the previous one committed. NO KEY UPDATE, so inserting a row that references the
 * payment (FOR KEY SHARE) never waits on it.
 */
export async function lockRefunded(payment_id: string, tx: Prisma.TransactionClient): Promise<number> {
	const [row] = await tx.$queryRaw<{ refunded_cents: number }[]>`
		select refunded_cents from app.payments where id = ${payment_id}::uuid for no key update`;
	return row!.refunded_cents;
}

/** The refunded total the payment's credit notes cover: the highest refund_total_cents, 0 without notes. */
export async function creditedTotal(payment_id: string, tx?: Prisma.TransactionClient): Promise<number> {
	const db = tx ?? prisma;
	const { _max } = await db.invoices.aggregate({ where: { payment_id }, _max: { refund_total_cents: true } });
	return _max.refund_total_cents ?? 0;
}

/** Credit notes of an invoice not yet verified (PENDING) or without their PDF, in refund order. */
export async function listUnsettledCreditNotes(reference_invoice_id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.invoices.findMany({
		where: { reference_invoice_id, OR: [{ status: 'PENDING' }, { pdf_key: null }] },
		orderBy: { refund_total_cents: 'asc' },
	});
}

/**
 * Payments refunded beyond what their credit notes cover, last changed before `stale_before` (the refund's own
 * payment.effects ran out of retries): those with an invoice of this provider.
 */
export async function listUncredited(
	input: { provider: string; stale_before: Date; take: number },
	tx?: Prisma.TransactionClient
): Promise<string[]> {
	const db = tx ?? prisma;
	const rows = await db.$queryRaw<{ id: string }[]>`
		select p.id from app.payments p
		join app.invoices i on i.payment_id = p.id and i.refund_total_cents = 0 and i.provider = ${input.provider}
		where p.status in ('SUCCEEDED', 'REFUNDED') and p.updated_at < ${input.stale_before}
			and p.refunded_cents > (select max(n.refund_total_cents) from app.invoices n where n.payment_id = p.id)
		order by p.updated_at
		limit ${input.take}`;
	return rows.map((row) => row.id);
}

export async function getInvoice(id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.invoices.findUnique({ where: { id } });
}

/**
 * The next sequence of a premise/device series. Call inside the transaction that inserts the invoice: the upsert's
 * row lock holds other issuers until that commit, and a rollback returns the number, so the series has no gaps.
 */
export async function nextInvoiceSequence(
	premise_id: string,
	device_id: string,
	tx: Prisma.TransactionClient
): Promise<number> {
	const [row] = await tx.$queryRaw<{ last_sequence: number }[]>`
		insert into app.invoice_sequences (premise_id, device_id, last_sequence) values (${premise_id}, ${device_id}, 1)
		on conflict (premise_id, device_id) do update set last_sequence = app.invoice_sequences.last_sequence + 1
		returning last_sequence`;
	return row!.last_sequence;
}

export async function insertInvoice(data: Prisma.invoicesUncheckedCreateInput, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.invoices.create({ data });
}

/**
 * Claims the next verification attempt of an unverified invoice as the caller read it (`attempts`): counts it and
 * takes the in-flight lease until `lease_until`, in one UPDATE, so of concurrent runs exactly one gets the row. Null
 * while another attempt holds an unexpired lease, after another run made an attempt since the read, or once verified.
 */
export async function claimInvoiceAttempt(
	claim: { id: string; attempts: number; now: Date; lease_until: Date },
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const { id, attempts, now, lease_until } = claim;
	const [row] = await db.invoices.updateManyAndReturn({
		where: {
			id,
			attempts,
			status: { in: ['PENDING', 'FAILED'] },
			OR: [{ lease_until: null }, { lease_until: { lte: now } }],
		},
		data: { attempts: attempts + 1, lease_until },
	});
	return row ?? null;
}

/**
 * What fiscal.resubmit takes, fewest attempts first, then oldest: FAILED invoices, PENDING ones issued before
 * `stale_before` (payment.effects stopped short of verifying them) and VERIFIED ones still without their PDF by then,
 * of this provider, not leased by a running attempt.
 */
export async function listResubmittable(
	input: { provider: string; stale_before: Date; now: Date; take: number },
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	return db.invoices.findMany({
		where: {
			provider: input.provider,
			OR: [
				{ status: 'FAILED' },
				{ status: 'PENDING', issued_at: { lt: input.stale_before } },
				{ status: 'VERIFIED', pdf_key: null, issued_at: { lt: input.stale_before } },
			],
			AND: [{ OR: [{ lease_until: null }, { lease_until: { lte: input.now } }] }],
		},
		orderBy: [{ attempts: 'asc' }, { issued_at: 'asc' }, { id: 'asc' }],
		take: input.take,
	});
}

/** Marks the not yet alerted invoices that are still unverified and were issued before `before`; returns them. */
export async function claimUnverifiedAlerts(before: Date, now: Date, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.invoices.updateManyAndReturn({
		where: { status: { not: 'VERIFIED' }, issued_at: { lt: before }, alerted_at: null },
		data: { alerted_at: now },
		select: { id: true, number: true, status: true, attempts: true, issued_at: true },
	});
}

/** Gives alert marks back (no admin could be emailed), so the next run alerts again. */
export async function releaseAlerts(ids: string[], tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	await db.invoices.updateMany({ where: { id: { in: ids } }, data: { alerted_at: null } });
}

type InvoiceUpdate = Pick<Prisma.invoicesUpdateInput, 'status' | 'eor' | 'verified_at' | 'pdf_key' | 'lease_until'>;

export async function updateInvoice(id: string, data: InvoiceUpdate, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.invoices.update({ where: { id }, data });
}

/**
 * Ends the verification attempt the caller claimed (`attempts` as the claim returned it); null when another run has
 * claimed a later attempt since (this one outlived its lease), so a stale run never overwrites that run's result.
 */
export async function settleInvoiceAttempt(
	id: string,
	attempts: number,
	data: InvoiceUpdate,
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const [row] = await db.invoices.updateManyAndReturn({ where: { id, attempts }, data });
	return row ?? null;
}

export default {
	raiseRefunded,
	getInvoiceByPayment,
	lockRefunded,
	creditedTotal,
	listUnsettledCreditNotes,
	listUncredited,
	getInvoice,
	nextInvoiceSequence,
	insertInvoice,
	claimInvoiceAttempt,
	listResubmittable,
	claimUnverifiedAlerts,
	releaseAlerts,
	updateInvoice,
	settleInvoiceAttempt,
	insertPayment,
	getPayment,
	listByUser,
	isReportManager,
	insertEvent,
	findForEvent,
	moveStatus,
	markReceiptSent,
};

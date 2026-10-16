// Fiscal invoices (C13 §Fiscal invoices, TASK-92) against the local database: gapless numbering per premise and device
// under concurrency, one invoice per payment, the VAT breakdown, verification retries (same data, SubsequentSubmit),
// FAILED after the last attempt, the PDF in the private bucket, the invoiced-purposes switch and the off provider.
// TASK-92.3: the in-flight lease, the retry delay from app_config, fiscal.resubmit and the 24 h admin alert.
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { mockEmail } from '../../adapters/email/mock.ts';
import { adapters } from '../../adapters/index.ts';
import type { FiscalAdapter } from '../../adapters/fiscal/index.ts';
import { mockFiscal } from '../../adapters/fiscal/mock.ts';
import InvoicesDomain, {
	ALERT_AFTER_MS,
	MAX_ATTEMPTS,
	STALE_PENDING_MS,
	vatBreakdown,
} from '../../domains/payments/invoices.domain.ts';
import type { INVOICE_STATUS, PAYMENT_PURPOSE } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

const paymentIds: string[] = [];
const premises: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
	await prisma.invoices.deleteMany({ where: { payment_id: { in: paymentIds } } });
	await prisma.payments.deleteMany({ where: { id: { in: paymentIds } } });
	await prisma.invoice_sequences.deleteMany({ where: { premise_id: { in: premises } } });
	await deleteAuthUsers(userIds);
});

/** A ctx whose fiscal adapter numbers under a fresh premise, so each test's series starts at 1. */
function fiscalCtx(patch: Partial<FiscalAdapter> = {}) {
	const premise_id = `T${randomUUID().replaceAll('-', '').slice(0, 16)}`;
	premises.push(premise_id);
	const fiscal = { ...mockFiscal({ tax_number: '12345678', premise_id, device_id: 'D1' }), ...patch };
	return { ctx: systemCtx({ adapters: { ...adapters, fiscal } }), fiscal, premise_id };
}

async function succeeded(amount_cents = 500, purpose: PAYMENT_PURPOSE = 'TIP') {
	const id = randomUUID();
	paymentIds.push(id);
	return prisma.payments.create({
		data: {
			id,
			purpose,
			amount_cents,
			status: 'SUCCEEDED',
			provider: 'mock',
			provider_session_id: `mock_cs_${id}`,
		},
	});
}

/** The payment's invoice (refund_total_cents 0), not its credit notes. */
const invoiceOf = (payment_id: string) =>
	prisma.invoices.findUniqueOrThrow({
		where: { payment_id_refund_total_cents: { payment_id, refund_total_cents: 0 } },
	});
const issue = InvoicesDomain.issueInvoice;

describe('VAT breakdown (22 %)', () => {
	it('splits a VAT-inclusive amount into whole-cent net and VAT that add up to the gross', () => {
		expect(vatBreakdown(500)).toEqual({ net_cents: 410, vat_cents: 90 });
		expect(vatBreakdown(200)).toEqual({ net_cents: 164, vat_cents: 36 });
		expect(vatBreakdown(50_000)).toEqual({ net_cents: 40_984, vat_cents: 9016 });
		for (let gross = 200; gross <= 5000; gross += 7) {
			const { net_cents, vat_cents } = vatBreakdown(gross);
			expect(net_cents + vat_cents).toBe(gross);
			expect(Math.abs(vat_cents - (net_cents * 22) / 100)).toBeLessThanOrEqual(1);
		}
	});
});

describe('issueInvoice', () => {
	it('stores the invoice, verifies it and renders the PDF', async () => {
		const { ctx, fiscal, premise_id } = fiscalCtx();
		const payment = await succeeded(1000);
		const returned = await issue(payment, 'Zahvala za Najdimo', ctx);
		const row = await invoiceOf(payment.id);
		expect(returned).toEqual(row);
		const data = {
			premise_id,
			device_id: 'D1',
			sequence: 1,
			issued_at: ctx.now,
			gross_cents: 1000,
			net_cents: 820,
			vat_rate: 22,
			vat_cents: 180,
		};
		const { issued_at: _ctxNow, ...fixed } = data;
		const expected = await fiscal.issue({
			...data,
			issued_at: row.issued_at,
			zoi: fiscal.zoi({ ...data, issued_at: row.issued_at, subsequent: false }),
			subsequent: false,
		});
		expect(row).toMatchObject({
			...fixed,
			number: `${premise_id}-D1-1`,
			provider: 'mock',
			zoi: expected.zoi,
			eor: expected.eor,
			status: 'VERIFIED',
			attempts: 1,
			verified_at: ctx.now,
			pdf_key: `invoices/${row.id}.pdf`,
		});
		const pdf = await adapters.storage.get({ bucket: 'private', key: row.pdf_key! });
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
		// Done: a second run changes nothing.
		expect(await issue(payment, 'Zahvala za Najdimo', ctx)).toEqual(row);
	});

	it('numbers concurrent invoices of one premise and device 1..n without gaps or duplicates', async () => {
		const { ctx, premise_id } = fiscalCtx();
		const payments = await Promise.all(Array.from({ length: 12 }, () => succeeded()));
		await Promise.all(payments.map((p) => issue(p, 'Zahvala za Najdimo', ctx)));
		const rows = await prisma.invoices.findMany({ where: { premise_id }, orderBy: { sequence: 'asc' } });
		expect(rows.map((r) => r.sequence)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
		expect(new Set(rows.map((r) => r.payment_id)).size).toBe(12);
		expect(rows.every((r) => r.status === 'VERIFIED' && r.number === `${premise_id}-D1-${r.sequence}`)).toBe(true);
		expect(
			await prisma.invoice_sequences.findUniqueOrThrow({
				where: { premise_id_device_id: { premise_id, device_id: 'D1' } },
			})
		).toMatchObject({ last_sequence: 12 });
	});

	it('keeps one invoice per payment when runs race, and a lost race gives its number back', async () => {
		const { ctx, premise_id } = fiscalCtx();
		const payment = await succeeded();
		const runs = await Promise.allSettled(Array.from({ length: 6 }, () => issue(payment, 'Zahvala', ctx)));
		for (const run of runs)
			if (run.status === 'rejected') expect(String(run.reason)).toMatch(/verification already in progress/);
		expect(await prisma.invoices.count({ where: { payment_id: payment.id } })).toBe(1);
		// A losing run retries later and finds the verified invoice.
		expect(await issue(payment, 'Zahvala', ctx)).toMatchObject({ status: 'VERIFIED', sequence: 1 });
		const next = await succeeded();
		expect(await issue(next, 'Zahvala', ctx)).toMatchObject({ sequence: 2, number: `${premise_id}-D1-2` });
	});

	it('retries a failed verification with the same data, then marks it FAILED and still hands over ZOI and PDF', async () => {
		const failing = vi.fn<FiscalAdapter['issue']>().mockRejectedValue(new Error('furs: HTTP 503'));
		const { ctx, fiscal } = fiscalCtx({ issue: failing });
		const payment = await succeeded();
		for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
			await expect(issue(payment, 'Zahvala', ctx)).rejects.toThrow(/HTTP 503/);
			expect(await invoiceOf(payment.id)).toMatchObject({ status: 'PENDING', attempts: attempt, pdf_key: null });
		}
		const failed = await issue(payment, 'Zahvala', ctx);
		expect(failed).toMatchObject({ status: 'FAILED', attempts: MAX_ATTEMPTS, eor: null });
		expect(failed!.zoi).toBe(fiscal.zoi({ ...failed!, subsequent: false }));
		// FURS gets the stored, printed ZOI on every attempt.
		expect(failing.mock.calls.every(([sent]) => sent.zoi === failed!.zoi)).toBe(true);
		expect(failed!.pdf_key).toBe(`invoices/${failed!.id}.pdf`);

		expect(failing).toHaveBeenCalledTimes(MAX_ATTEMPTS);
		const sent = failing.mock.calls.map(([invoice]) => invoice);
		expect(sent.map((i) => i.subsequent)).toEqual([false, true, true, true, true]);
		expect(new Set(sent.map((i) => `${i.sequence}|${i.issued_at.toISOString()}|${i.gross_cents}`)).size).toBe(1);
		// FAILED is final for the job: no further submission from payment.effects.
		await issue(payment, 'Zahvala', ctx);
		expect(failing).toHaveBeenCalledTimes(MAX_ATTEMPTS);
	});

	it('verifies on a retry after one failure (SubsequentSubmit) and stores the EOR', async () => {
		const mock = mockFiscal({ tax_number: '12345678', premise_id: 'X', device_id: 'D1' });
		const flaky = vi
			.fn<FiscalAdapter['issue']>()
			.mockRejectedValueOnce(new Error('furs: timeout'))
			.mockImplementation((invoice) => mock.issue(invoice));
		const { ctx } = fiscalCtx({ issue: flaky });
		const payment = await succeeded();
		await expect(issue(payment, 'Zahvala', ctx)).rejects.toThrow(/timeout/);
		const verified = await issue(payment, 'Zahvala', ctx);
		expect(verified).toMatchObject({ status: 'VERIFIED', attempts: 2, eor: expect.any(String) });
		expect(flaky.mock.calls[1]![0].subsequent).toBe(true);
	});

	it('never verifies a row another provider created, and takes issued_at after the sequence lock', async () => {
		const { ctx, premise_id } = fiscalCtx();
		const before = new Date();
		const payment = await succeeded();
		await issue(payment, 'Zahvala', ctx);
		const row = await invoiceOf(payment.id);
		expect(row.issued_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
		// A mock row seen by the furs provider (and the other way round) is refused before any call.
		const send = vi.fn<FiscalAdapter['issue']>();
		const { ctx: furs } = fiscalCtx({ provider: 'furs', issue: send });
		const other = await succeeded();
		const pending = await prisma.invoices.create({
			data: {
				payment_id: other.id,
				premise_id,
				device_id: 'D1',
				sequence: 900,
				number: `${premise_id}-D1-900`,
				issued_at: new Date(),
				net_cents: 410,
				vat_rate: 22,
				vat_cents: 90,
				gross_cents: 500,
				provider: 'mock',
				zoi: 'a'.repeat(32),
			},
		});
		await expect(issue(other, 'Zahvala', furs)).rejects.toThrow(/belongs to provider mock, not furs/);
		expect(send).not.toHaveBeenCalled();
		expect(await invoiceOf(other.id)).toMatchObject({ id: pending.id, status: 'PENDING', attempts: 0 });
	});

	it('invoices only the purposes in fiscal.invoiced_purposes, and nothing when the provider is off', async () => {
		const key = 'fiscal.invoiced_purposes';
		const before = await prisma.app_config.findUniqueOrThrow({ where: { key } });
		expect(before.value).toEqual(['tip', 'report_contribution', 'support', 'boost', 'subscription']);
		try {
			await prisma.app_config.update({ where: { key }, data: { value: ['support'] } });
			configStore.invalidate();
			const { ctx } = fiscalCtx();
			const tip = await succeeded(500, 'TIP');
			expect(await issue(tip, 'Zahvala', ctx)).toBeNull();
			expect(await prisma.invoices.count({ where: { payment_id: tip.id } })).toBe(0);
			expect(await issue(await succeeded(500, 'SUPPORT'), 'Podpora', ctx)).toMatchObject({ status: 'VERIFIED' });
		} finally {
			await prisma.app_config.update({ where: { key }, data: { value: before.value! } });
			configStore.invalidate();
		}
		const { ctx: off } = fiscalCtx({ provider: 'off' });
		const payment = await succeeded();
		expect(await issue(payment, 'Zahvala', off)).toBeNull();
		expect(await prisma.invoices.count({ where: { payment_id: payment.id } })).toBe(0);
	});
});

/** A promise the test resolves: holds a fiscal call in flight. */
function gate() {
	let open!: () => void;
	const opened = new Promise<void>((resolve) => (open = resolve));
	return { open, opened };
}

describe('in-flight lease (TASK-92.3)', () => {
	it('lets no second attempt run while one is in flight for the same invoice', async () => {
		const mock = mockFiscal({ tax_number: '12345678', premise_id: 'X', device_id: 'D1' });
		const held = gate();
		let premise = '';
		// Holds only this test's invoice; fiscal.resubmit below may also pick up other tests' FAILED rows.
		const slow = vi.fn<FiscalAdapter['issue']>().mockImplementation(async (invoice) => {
			if (invoice.premise_id === premise) await held.opened;
			return mock.issue(invoice);
		});
		const { ctx, premise_id } = fiscalCtx({ issue: slow });
		premise = premise_id;
		const payment = await succeeded();
		const first = issue(payment, 'Zahvala', ctx);
		await vi.waitFor(() => expect(slow).toHaveBeenCalledTimes(1));
		const leased = await invoiceOf(payment.id);
		expect(leased).toMatchObject({ status: 'PENDING', attempts: 1 });
		expect(leased.lease_until!.getTime()).toBeGreaterThan(Date.now());
		// A redelivered or retried payment.effects and a fiscal.resubmit run while the call is in flight: neither sends.
		await expect(issue(payment, 'Zahvala', ctx)).rejects.toThrow(/verification already in progress/);
		await prisma.invoices.update({ where: { id: leased.id }, data: { status: 'FAILED' } });
		await InvoicesDomain.resubmitInvoices(undefined, ctx);
		const calls = () => slow.mock.calls.filter(([invoice]) => invoice.premise_id === premise_id).length;
		expect(calls()).toBe(1);
		await prisma.invoices.update({ where: { id: leased.id }, data: { status: 'PENDING' } });
		held.open();
		expect(await first).toMatchObject({ status: 'VERIFIED', attempts: 1, lease_until: null });
		expect(calls()).toBe(1);
	});

	it('frees the invoice when a crashed attempt’s lease expires, and a failed attempt gives it back at once', async () => {
		const mock = mockFiscal({ tax_number: '12345678', premise_id: 'X', device_id: 'D1' });
		const flaky = vi
			.fn<FiscalAdapter['issue']>()
			.mockRejectedValueOnce(new Error('furs: HTTP 503'))
			.mockImplementation((invoice) => mock.issue(invoice));
		const { ctx } = fiscalCtx({ issue: flaky });
		const payment = await succeeded();
		await expect(issue(payment, 'Zahvala', ctx)).rejects.toThrow(/HTTP 503/);
		const { id } = await invoiceOf(payment.id);
		expect(await invoiceOf(payment.id)).toMatchObject({ attempts: 1, lease_until: null });
		// A run that crashed mid-call left its lease behind: refused until it expires.
		await prisma.invoices.update({ where: { id }, data: { lease_until: new Date(Date.now() + 60_000) } });
		await expect(issue(payment, 'Zahvala', ctx)).rejects.toThrow(/verification already in progress/);
		expect(flaky).toHaveBeenCalledTimes(1);
		await prisma.invoices.update({ where: { id }, data: { lease_until: new Date(Date.now() - 1000) } });
		expect(await issue(payment, 'Zahvala', ctx)).toMatchObject({
			status: 'VERIFIED',
			attempts: 2,
			lease_until: null,
		});
		expect(flaky.mock.calls[1]![0].subsequent).toBe(true);
	});
});

describe('payment.effects retry delay (TASK-92.3)', () => {
	it('comes from app_config fiscal.retry in minutes, with backoff; a malformed value means 2 and 30 minutes', async () => {
		const key = 'fiscal.retry';
		const before = await prisma.app_config.findUniqueOrThrow({ where: { key } });
		expect(before.value).toEqual({ delay_minutes: 2, max_delay_minutes: 30 });
		const fallback = { retryDelay: 120, retryDelayMax: 1800 };
		expect(await InvoicesDomain.retryOptions()).toEqual({ retryBackoff: true, ...fallback });
		try {
			for (const [value, expected] of [
				[
					{ delay_minutes: 5, max_delay_minutes: 20 },
					{ retryDelay: 300, retryDelayMax: 1200 },
				],
				[{ delay_minutes: 0.1, max_delay_minutes: 20 }, fallback],
				[{ delay_minutes: 5, max_delay_minutes: 600 }, fallback],
				['soon', fallback],
			] as const) {
				await prisma.app_config.update({ where: { key }, data: { value } });
				configStore.invalidate();
				expect(await InvoicesDomain.retryOptions()).toEqual({ retryBackoff: true, ...expected });
			}
		} finally {
			await prisma.app_config.update({ where: { key }, data: { value: before.value! } });
			configStore.invalidate();
		}
	});
});

describe('fiscal.resubmit (TASK-92.3)', () => {
	type Patch = { status?: INVOICE_STATUS; hoursAgo?: number; attempts?: number; provider?: string; pdf?: boolean };

	/** An invoice row as payment.effects left it, numbered `sequence` in the premise's series. */
	async function stored(fiscal: FiscalAdapter, sequence: number, patch: Patch = {}) {
		const { status = 'FAILED', hoursAgo = 5, attempts = MAX_ATTEMPTS, provider = 'mock', pdf = true } = patch;
		const payment = await succeeded();
		const data = {
			premise_id: fiscal.premise_id,
			device_id: fiscal.device_id,
			sequence,
			issued_at: new Date(Date.now() - hoursAgo * 3_600_000),
			gross_cents: 500,
			net_cents: 410,
			vat_rate: 22,
			vat_cents: 90,
		};
		return prisma.invoices.create({
			data: {
				...data,
				payment_id: payment.id,
				number: `${fiscal.premise_id}-${fiscal.device_id}-${sequence}`,
				provider,
				zoi: fiscal.zoi({ ...data, subsequent: false }),
				status,
				attempts,
				...(status === 'VERIFIED' && { eor: randomUUID() }),
				...(pdf && { pdf_key: `invoices/${randomUUID()}.pdf` }),
			},
		});
	}

	it('sends FAILED and stale PENDING invoices again as SubsequentSubmit with the stored number and ZOI', async () => {
		const mock = mockFiscal({ tax_number: '12345678', premise_id: 'X', device_id: 'D1' });
		const send = vi.fn<FiscalAdapter['issue']>().mockImplementation((invoice) => mock.issue(invoice));
		const { ctx, fiscal, premise_id } = fiscalCtx({ issue: send });
		const staleHours = STALE_PENDING_MS / 3_600_000 + 1;
		const failed = await stored(fiscal, 1);
		const stale = await stored(fiscal, 2, { status: 'PENDING', hoursAgo: staleHours, attempts: 2, pdf: false });
		const fresh = await stored(fiscal, 3, { status: 'PENDING', hoursAgo: 0.5, attempts: 1 });
		const verified = await stored(fiscal, 4, { status: 'VERIFIED', attempts: 1 });
		const leased = await stored(fiscal, 5);
		await prisma.invoices.update({
			where: { id: leased.id },
			data: { lease_until: new Date(Date.now() + 60_000) },
		});
		const otherProvider = await stored(fiscal, 6, { provider: 'furs' });
		await prisma.invoice_sequences.create({ data: { premise_id, device_id: 'D1', last_sequence: 6 } });

		const result = await InvoicesDomain.resubmitInvoices(undefined, ctx);
		expect(result.resubmitted).toBeGreaterThanOrEqual(2);

		const mine = send.mock.calls.map(([invoice]) => invoice).filter((i) => i.premise_id === premise_id);
		expect(mine.map((i) => i.sequence).sort()).toEqual([1, 2]);
		for (const row of [failed, stale]) {
			const sent = mine.find((i) => i.sequence === row.sequence)!;
			expect(sent).toMatchObject({ subsequent: true, zoi: row.zoi, gross_cents: 500, vat_cents: 90 });
			expect(sent.issued_at.toISOString()).toBe(row.issued_at.toISOString());
			expect(await prisma.invoices.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
				status: 'VERIFIED',
				number: row.number,
				sequence: row.sequence,
				zoi: row.zoi,
				issued_at: row.issued_at,
				attempts: row.attempts + 1,
				lease_until: null,
				eor: expect.any(String),
			});
		}
		for (const row of [fresh, verified, leased, otherProvider])
			expect(await prisma.invoices.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
				status: row.status,
				attempts: row.attempts,
			});
		// No new number or ZOI: the series and its counter are untouched.
		expect(await prisma.invoices.count({ where: { premise_id } })).toBe(6);
		expect(
			await prisma.invoice_sequences.findUniqueOrThrow({
				where: { premise_id_device_id: { premise_id, device_id: 'D1' } },
			})
		).toMatchObject({ last_sequence: 6 });
		// The stale invoice never got its PDF and receipt: payment.effects runs for it again, with the minutes backoff.
		const jobsOf = (payment_id: string) => prisma.$queryRaw<
			{ retry_delay: number; retry_backoff: boolean; retry_delay_max: number }[]
		>`
			select retry_delay, retry_backoff, retry_delay_max from pgboss.job
			where name = 'payment.effects' and data->>'payment_id' = ${payment_id}`;
		expect(await jobsOf(stale.payment_id)).toEqual([
			{ retry_delay: 120, retry_backoff: true, retry_delay_max: 1800 },
		]);
		expect(await jobsOf(failed.payment_id)).toEqual([]);
	});

	it('claims each invoice once when runs overlap, and leaves it FAILED when FURS fails again', async () => {
		const mock = mockFiscal({ tax_number: '12345678', premise_id: 'X', device_id: 'D1' });
		const held = gate();
		let premise = '';
		const send = vi.fn<FiscalAdapter['issue']>().mockImplementation(async (invoice) => {
			if (invoice.premise_id !== premise) return mock.issue(invoice);
			await held.opened;
			throw new Error('furs: HTTP 503');
		});
		const { ctx, fiscal, premise_id } = fiscalCtx({ issue: send });
		premise = premise_id;
		const rows = [await stored(fiscal, 1), await stored(fiscal, 2)];
		const runs = [InvoicesDomain.resubmitInvoices(undefined, ctx), InvoicesDomain.resubmitInvoices(undefined, ctx)];
		await vi.waitFor(async () =>
			expect(await prisma.invoices.count({ where: { premise_id, lease_until: { not: null } } })).toBe(2)
		);
		held.open();
		await Promise.all(runs);
		const mine = send.mock.calls.map(([invoice]) => invoice).filter((i) => i.premise_id === premise_id);
		expect(mine.map((i) => i.sequence).sort()).toEqual([1, 2]);
		for (const row of rows)
			expect(await prisma.invoices.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
				status: 'FAILED',
				attempts: MAX_ATTEMPTS + 1,
				lease_until: null,
				eor: null,
			});
	});

	it('alerts the admins once about invoices unverified 24 h after issue, and again if no email went out', async () => {
		const adminId = await createAuthUser();
		userIds.push(adminId);
		await prisma.profiles.create({ data: { id: adminId, role: 'ADMIN' } });
		const admin = `${adminId}@test.invalid`;
		const down = vi.fn<FiscalAdapter['issue']>().mockRejectedValue(new Error('furs: timeout'));
		const { fiscal } = fiscalCtx({ issue: down });
		const hours = ALERT_AFTER_MS / 3_600_000;
		const old = await stored(fiscal, 1, { hoursAgo: hours + 1 });
		const young = await stored(fiscal, 2, { hoursAgo: hours - 1 });
		const done = await stored(fiscal, 3, { status: 'VERIFIED', hoursAgo: hours + 5, attempts: 1 });

		const broken = { send: vi.fn().mockRejectedValue(new Error('smtp down')) };
		await InvoicesDomain.resubmitInvoices(
			undefined,
			systemCtx({ adapters: { ...adapters, fiscal, email: broken } })
		);
		expect(broken.send).toHaveBeenCalled();
		expect((await prisma.invoices.findUniqueOrThrow({ where: { id: old.id } })).alerted_at).toBeNull();

		const email = mockEmail();
		const ctx = systemCtx({ adapters: { ...adapters, fiscal, email } });
		await InvoicesDomain.resubmitInvoices(undefined, ctx);
		const mail = email.sent!.filter((m) => m.to === admin);
		expect(mail).toHaveLength(1);
		expect(mail[0]!.subject).toMatch(/^Davčno potrjevanje: nepotrjeni računi \(\d+\)$/);
		expect(mail[0]!.text).toContain(`- ${old.number}: FAILED`);
		expect(mail[0]!.html).toContain(old.number);
		expect(mail[0]!.text).not.toContain(young.number);
		expect(mail[0]!.text).not.toContain(done.number);
		expect((await prisma.invoices.findUniqueOrThrow({ where: { id: old.id } })).alerted_at).not.toBeNull();

		await InvoicesDomain.resubmitInvoices(undefined, ctx);
		expect(email.sent!.filter((m) => m.to === admin)).toHaveLength(1);
	});
});

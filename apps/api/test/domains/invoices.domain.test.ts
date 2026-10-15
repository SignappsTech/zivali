// Fiscal invoices (C13 §Fiscal invoices, TASK-92) against the local database: gapless numbering per premise and device
// under concurrency, one invoice per payment, the VAT breakdown, verification retries (same data, SubsequentSubmit),
// FAILED after the last attempt, the PDF in the private bucket, the invoiced-purposes switch and the off provider.
import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import type { FiscalAdapter } from '../../adapters/fiscal/index.ts';
import { mockFiscal } from '../../adapters/fiscal/mock.ts';
import InvoicesDomain, { MAX_ATTEMPTS, vatBreakdown } from '../../domains/payments/invoices.domain.ts';
import type { PAYMENT_PURPOSE } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';

const paymentIds: string[] = [];
const premises: string[] = [];

afterAll(async () => {
	await prisma.invoices.deleteMany({ where: { payment_id: { in: paymentIds } } });
	await prisma.payments.deleteMany({ where: { id: { in: paymentIds } } });
	await prisma.invoice_sequences.deleteMany({ where: { premise_id: { in: premises } } });
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

const invoiceOf = (payment_id: string) => prisma.invoices.findUniqueOrThrow({ where: { payment_id } });
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

// Invoice PDF (C13): what it says (number, issue time, seller, VAT 22 % breakdown, ZOI, EOR or the pending note, the
// test note) and that pdfkit renders it with the embedded font (Slovenian letters included).
import { describe, expect, it } from 'vitest';

import { invoiceLines, renderInvoicePdf, type InvoicePdfInput } from '../../lib/invoice-pdf.ts';

const input: InvoicePdfInput = {
	number: 'SPLET-API1-42',
	issued_at: new Date('2026-10-16T12:05:09Z'),
	item: 'Zahvala za Najdimo',
	tax_number: '12345678',
	premise_id: 'SPLET',
	device_id: 'API1',
	net_cents: 410,
	vat_rate: 22,
	vat_cents: 90,
	gross_cents: 500,
	zoi: 'a7e5f55e1dbb48b799268e1a6d8618a3',
	eor: 'eb6fbd57-2aa9-4c4b-9b93-a9d8d6d4c7b1',
	test: false,
};
const text = (i: InvoicePdfInput) => invoiceLines(i).map((l) => l.text);

describe('invoice PDF', () => {
	it('lists the number, issue time, seller, VAT breakdown, payment method, ZOI and EOR', () => {
		expect(text(input)).toEqual([
			'Najdimo',
			'Račun št. SPLET-API1-42',
			'Izdajatelj: Najdimo, davčna številka 12345678',
			'Datum in čas izdaje: 16. 10. 2026, 14:05:09',
			'Poslovni prostor: SPLET, elektronska naprava: API1',
			'Postavka: Zahvala za Najdimo',
			// formatEur (C16): a no-break space before the sign.
			'Znesek brez DDV: 4,10 €',
			'DDV 22 %: 0,90 €',
			'Skupaj: 5,00 €',
			'Način plačila: plačilna kartica',
			'ZOI: a7e5f55e1dbb48b799268e1a6d8618a3',
			'EOR: eb6fbd57-2aa9-4c4b-9b93-a9d8d6d4c7b1',
		]);
	});

	it('says so when FURS has not confirmed it yet, and marks test invoices', () => {
		const lines = text({ ...input, eor: null, test: true });
		expect(lines[2]).toMatch(/^Testni račun/);
		expect(lines.at(-1)).toBe('EOR: račun bo naknadno potrjen pri FURS.');
	});

	it('prints a credit note with negative amounts and the invoice it corrects (TASK-92.4)', () => {
		const note = {
			...input,
			number: 'SPLET-API1-57',
			issued_at: new Date('2026-10-20T08:00:00Z'),
			net_cents: -164,
			vat_cents: -36,
			gross_cents: -200,
			reference: { number: 'SPLET-API1-42', issued_at: input.issued_at },
		};
		expect(text(note)).toEqual([
			'Najdimo',
			'Dobropis št. SPLET-API1-57',
			'Za račun št. SPLET-API1-42 z dne 16. 10. 2026, 14:05:09',
			'Izdajatelj: Najdimo, davčna številka 12345678',
			'Datum in čas izdaje: 20. 10. 2026, 10:00:00',
			'Poslovni prostor: SPLET, elektronska naprava: API1',
			'Vračilo: Zahvala za Najdimo',
			// U+2212 minus and the no-break space of formatEur.
			'Znesek brez DDV: −1,64 €',
			'DDV 22 %: −0,36 €',
			'Skupaj: −2,00 €',
			'Način vračila: na plačilno kartico',
			'ZOI: a7e5f55e1dbb48b799268e1a6d8618a3',
			'EOR: eb6fbd57-2aa9-4c4b-9b93-a9d8d6d4c7b1',
		]);
		const pending = text({ ...note, eor: null, test: true });
		expect(pending[2]).toMatch(/^Testni dobropis/);
		expect(pending.at(-1)).toBe('EOR: dobropis bo naknadno potrjen pri FURS.');
	});

	it('renders an A4 PDF with the embedded font', async () => {
		const pdf = await renderInvoicePdf(input);
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
		expect(pdf.subarray(-6).toString()).toMatch(/%%EOF/);
		const raw = pdf.toString('latin1');
		expect(raw).toContain('AtkinsonHyperlegibleNext');
		expect(raw).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
	});
});

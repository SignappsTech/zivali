// Fiscal invoice PDF (C13), rendered by the worker in payment.effects with pdfkit. Slovenian (the invoice is issued in
// Slovenia); the brand font Atkinson Hyperlegible Next (OFL, assets/fonts) carries č, š and ž, which the PDF standard
// fonts lack. The fonts are found relative to this file: lib/ here and the bundled dist/ both sit one level below the
// app root, where the image copies assets/ (Dockerfile).
import { fileURLToPath } from 'node:url';

import { formatEur } from '@zivali/i18n/format';

const font = (file: string) => fileURLToPath(new URL(`../assets/fonts/${file}`, import.meta.url));
const FONTS = {
	regular: font('AtkinsonHyperlegibleNext_400Regular.ttf'),
	bold: font('AtkinsonHyperlegibleNext_700Bold.ttf'),
};

export type InvoicePdfInput = {
	number: string;
	issued_at: Date;
	/** Line item, e.g. "Zahvala za Najdimo". */
	item: string;
	tax_number: string;
	premise_id: string;
	device_id: string;
	net_cents: number;
	vat_rate: number;
	vat_cents: number;
	gross_cents: number;
	zoi: string;
	/** Null while FURS has not confirmed the invoice (FAILED: subsequent submission). */
	eor: string | null;
	/** Mock or FURS test environment: not a valid fiscal invoice. */
	test: boolean;
	/** A credit note (dobropis, negative amounts): the invoice it corrects. */
	reference?: { number: string; issued_at: Date };
};
export type PdfLine = { text: string; style?: 'title' | 'heading' | 'strong' | 'note' };

const issuedAt = new Intl.DateTimeFormat('sl', {
	day: 'numeric',
	month: 'numeric',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	timeZone: 'Europe/Ljubljana',
});

/** What the invoice says, top to bottom (tests read this; the PDF content stream is glyph ids). */
export function invoiceLines(i: InvoicePdfInput): PdfLine[] {
	const eur = (cents: number) => formatEur(cents, 'sl');
	const credit = i.reference;
	const kind = credit ? 'Dobropis' : 'Račun';
	return [
		{ text: 'Najdimo', style: 'title' },
		{ text: `${kind} št. ${i.number}`, style: 'heading' },
		...(i.test
			? [
					{
						text: credit
							? 'Testni dobropis: na kartico ni bilo vračila, dobropis ni davčno veljaven.'
							: 'Testni račun: kartica ni bila bremenjena, račun ni davčno veljaven.',
						style: 'note',
					} as const,
				]
			: []),
		...(credit ? [{ text: `Za račun št. ${credit.number} z dne ${issuedAt.format(credit.issued_at)}` }] : []),
		{ text: `Izdajatelj: Najdimo, davčna številka ${i.tax_number}` },
		{ text: `Datum in čas izdaje: ${issuedAt.format(i.issued_at)}` },
		{ text: `Poslovni prostor: ${i.premise_id}, elektronska naprava: ${i.device_id}` },
		{ text: credit ? `Vračilo: ${i.item}` : `Postavka: ${i.item}` },
		{ text: `Znesek brez DDV: ${eur(i.net_cents)}` },
		{ text: `DDV ${i.vat_rate} %: ${eur(i.vat_cents)}` },
		{ text: `Skupaj: ${eur(i.gross_cents)}`, style: 'strong' },
		{ text: credit ? 'Način vračila: na plačilno kartico' : 'Način plačila: plačilna kartica' },
		{ text: `ZOI: ${i.zoi}` },
		{ text: i.eor ? `EOR: ${i.eor}` : `EOR: ${kind.toLowerCase()} bo naknadno potrjen pri FURS.` },
	];
}

const STYLE = {
	title: { font: 'bold', size: 22, gap: 0.2 },
	heading: { font: 'bold', size: 15, gap: 0.8 },
	strong: { font: 'bold', size: 11, gap: 0.4 },
	note: { font: 'regular', size: 10, gap: 0.8 },
	body: { font: 'regular', size: 11, gap: 0.4 },
} as const;

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
	// Loaded on the first invoice, so the API process does not load pdfkit at boot.
	const { default: PDFDocument } = await import('pdfkit');
	const doc = new PDFDocument({
		size: 'A4',
		margin: 56,
		info: { Title: `${input.reference ? 'Dobropis' : 'Račun'} ${input.number}`, Author: 'Najdimo' },
	});
	doc.registerFont('regular', FONTS.regular);
	doc.registerFont('bold', FONTS.bold);
	const chunks: Buffer[] = [];
	doc.on('data', (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
	});
	for (const line of invoiceLines(input)) {
		const style = STYLE[line.style ?? 'body'];
		doc.font(style.font).fontSize(style.size).text(line.text).moveDown(style.gap);
	}
	doc.end();
	return done;
}

// P18 A4 poster (FR-011, TASK-24.2), rendered with pdfkit in the poster.pdf route. Print tokens only (paper, ink, one
// mid-grey), so it reads the same in greyscale; status is the top-band word, never a colour. No phone, email, chip
// number, collar text (an ownership check), exact address or holding place: only public fields and the fuzzed area's
// name. The brand fonts (OFL, assets/fonts) carry č, š and ž, which the PDF standard fonts lack.
import { join } from 'node:path';

import PDFDocument from 'pdfkit';
import { create as createQr } from 'qrcode';

import { type Locale, timeZone } from '@zivali/i18n/format';
import { colors } from '@zivali/tokens/values';
import type { PublicReport } from '@zivali/types';
import type { ReportPlace } from '@/lib/report';
import { posterBand, printedLink, reportLink, translator } from '@/lib/share';

const font = (file: string) => join(process.cwd(), 'assets/fonts', file);
const FONTS = {
	sans: font('AtkinsonHyperlegibleNext_400Regular.ttf'),
	sansBold: font('AtkinsonHyperlegibleNext_700Bold.ttf'),
	display: font('BricolageGrotesque_700Bold.ttf'),
	displayHeavy: font('BricolageGrotesque_800ExtraBold.ttf'),
};
const PAPER = colors.light.qr;
const INK = colors.light['qr-foreground'];
const GREY = colors.light.input;
const SILENT_PATTERNS = new Set(['solid', 'bicolour', 'tricolour']);

/** What the poster says, zone by zone (tests read this; the PDF content stream is glyph ids). */
export type PosterContent = {
	lang: Locale;
	/** PDF title: "Pogrešan pes Rex – Najdimo". */
	title: string;
	band: string;
	/** Reunited: "Spet doma" with the thanks instead of the appeal, no QR. */
	home: boolean;
	name?: string;
	cta?: string;
	/** Encoded in the QR: the short canonical link. */
	url: string;
	/** Printed under the QR: the link without its scheme. */
	link: string;
	facts: string[];
	where: string[];
	reward?: { amount: string; note?: string };
	safety?: string;
	thanks?: string;
	footer: string;
};

/** The print date (mockup A1, A2): "12. 10." / "12 Oct", with the year when it is not this year. */
function posterDate(date: string, lang: Locale): string {
	const year = (value: Date) => new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(value);
	return new Intl.DateTimeFormat(lang === 'sl' ? 'sl' : 'en-GB', {
		day: 'numeric',
		month: lang === 'sl' ? 'numeric' : 'short',
		year: year(new Date(date)) === year(new Date()) ? undefined : 'numeric',
		timeZone,
	}).format(new Date(date));
}

export function posterContent(report: PublicReport, place: ReportPlace | undefined, lang: Locale): PosterContent {
	const t = translator(lang);
	const { species } = report;
	const band = posterBand(report, lang);
	const home = report.status === 'reunited';
	const lower = (text: string) => text.toLocaleLowerCase(lang);
	const base = {
		lang,
		title: `${[band, report.name].filter(Boolean).join(' ')} – Najdimo`,
		band,
		home,
		url: reportLink(report.short_code),
		link: printedLink(report.short_code),
		footer: t('poster.footer'),
	};
	if (home)
		return {
			...base,
			name: report.name && t('poster.home_named', { name: report.name }),
			facts: [],
			where: [],
			thanks: t('poster.home_thanks'),
		};

	const colours = [
		report.colours.length
			? new Intl.ListFormat(lang === 'sl' ? 'sl' : 'en-GB', { type: 'conjunction' }).format(
					report.colours.map((code) => lower(t(`attributes.colours.${code}`)))
				)
			: '',
		report.pattern && !SILENT_PATTERNS.has(report.pattern) ? lower(t(`attributes.patterns.${report.pattern}`)) : '',
	]
		.filter(Boolean)
		.join(', ');
	type Key = Parameters<typeof t>[0];
	const breed = report.breed_codes
		.filter((code) => !code.endsWith('.unknown') && t.has(`breeds.${code}` as Key))
		.map((code) => t(`breeds.${code}` as Key))
		.join(', ');
	const facts = [
		colours && t('poster.fact_colour', { colours }),
		report.size && t('poster.fact_size', { size: lower(t(`attributes.size.${report.size}`)) }),
		breed && t('poster.fact_breed', { breed }),
	].filter((fact): fact is string => !!fact);

	const date = posterDate(report.event_at, lang);
	// A settlement that is its own municipality is named once ("Območje: Kranj (približno)").
	const area = place && t('poster.area', place);
	const areaLine =
		place && area && place.area === place.municipality
			? area.replace(`${place.area}, ${place.municipality}`, place.area)
			: area;
	const where = [
		report.type === 'lost' && t('poster.since_lost', { species, date }),
		report.type === 'found' && t('poster.since_found', { species, date }),
		areaLine,
	].filter((line): line is string => !!line);

	const reward = report.type === 'lost' ? report.reward : undefined;
	const amount =
		reward?.eur != null
			? new Intl.NumberFormat(lang === 'sl' ? 'sl-SI' : 'en-GB', {
					style: 'currency',
					currency: 'EUR',
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
				}).format(reward.eur)
			: undefined;

	return {
		...base,
		name: report.name,
		cta: t(report.type === 'lost' ? 'poster.cta_lost' : 'poster.cta_found', { species }),
		facts,
		where,
		reward: reward && {
			amount: amount ? t('poster.reward_amount', { amount }) : t('poster.reward'),
			note: reward.note ?? undefined,
		},
		safety: reward ? t('poster.safety_reward') : t('poster.safety'),
	};
}

const mm = (value: number) => (value * 72) / 25.4;
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = mm(12);
const WIDTH = PAGE.width - 2 * MARGIN;

// The logo mark (docs/design/brand), 48 units: head with the eye cut out, two ears, the dot in the eye.
const MARK = [
	'M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z',
	'M12.2 19.6 L11.2 5 L22.6 11.4 Z',
	'M35.8 19.6 L25.4 11.4 L36.8 5 Z',
];

type Doc = PDFKit.PDFDocument;
type Block = { font: string; size: number; lineHeight: number; width: number; lines?: number; align?: 'center' };

/** The block's height at a CSS-like line height (pdfkit spaces lines by the font's own metrics plus `lineGap`). */
function measure(doc: Doc, text: string, block: Block): number {
	doc.font(block.font).fontSize(block.size);
	const lineGap = block.size * block.lineHeight - doc.currentLineHeight(true);
	const height = doc.heightOfString(text, { width: block.width, lineGap });
	return block.lines ? Math.min(height, block.lines * block.size * block.lineHeight) : height;
}

/** Draws a text block with its top at `y`, half the leading above the first line as in CSS; returns its height. */
function draw(doc: Doc, text: string, x: number, y: number, block: Block): number {
	const height = measure(doc, text, block);
	const lineGap = block.size * block.lineHeight - doc.currentLineHeight(true);
	doc.fillColor(INK).text(text, x, y + lineGap / 2, {
		width: block.width,
		lineGap,
		align: block.align,
		// pdfkit fits the last line by the font's own line height, so the limit gets back the trimmed leading.
		...(block.lines && { height: height - lineGap + 1 }),
	});
	return height;
}

/** The QR code (ECC M) as ink runs on paper; the page margin and the gaps keep its 4-module quiet zone white. */
function drawQr(doc: Doc, url: string, x: number, y: number, size: number) {
	const { modules } = createQr(url, { errorCorrectionLevel: 'M' });
	const unit = size / modules.size;
	for (let row = 0; row < modules.size; row++)
		for (let col = 0; col < modules.size; col++) {
			if (!modules.get(row, col) || (col > 0 && modules.get(row, col - 1))) continue;
			let end = col;
			while (end + 1 < modules.size && modules.get(row, end + 1)) end++;
			doc.rect(x + col * unit, y + row * unit, (end - col + 1) * unit, unit);
		}
	doc.fill(INK);
}

function drawMark(doc: Doc, x: number, y: number, size: number) {
	doc.save()
		.translate(x, y)
		.scale(size / 48);
	doc.lineWidth(1.6).lineJoin('round');
	for (const d of MARK) doc.path(d).fillAndStroke(INK, INK, 'even-odd');
	doc.circle(24, 24.4, 3.6).fill(INK);
	doc.restore();
}

/**
 * The A4 page (P18 §Poster layout, mockup section 4): top band; the photo (114 mm wide, 119 to 152 mm high, taking the
 * spare height) beside the call to action, the 56 mm QR and the printed link; name, facts beside where and when,
 * reward and safety line; the footer on the bottom edge. Reunited: band, the photo alone, "Rex je spet doma." and the
 * thanks. Omitted zones close up and the photo takes the space.
 */
export function renderPosterPdf(content: PosterContent, photo: Buffer): Promise<Buffer> {
	const doc = new PDFDocument({
		size: 'A4',
		margin: 0,
		font: FONTS.sans,
		lang: content.lang,
		displayTitle: true,
		info: { Title: content.title, Author: 'Najdimo' },
	});
	for (const [name, file] of Object.entries(FONTS)) doc.registerFont(name, file);
	const chunks: Buffer[] = [];
	doc.on('data', (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
	});
	doc.rect(0, 0, PAGE.width, PAGE.height).fill(PAPER);

	// Top band: 80 pt, one line; a long word shrinks to the width.
	const bandSize = Math.min(80, (80 * WIDTH) / doc.font('displayHeavy').fontSize(80).widthOfString(content.band));
	let y = MARGIN;
	y += draw(doc, content.band, MARGIN, y, { font: 'displayHeavy', size: bandSize, lineHeight: 0.9, width: WIDTH });
	y += mm(5);

	// Measure what follows the photo row first, so the photo gets the spare height. A long name shrinks to one line
	// (down to 48 pt), then wraps to two.
	let name: Block = { font: 'display', size: 72, lineHeight: 0.92, width: WIDTH, lines: 2 };
	while (content.name && name.size > 48 && measure(doc, content.name, { ...name, lines: undefined }) > name.size)
		name = { ...name, size: name.size - 4 };
	const half = (WIDTH - mm(8)) / 2;
	const details: Block = { font: 'sans', size: 22, lineHeight: 1.2, width: half };
	const small: Block = { font: 'sans', size: 12, lineHeight: 1.3, width: WIDTH };
	const thanks: Block = { font: 'sans', size: 26, lineHeight: 1.2, width: WIDTH };
	const facts = content.facts.join('\n');
	const where = content.where.join('\n');
	const footerHeight = mm(3) + 12 * 1.3;
	const footerTop = PAGE.height - MARGIN - footerHeight;
	const below =
		(content.name ? mm(6) + measure(doc, content.name, name) : 0) +
		(facts || where
			? (content.name ? mm(4) : mm(6)) + Math.max(measure(doc, facts, details), measure(doc, where, details))
			: 0) +
		(content.reward ? mm(5) + 28 * 1.1 : 0) +
		(content.safety ? mm(3) + measure(doc, content.safety, small) : 0) +
		(content.thanks ? mm(4) + measure(doc, content.thanks, thanks) : 0) +
		mm(5);
	// The action column beside the photo: call to action, the 56 mm QR, the printed link.
	const cta: Block = { font: 'display', size: 26, lineHeight: 1.04, width: mm(64) };
	const link: Block = { font: 'sansBold', size: 14, lineHeight: 1.2, width: mm(64), align: 'center' };
	const ctaHeight = content.cta ? measure(doc, content.cta, cta) : 0;
	const column = content.cta ? ctaHeight + mm(8) + mm(56) + mm(8.5) + 14 * 1.2 : 0;
	// 119 to 152 mm (139.5 alone); below 119 only when long texts would otherwise run off the page, never below the
	// action column, so the QR keeps its size.
	const photoWidth = content.home ? WIDTH : mm(114);
	const spare = footerTop - below - y;
	const photoHeight =
		spare >= mm(119) ? Math.min(content.home ? mm(139.5) : mm(152), spare) : Math.max(spare, column);

	doc.save().roundedRect(MARGIN, y, photoWidth, photoHeight, mm(5)).clip();
	doc.image(photo, MARGIN, y, { cover: [photoWidth, photoHeight], align: 'center', valign: 'center' });
	doc.restore();

	if (content.cta) {
		const x = MARGIN + mm(122);
		let top = y + Math.max(0, photoHeight - column);
		top += draw(doc, content.cta, x, top, cta) + mm(8);
		drawQr(doc, content.url, x + mm(4), top, mm(56));
		draw(doc, content.link, x, top + mm(56) + mm(8.5), link);
	}
	y += photoHeight;

	if (content.name) y += mm(6) + draw(doc, content.name, MARGIN, y + mm(6), name);
	if (facts || where) {
		y += content.name ? mm(4) : mm(6);
		y += Math.max(draw(doc, facts, MARGIN, y, details), draw(doc, where, MARGIN + half + mm(8), y, details));
	}
	if (content.reward) {
		// Amount 28 pt and the owner's note 14 pt on one baseline; the note is user text, cut to the line.
		y += mm(5);
		const baseline = y + 28 * 0.85;
		doc.font('sansBold').fontSize(28).fillColor(INK);
		doc.text(content.reward.amount, MARGIN, baseline, { baseline: 'alphabetic', lineBreak: false });
		const noteX = MARGIN + doc.widthOfString(content.reward.amount) + mm(3);
		if (content.reward.note) {
			doc.font('sans').fontSize(14);
			let note = `· ${content.reward.note}`;
			while (note.length > 3 && doc.widthOfString(note) > MARGIN + WIDTH - noteX) note = `${note.slice(0, -2)}…`;
			doc.text(note, noteX, baseline, { baseline: 'alphabetic', lineBreak: false });
		}
		y += 28 * 1.1;
	}
	if (content.safety) y += mm(3) + draw(doc, content.safety, MARGIN, y + mm(3), small);
	if (content.thanks) draw(doc, content.thanks, MARGIN, y + mm(4), thanks);

	// Footer on the bottom edge: the mid-grey rule, the logo mark and "Najdimo · Spet doma.".
	doc.moveTo(MARGIN, footerTop)
		.lineTo(MARGIN + WIDTH, footerTop)
		.lineWidth(mm(0.4))
		.strokeColor(GREY)
		.stroke();
	drawMark(doc, MARGIN, footerTop + mm(3) - mm(0.6), mm(6));
	draw(doc, content.footer, MARGIN + mm(8), footerTop + mm(3), { ...small, font: 'sansBold' });

	doc.end();
	return done;
}

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
	/** "Pogrešan od 12. 10." (lost and found only; printed bold beside a calendar). */
	when?: string;
	/** The fuzzed area's name, never an address (beside a map pin). */
	area?: string;
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
	const when =
		report.type === 'lost'
			? t('poster.since_lost', { species, date })
			: report.type === 'found'
				? t('poster.since_found', { species, date })
				: undefined;

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
		when,
		area: areaLine || undefined,
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
// The ink band (186 × 28 mm): its text sits inside a 1.2 mm frame and 5 mm padding, as in the wireframe.
const BAND_HEIGHT = mm(28);
const BAND_INSET = mm(1.2 + 5);
const ROW_TOP = MARGIN + BAND_HEIGHT + mm(5);
// Footer: the 0.4 mm hairline, 3 mm, then the 6 mm mark; its bottom on the safe area's edge.
const FOOTER_HEIGHT = mm(0.4 + 3 + 6);
const FOOTER_TOP = PAGE.height - MARGIN - FOOTER_HEIGHT;
const COLUMN = { x: MARGIN + mm(122), width: mm(64) };
const QR_SIZE = mm(56);
const FACT_WIDTH = (WIDTH - mm(12)) / 3;

// The logo mark (docs/design/brand), 48 units: head with the eye cut out, two ears, the dot in the eye.
const MARK = [
	'M24 45.5 C24 45.5 10.5 33.2 10.5 24.4 A13.5 13.5 0 0 1 37.5 24.4 C37.5 33.2 24 45.5 24 45.5 Z M24 17.9 A6.5 6.5 0 1 0 24 30.9 A6.5 6.5 0 1 0 24 17.9 Z',
	'M12.2 19.6 L11.2 5 L22.6 11.4 Z',
	'M35.8 19.6 L25.4 11.4 L36.8 5 Z',
];
// Phosphor icons (MIT, as in @phosphor-icons/react), 256 units: regular, the arrow bold.
const ICONS = {
	calendar:
		'M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z',
	pin: 'M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z',
	shield: 'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z',
	arrow: 'M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z',
};

type Doc = PDFKit.PDFDocument;
/** A text block in CSS terms: size in pt, unitless line height, letter spacing in em. */
type Block = {
	font: string;
	size: number;
	lineHeight: number;
	width: number;
	lines?: number;
	align?: 'center' | 'right';
	spacing?: number;
	color?: string;
};
type Box = { x: number; y: number; width: number; height: number };

// The zones' type (P18 wireframe v1, S2).
const QUESTION: Block = { font: 'display', size: 26, lineHeight: 1.02, width: COLUMN.width, spacing: -0.015 };
const ACTION: Block = { font: 'sans', size: 14, lineHeight: 1.25, width: COLUMN.width - mm(11) };
const LINK: Block = { font: 'sansBold', size: 19, lineHeight: 1.2, width: COLUMN.width, spacing: 0.05 };
const LINE: Block = { font: 'sans', size: 20, lineHeight: 1.2, width: WIDTH - mm(9.5) };
const LABEL: Block = { font: 'sansBold', size: 10.5, lineHeight: 1.3, width: FACT_WIDTH, spacing: 0.08 };
const VALUE: Block = { font: 'sans', size: 20, lineHeight: 1.2, width: FACT_WIDTH, lines: 3 };
const AMOUNT: Block = { font: 'sansBold', size: 24, lineHeight: 1.1, width: WIDTH };
const SAFETY: Block = { font: 'sans', size: 12, lineHeight: 1.3, width: WIDTH - mm(7.5) };
const THANKS: Block = { font: 'sans', size: 24, lineHeight: 1.2, width: WIDTH };
const FOOTER: Block = { font: 'sansBold', size: 12, lineHeight: 1.3, width: WIDTH };
const band = (size: number): Block => ({
	font: 'displayHeavy',
	size,
	lineHeight: 1.05,
	width: WIDTH - 2 * BAND_INSET,
	spacing: 0.005,
	color: PAPER,
});
const nameBlock = (size: number): Block => ({
	font: 'display',
	size,
	lineHeight: 0.95,
	width: WIDTH,
	lines: 2,
	spacing: -0.025,
});

/** Sets the block's font; pdfkit spaces lines by the font's own metrics plus `lineGap`, so this gives CSS spacing. */
function textOptions(doc: Doc, block: Block) {
	doc.font(block.font).fontSize(block.size);
	return {
		width: block.width,
		lineGap: block.size * block.lineHeight - doc.currentLineHeight(true),
		characterSpacing: (block.spacing ?? 0) * block.size,
	};
}

/** The block's height at its CSS line height. */
function measure(doc: Doc, text: string, block: Block): number {
	const height = doc.heightOfString(text, textOptions(doc, block));
	return block.lines ? Math.min(height, block.lines * block.size * block.lineHeight) : height;
}

/** One line's width, without wrapping. */
function lineWidth(doc: Doc, text: string, block: Block): number {
	return doc.widthOfString(text, textOptions(doc, block));
}

/** From the top of the block's first line box to its baseline (half the leading, then the ascent). */
function baselineOf(doc: Doc, block: Block): number {
	const { lineGap } = textOptions(doc, block);
	return lineGap / 2 + ((doc as unknown as { _font: { ascender: number } })._font.ascender * block.size) / 1000;
}

/** Draws a text block with its top at `y`, half the leading above the first line as in CSS; returns its height. */
function draw(doc: Doc, text: string, x: number, y: number, block: Block): number {
	const height = measure(doc, text, block);
	const options = textOptions(doc, block);
	doc.fillColor(block.color ?? INK).text(text, x, y + options.lineGap / 2, {
		...options,
		align: block.align,
		// pdfkit fits the last line by the font's own line height, so the limit gets back the trimmed leading.
		...(block.lines && { height: height - options.lineGap + 1 }),
	});
	return height;
}

/** "Ste ga videli? Skenirajte kodo." → the question and the action (the wireframe's split; no new message keys). */
function cut(text: string, separator: string, keep = 0): [string, string] {
	const at = text.indexOf(separator);
	return at < 0 ? ['', text] : [text.slice(0, at + keep), text.slice(at + separator.length)];
}

/** The QR code (ECC M) as ink runs on paper; the gaps around it keep its 4-module quiet zone white. */
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

function drawIcon(doc: Doc, path: string, x: number, y: number, size: number) {
	doc.save()
		.translate(x, y)
		.scale(size / 256);
	doc.path(path).fill(INK);
	doc.restore();
}

/** Where each zone sits, in pt from the page's top left (the drawing and the layout tests read the same numbers). */
export type PosterLayout = {
	band: Box & { size: number };
	photo: Box;
	/** The 64 mm column beside the photo: question, action and arrow at the top; QR and link level with its bottom. */
	scan?: { question: Box; action: Box; arrow: Box; qr: Box; link: Box & { scale: number } };
	name?: Box & { size: number };
	thanks?: Box;
	when?: Box;
	area?: Box;
	facts?: Box;
	reward?: Box;
	safety?: Box;
	/** The last zone's bottom plus its 5 mm gap; never below the footer's top when the page fits. */
	end: number;
	footer: Box;
};

/**
 * The A4 page (P18 wireframe v1, sheet S2): the ink band; the photo (114 mm wide, 100 to 140 mm high from the spare
 * height, never shorter than the scan column) beside the scan column; the name; when and where; the labelled facts;
 * the reward box; the safety line; the footer on the safe area's bottom edge. A long name shrinks to one line down to
 * 56 pt, then wraps to two lines (down to 44 pt); if the page would still run over, the photo gives up height first,
 * then the name shrinks to 44 pt. Reunited: the band, the photo alone at full width (120 to 150 mm), the name, the
 * thanks.
 */
function layOut(doc: Doc, content: PosterContent): PosterLayout {
	let bandSize = 64;
	const bandText = content.band.toLocaleUpperCase(content.lang);
	while (bandSize > 40 && lineWidth(doc, bandText, band(bandSize)) > band(bandSize).width) bandSize -= 2;

	// The scan column's own height sets the photo's least height.
	const [question, action] = content.cta ? cut(content.cta, '? ', 1) : ['', ''];
	const questionHeight = question ? measure(doc, question, QUESTION) : 0;
	const actionHeight = action ? measure(doc, action, ACTION) : 0;
	const actionRow = action ? Math.max(actionHeight, mm(9)) : 0;
	const top = questionHeight + (action ? mm(2.5) + actionRow : 0);
	const [prefix, code] = cut(content.link, '/r/', 3);
	const linkWidth =
		lineWidth(doc, prefix, { ...LINK, font: 'sans', size: 14, spacing: 0 }) + lineWidth(doc, code, LINK);
	const linkScale = Math.min(1, COLUMN.width / linkWidth);
	const linkHeight = LINK.size * linkScale * LINK.lineHeight;
	const rowMin = content.home ? mm(120) : Math.max(mm(100), top + mm(8) + QR_SIZE + mm(8.5) + linkHeight);
	const rowMax = content.home ? mm(150) : mm(140);

	const facts = content.facts.map((fact) => cut(fact, ': '));
	const factsHeight = Math.max(
		0,
		...facts.map(([label, value]) => (label ? LABEL.size * LABEL.lineHeight : 0) + measure(doc, value, VALUE))
	);
	const stack = (nameSize: number, from: number) => {
		const zones: Pick<PosterLayout, 'name' | 'thanks' | 'when' | 'area' | 'facts' | 'reward' | 'safety'> = {};
		let y = from;
		const place = (gap: number, height: number, x = MARGIN, width = WIDTH): Box => {
			y += gap;
			const box = { x, y, width, height };
			y += height;
			return box;
		};
		if (content.name)
			zones.name = { ...place(mm(5), measure(doc, content.name, nameBlock(nameSize))), size: nameSize };
		if (content.thanks) zones.thanks = place(mm(4), measure(doc, content.thanks, THANKS));
		const lineGap = () => (zones.when ? mm(1) : content.name ? mm(3) : mm(6));
		const lineX = MARGIN + mm(9.5);
		if (content.when)
			zones.when = place(lineGap(), measure(doc, content.when, { ...LINE, font: 'sansBold' }), lineX, LINE.width);
		if (content.area) zones.area = place(lineGap(), measure(doc, content.area, LINE), lineX, LINE.width);
		if (facts.length) zones.facts = place(mm(4), mm(3.4) + factsHeight);
		if (content.reward) zones.reward = place(mm(5), mm(1.2 + 4.5) + AMOUNT.size * AMOUNT.lineHeight);
		if (content.safety)
			zones.safety = place(mm(3), measure(doc, content.safety, SAFETY), MARGIN + mm(7.5), SAFETY.width);
		return { zones, end: y + mm(5) };
	};
	const spare = (nameSize: number) => FOOTER_TOP - stack(nameSize, ROW_TOP).end;

	let nameSize = 72;
	if (content.name) {
		const name = content.name;
		const oneLine = () => lineWidth(doc, name, nameBlock(nameSize)) <= WIDTH;
		const lines = () =>
			Math.round(measure(doc, name, { ...nameBlock(nameSize), lines: undefined }) / (nameSize * 0.95));
		while (nameSize > 56 && !oneLine()) nameSize -= 2;
		if (!oneLine()) while (nameSize > 44 && lines() > 2) nameSize -= 2;
		while (nameSize > 44 && spare(nameSize) < rowMin) nameSize -= 2;
	}
	const rowHeight = Math.min(rowMax, Math.max(rowMin, spare(nameSize)));
	const rowBottom = ROW_TOP + rowHeight;
	const { zones, end } = stack(nameSize, rowBottom);

	let scan: PosterLayout['scan'];
	if (content.cta) {
		const actionTop = ROW_TOP + questionHeight + mm(2.5);
		const actionWidth = Math.min(lineWidth(doc, action, ACTION), ACTION.width);
		const link = {
			x: COLUMN.x,
			y: rowBottom - linkHeight,
			width: COLUMN.width,
			height: linkHeight,
			scale: linkScale,
		};
		scan = {
			question: { x: COLUMN.x, y: ROW_TOP, width: COLUMN.width, height: questionHeight },
			action: { x: COLUMN.x, y: actionTop + actionRow - actionHeight, width: actionWidth, height: actionHeight },
			arrow: { x: COLUMN.x + actionWidth + mm(2), y: actionTop + actionRow - mm(9), width: mm(9), height: mm(9) },
			qr: { x: COLUMN.x + mm(4), y: link.y - mm(8.5) - QR_SIZE, width: QR_SIZE, height: QR_SIZE },
			link,
		};
	}
	return {
		band: { x: MARGIN, y: MARGIN, width: WIDTH, height: BAND_HEIGHT, size: bandSize },
		photo: { x: MARGIN, y: ROW_TOP, width: content.home ? WIDTH : mm(114), height: rowHeight },
		scan,
		...zones,
		end,
		footer: { x: MARGIN, y: FOOTER_TOP, width: WIDTH, height: FOOTER_HEIGHT },
	};
}

function createDoc(content: PosterContent): Doc {
	const doc = new PDFDocument({
		size: 'A4',
		margin: 0,
		font: FONTS.sans,
		lang: content.lang,
		displayTitle: true,
		info: { Title: content.title, Author: 'Najdimo' },
	});
	for (const [name, file] of Object.entries(FONTS)) doc.registerFont(name, file);
	return doc;
}

/** The page's zones for a poster (tests check them against the wireframe's numbers and the A4 safe area). */
export function posterLayout(content: PosterContent): PosterLayout {
	const doc = createDoc(content);
	const layout = layOut(doc, content);
	doc.end();
	return layout;
}

/** Draws the poster at its layout, zone by zone (the numbers are the wireframe's changes on S2). */
export function renderPosterPdf(content: PosterContent, photo: Buffer): Promise<Buffer> {
	const doc = createDoc(content);
	const chunks: Buffer[] = [];
	doc.on('data', (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Buffer>((resolve, reject) => {
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
	});
	const layout = layOut(doc, content);
	doc.rect(0, 0, PAGE.width, PAGE.height).fill(PAPER);

	// 1 Band: ink block, the status word in paper colour, capitals, centred in the band's height.
	const { band: bandBox } = layout;
	doc.roundedRect(bandBox.x, bandBox.y, bandBox.width, bandBox.height, mm(3)).fill(INK);
	const bandType = band(bandBox.size);
	draw(
		doc,
		content.band.toLocaleUpperCase(content.lang),
		bandBox.x + BAND_INSET,
		bandBox.y + (bandBox.height - bandType.size * bandType.lineHeight) / 2,
		{ ...bandType, width: bandType.width + 1 }
	);

	// 2 Photo: 4 mm corners, cropped from the top so the head stays in.
	const p = layout.photo;
	doc.save().roundedRect(p.x, p.y, p.width, p.height, mm(4)).clip();
	doc.image(photo, p.x, p.y, { cover: [p.width, p.height], align: 'center', valign: 'top' });
	doc.restore();

	// 3, 4 Scan column: the question, the action and its arrow; the QR and the short link with the code set apart.
	if (layout.scan && content.cta) {
		const { scan } = layout;
		const [question, action] = cut(content.cta, '? ', 1);
		if (question) draw(doc, question, scan.question.x, scan.question.y, QUESTION);
		if (action) {
			draw(doc, action, scan.action.x, scan.action.y, ACTION);
			drawIcon(doc, ICONS.arrow, scan.arrow.x, scan.arrow.y, scan.arrow.width);
		}
		drawQr(doc, content.url, scan.qr.x, scan.qr.y, scan.qr.width);
		const [prefix, code] = cut(content.link, '/r/', 3);
		const { link } = scan;
		const prefixType: Block = { ...LINK, font: 'sans', size: 14 * link.scale, spacing: 0 };
		const codeType: Block = { ...LINK, size: LINK.size * link.scale };
		const prefixWidth = lineWidth(doc, prefix, prefixType);
		const x = link.x + (link.width - prefixWidth - lineWidth(doc, code, codeType)) / 2;
		const baseline = link.y + baselineOf(doc, codeType);
		textOptions(doc, prefixType);
		doc.fillColor(INK).text(prefix, x, baseline, { baseline: 'alphabetic', lineBreak: false });
		const { characterSpacing } = textOptions(doc, codeType);
		doc.text(code, x + prefixWidth, baseline, { baseline: 'alphabetic', lineBreak: false, characterSpacing });
	}

	// 5 Name; reunited: the thanks under it.
	if (layout.name && content.name) draw(doc, content.name, layout.name.x, layout.name.y, nameBlock(layout.name.size));
	if (layout.thanks && content.thanks) draw(doc, content.thanks, layout.thanks.x, layout.thanks.y, THANKS);

	// 6 When (bold) and where, each beside its 7 mm icon, sitting 0.9 mm under the first line's baseline.
	for (const [box, text, icon, type] of [
		[layout.when, content.when, ICONS.calendar, { ...LINE, font: 'sansBold' }],
		[layout.area, content.area, ICONS.pin, LINE],
	] as const) {
		if (!box || !text) continue;
		drawIcon(doc, icon, MARGIN, box.y + baselineOf(doc, type) + mm(0.9) - mm(7), mm(7));
		draw(doc, text, box.x, box.y, type);
	}

	// 7 Facts: a mid-grey hairline, then up to three labelled columns (label in capitals over the value).
	if (layout.facts) {
		const { y } = layout.facts;
		doc.moveTo(MARGIN, y + mm(0.2))
			.lineTo(MARGIN + WIDTH, y + mm(0.2))
			.lineWidth(mm(0.4))
			.strokeColor(GREY)
			.stroke();
		content.facts.forEach((fact, index) => {
			const [label, value] = cut(fact, ': ');
			const x = MARGIN + index * (FACT_WIDTH + mm(6));
			let top = y + mm(3.4);
			if (label) top += draw(doc, label.toLocaleUpperCase(content.lang), x, top, LABEL);
			draw(doc, value, x, top, VALUE);
		});
	}

	// 8 Reward: a 0.6 mm ink box; the amount (tabular figures) and the owner's note on one baseline, the note cut to fit.
	if (layout.reward && content.reward) {
		const r = layout.reward;
		doc.roundedRect(r.x + mm(0.3), r.y + mm(0.3), r.width - mm(0.6), r.height - mm(0.6), mm(2.7))
			.lineWidth(mm(0.6))
			.strokeColor(INK)
			.stroke();
		const x = r.x + mm(5.6);
		const baseline = r.y + mm(2.6) + baselineOf(doc, AMOUNT);
		doc.fillColor(INK).text(content.reward.amount, x, baseline, {
			baseline: 'alphabetic',
			lineBreak: false,
			features: ['tnum'],
		});
		const noteX = x + doc.widthOfString(content.reward.amount, { features: ['tnum'] }) + mm(3);
		if (content.reward.note) {
			doc.font('sans').fontSize(14);
			let note = `· ${content.reward.note}`;
			while (note.length > 3 && doc.widthOfString(note) > r.x + r.width - mm(5.6) - noteX)
				note = `${note.slice(0, -2)}…`;
			doc.text(note, noteX, baseline, { baseline: 'alphabetic', lineBreak: false });
		}
	}

	// 9 Safety line in ink, a shield in front.
	if (layout.safety && content.safety) {
		drawIcon(doc, ICONS.shield, MARGIN, layout.safety.y, mm(5.5));
		draw(doc, content.safety, layout.safety.x, layout.safety.y, SAFETY);
	}

	// 10 Footer: the mid-grey hairline; the mark and "Najdimo · Spet doma." on the left, the domain on the right.
	const f = layout.footer;
	doc.moveTo(f.x, f.y + mm(0.2))
		.lineTo(f.x + f.width, f.y + mm(0.2))
		.lineWidth(mm(0.4))
		.strokeColor(GREY)
		.stroke();
	const row = f.y + mm(3.4);
	drawMark(doc, f.x, row, mm(6));
	const textTop = row + (mm(6) - FOOTER.size * FOOTER.lineHeight) / 2;
	draw(doc, content.footer, f.x + mm(8), textTop, { ...FOOTER, width: f.width - mm(8) });
	draw(doc, content.link.split('/')[0]!, f.x, textTop, { ...FOOTER, align: 'right' });

	doc.end();
	return done;
}

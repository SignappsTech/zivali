// @vitest-environment node
// P18 poster: what each zone says (no phone, chip, collar text or location beyond the area name) and that pdfkit
// draws one A4 page with the embedded fonts, the PDF title and the language, well within the 5 s budget.
import { create as createQr } from 'qrcode';
import { describe, expect, it } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import type { PublicReport } from '@zivali/types';

import { type PosterLayout, posterContent, posterLayout, renderPosterPdf } from './poster-pdf';

const thisYear = new Date().getUTCFullYear();
const lost: PublicReport = {
	...publicReport,
	short_code: 'Rex12345',
	type: 'lost',
	status: 'open',
	species: 'dog',
	name: 'Rex',
	breed_codes: ['dog.mixed'],
	colours: ['brown', 'white'],
	pattern: 'bicolour',
	size: 'm',
	event_at: new Date(Date.UTC(thisYear, 9, 12, 16)).toISOString(),
	reward: { eur: 50, note: 'tudi za podatek' },
};
const place = { label: 'Šiška, Ljubljana', area: 'Šiška', municipality: 'Ljubljana' };
// 1 × 1 PNG: pdfkit takes JPEG and PNG.
const PHOTO = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

describe('posterContent', () => {
	it('lost, SL: band, call to action, QR link, facts, where and when, reward and its safety line', () => {
		expect(posterContent(lost, place, 'sl')).toEqual({
			lang: 'sl',
			title: 'Pogrešan pes Rex – Najdimo',
			band: 'Pogrešan pes',
			home: false,
			name: 'Rex',
			cta: 'Ste ga videli? Skenirajte kodo in nam sporočite.',
			url: 'https://najdimo.si/r/Rex12345',
			link: 'najdimo.si/r/Rex12345',
			facts: ['Barva: rjava in bela', 'Velikost: srednja', 'Pasma: Mešanec'],
			when: 'Pogrešan od 12. 10.',
			area: 'Območje: Šiška, Ljubljana (približno)',
			// Intl puts a no-break space before the sign.
			reward: { amount: 'Nagrada: 50\u00a0€', note: 'tudi za podatek' },
			safety: 'Stik samo prek Najdimo. Nagrado lastnik izroči šele, ko je žival spet doma. Nikoli nikomur ne plačajte vnaprej.',
			footer: 'Najdimo · Spet doma.',
		});
	});

	it('EN, a reward without an amount, a settlement named once', () => {
		const content = posterContent(
			{ ...lost, species: 'cat', reward: { eur: null, note: null } },
			{ label: 'Kranj', area: 'Kranj', municipality: 'Kranj' },
			'en'
		);
		expect(content.band).toBe('Missing cat');
		expect(content.cta).toBe('Seen this cat? Scan the code and let us know.');
		expect(content).toMatchObject({ when: 'Missing since 12 Oct', area: 'Area: Kranj (approximate)' });
		expect(content.reward).toEqual({ amount: 'Reward offered', note: undefined });
		expect(content.footer).toBe('Najdimo · Home again.');
	});

	it('found: no name, no reward, the plain safety line; no area line without a place', () => {
		const content = posterContent(
			{ ...lost, type: 'found', species: 'cat', name: undefined, reward: undefined },
			undefined,
			'sl'
		);
		expect(content.title).toBe('Najdena mačka – Najdimo');
		expect(content.cta).toBe('Je to vaša mačka? Skenirajte kodo.');
		expect(content.when).toBe('Najdena 12. 10.');
		expect(content.area).toBeUndefined();
		expect(content.reward).toBeUndefined();
		expect(content.safety).toBe('Stik samo prek Najdimo. Nikoli ne plačujte vnaprej.');
	});

	it('reunited: "Spet doma" with the thanks, no appeal, QR or facts', () => {
		const content = posterContent({ ...lost, status: 'reunited' }, place, 'sl');
		expect(content).toMatchObject({
			band: 'Spet doma',
			home: true,
			name: 'Rex je spet doma.',
			thanks: 'Hvala vsem, ki ste pomagali. Plakat lahko odstranite.',
			facts: [],
		});
		expect(content.when).toBeUndefined();
		expect(content.cta).toBeUndefined();
		expect(content.safety).toBeUndefined();
	});

	it('never prints contact data, the chip or the exact point', () => {
		const text = JSON.stringify(
			posterContent({ ...lost, has_chip: true, area: { lat: 46.0612, lng: 14.4872, radius_m: 500 } }, place, 'sl')
		);
		expect(text).not.toMatch(/46\.06|14\.48|@|\+386|Čip/);
	});
});

describe('renderPosterPdf', () => {
	it('draws one A4 page with the title and language, in well under 5 s', async () => {
		const start = Date.now();
		const pdf = await renderPosterPdf(posterContent(lost, place, 'sl'), PHOTO);
		const elapsed = Date.now() - start;
		const raw = pdf.toString('latin1');

		expect(raw.startsWith('%PDF-')).toBe(true);
		expect(raw.match(/\/Type \/Page\b/g)).toHaveLength(1);
		expect(raw).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
		expect(raw).toContain('/Lang (sl)');
		// The title is a UTF-16BE string after its byte-order mark ("š" and "–").
		const title = Buffer.from('﻿Pogrešan pes Rex – Najdimo', 'utf16le').swap16().toString('latin1');
		expect(raw).toContain(`(${title})`);
		// The brand fonts are embedded, so č, š and ž print.
		expect(raw).toMatch(/BricolageGrotesque/);
		expect(raw).toMatch(/AtkinsonHyperlegibleNext/);
		expect(elapsed).toBeLessThan(5000);
	});

	it('draws the reunited and the found variants on one page too', async () => {
		for (const report of [
			{ ...lost, status: 'reunited' as const },
			{ ...lost, type: 'found' as const, name: undefined, reward: undefined },
		]) {
			const raw = (await renderPosterPdf(posterContent(report, place, 'en'), PHOTO)).toString('latin1');
			expect(raw.match(/\/Type \/Page\b/g)).toHaveLength(1);
			expect(raw).toContain('/Lang (en)');
		}
	});
});

// TASK-24.10: the layout numbers of the approved wireframe (docs/design/wireframes/P18-poster.html v1, S2) and its
// variants S3, S5, S6, S7; every zone inside the A4 safe area (12 mm).
const mm = (value: number) => (value * 72) / 25.4;
const zones = (layout: PosterLayout) =>
	[
		layout.band,
		layout.photo,
		layout.name,
		layout.thanks,
		layout.when,
		layout.area,
		layout.facts,
		layout.reward,
		layout.safety,
		layout.footer,
		...(layout.scan ? Object.values(layout.scan) : []),
	].filter((box) => !!box);

function expectFits(layout: PosterLayout) {
	expect(layout.footer.y + layout.footer.height).toBeCloseTo(mm(297 - 12), 1);
	expect(layout.end).toBeLessThanOrEqual(layout.footer.y + 0.01);
	for (const box of zones(layout)) {
		expect(box.x).toBeGreaterThanOrEqual(mm(12) - 0.01);
		expect(box.y).toBeGreaterThanOrEqual(mm(12) - 0.01);
		expect(box.x + box.width).toBeLessThanOrEqual(mm(210 - 12) + 0.01);
		expect(box.y + box.height).toBeLessThanOrEqual(mm(297 - 12) + 0.01);
	}
	// 1 Band: 186 × 28 mm on the top margin, 64 pt down to 40 pt.
	expect(layout.band).toMatchObject({ x: mm(12), y: mm(12) });
	expect(layout.band.width).toBeCloseTo(mm(186), 1);
	expect(layout.band.height).toBeCloseTo(mm(28), 1);
	expect(layout.band.size).toBeGreaterThanOrEqual(40);
	expect(layout.band.size).toBeLessThanOrEqual(64);
	// 2 Photo: 5 mm under the band.
	expect(layout.photo.y).toBeCloseTo(mm(12 + 28 + 5), 1);
}

/** 3, 4 The scan column: QR 56 mm at x 138 mm, its 4-module quiet zone clear, the link level with the photo's bottom. */
function expectScan(layout: PosterLayout, url: string) {
	const { scan, photo } = layout;
	expect(photo.width).toBeCloseTo(mm(114), 1);
	expect(photo.height).toBeGreaterThanOrEqual(mm(100) - 0.01);
	expect(photo.height).toBeLessThanOrEqual(mm(140) + 0.01);
	expect(scan).toBeDefined();
	const { qr, link, action, arrow, question } = scan!;
	expect(qr.width).toBeCloseTo(mm(56), 1);
	expect(qr.height).toBeCloseTo(mm(56), 1);
	expect(qr.x).toBeCloseTo(mm(12 + 126), 1);
	expect(question.y).toBeCloseTo(photo.y, 1);
	expect(link.y + link.height).toBeCloseTo(photo.y + photo.height, 1);
	const quiet = (4 * mm(56)) / createQr(url, { errorCorrectionLevel: 'M' }).modules.size;
	expect(qr.x - (photo.x + photo.width)).toBeGreaterThanOrEqual(quiet);
	expect(mm(210) - (qr.x + qr.width)).toBeGreaterThanOrEqual(quiet);
	expect(qr.y - Math.max(action.y + action.height, arrow.y + arrow.height)).toBeGreaterThanOrEqual(mm(8) - 0.01);
	expect(qr.y - Math.max(action.y + action.height, arrow.y + arrow.height)).toBeGreaterThanOrEqual(quiet);
	expect(link.y - (qr.y + qr.height)).toBeGreaterThanOrEqual(quiet);
	expect(link.scale).toBe(1);
}

describe('posterLayout (wireframe P18 v1)', () => {
	it('S2, lost dog SL with a reward: band, photo, scan column, name, when and where, facts, reward, safety, footer', () => {
		const content = posterContent(lost, place, 'sl');
		const layout = posterLayout(content);
		expectFits(layout);
		expectScan(layout, content.url);
		// "POGREŠAN PES" fits just under 64 pt; "Rex" keeps 72 pt.
		expect(layout.band.size).toBe(62);
		expect(layout.name?.size).toBe(72);
		// 5 Name 5 mm under the photo; 6 when 3 mm under it; 7 facts; 8 reward; 9 safety, in this order.
		const order = [layout.name, layout.when, layout.area, layout.facts, layout.reward, layout.safety];
		expect(order.every(Boolean)).toBe(true);
		expect(layout.name!.y).toBeCloseTo(layout.photo.y + layout.photo.height + mm(5), 1);
		expect(layout.when!.y).toBeCloseTo(layout.name!.y + layout.name!.height + mm(3), 1);
		for (let i = 1; i < order.length; i++) expect(order[i]!.y).toBeGreaterThan(order[i - 1]!.y);
		// The reward box spans the text width.
		expect(layout.reward!.width).toBeCloseTo(mm(186), 1);
	});

	it("S3, lost dog EN without a reward: the photo takes the reward's height", () => {
		const withReward = posterLayout(posterContent(lost, place, 'en'));
		const content = posterContent({ ...lost, reward: undefined }, place, 'en');
		const layout = posterLayout(content);
		expectFits(layout);
		expectScan(layout, content.url);
		expect(layout.band.size).toBe(64);
		expect(layout.reward).toBeUndefined();
		expect(layout.photo.height).toBeGreaterThan(withReward.photo.height);
	});

	it('S5, lost cat EN with a long name and a long reward note: the name shrinks and wraps, the page still fits', () => {
		const content = posterContent(
			{
				...lost,
				species: 'cat',
				name: 'Mucika Pikica Zvezdica',
				breed_codes: [],
				reward: {
					eur: 100,
					note: 'for news that brings her home, thank you to everyone who keeps an eye out in Trnovo and Krakovo',
				},
			},
			{ label: 'Trnovo, Ljubljana', area: 'Trnovo', municipality: 'Ljubljana' },
			'en'
		);
		const layout = posterLayout(content);
		expectFits(layout);
		expectScan(layout, content.url);
		expect(layout.name!.size).toBeGreaterThanOrEqual(44);
		expect(layout.name!.size).toBeLessThanOrEqual(56);
		expect(layout.name!.height).toBeLessThanOrEqual(2 * layout.name!.size * 0.95 + 0.01);
	});

	it('S6, found cat SL without a name: no name zone, when and where 6 mm under the photo', () => {
		const content = posterContent(
			{ ...lost, type: 'found', species: 'cat', name: undefined, reward: undefined, breed_codes: [] },
			{ label: 'Bežigrad, Ljubljana', area: 'Bežigrad', municipality: 'Ljubljana' },
			'sl'
		);
		const layout = posterLayout(content);
		expectFits(layout);
		expectScan(layout, content.url);
		expect(layout.name).toBeUndefined();
		expect(layout.when!.y).toBeCloseTo(layout.photo.y + layout.photo.height + mm(6), 1);
	});

	it('S7, home again SL: the photo alone at full width (120 to 150 mm), the name and the thanks, no QR', () => {
		const layout = posterLayout(posterContent({ ...lost, status: 'reunited' }, place, 'sl'));
		expectFits(layout);
		expect(layout.scan).toBeUndefined();
		expect(layout.photo.width).toBeCloseTo(mm(186), 1);
		expect(layout.photo.height).toBeGreaterThanOrEqual(mm(120) - 0.01);
		expect(layout.photo.height).toBeLessThanOrEqual(mm(150) + 0.01);
		expect(layout.thanks).toBeDefined();
		expect(layout.facts).toBeUndefined();
	});
});

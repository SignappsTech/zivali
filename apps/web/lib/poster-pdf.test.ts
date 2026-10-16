// @vitest-environment node
// P18 poster: what each zone says (no phone, chip, collar text or location beyond the area name) and that pdfkit
// draws one A4 page with the embedded fonts, the PDF title and the language, well within the 5 s budget.
import { describe, expect, it } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import type { PublicReport } from '@zivali/types';

import { posterContent, renderPosterPdf } from './poster-pdf';

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
			where: ['Pogrešan od 12. 10.', 'Območje: Šiška, Ljubljana (približno)'],
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
		expect(content.where).toEqual(['Missing since 12 Oct', 'Area: Kranj (approximate)']);
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
		expect(content.where).toEqual(['Najdena 12. 10.']);
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
			where: [],
		});
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

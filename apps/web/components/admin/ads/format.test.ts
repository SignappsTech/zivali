import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { adminAds } from '@zivali/api/__fixtures__/ads';
import { AdInput } from '@zivali/validation';

import {
	adPhase,
	byDay,
	csvCell,
	ctrOf,
	dayOf,
	dayStart,
	endDay,
	formOf,
	groupBy,
	imageOk,
	serverProblems,
	toCsv,
	toInput,
	validate,
} from './format';
import { MUNICIPALITIES } from './municipalities';

const [running, scheduled, draft, ended] = adminAds.items;
const now = Date.parse('2026-10-15T10:00:00Z');
const valid = {
	...formOf(),
	title: 'Repek: hrana za pse',
	body: 'Brezplačna dostava.',
	link_url: 'https://repek.si/jesen',
	image_alt: 'Pes z igračo',
	slots: ['detail' as const],
	locales: ['sl' as const],
};

describe('ad status word', () => {
	it('reads draft, scheduled, running, paused and ended from the status and the dates', () => {
		expect([running, scheduled, draft, ended].map((ad) => adPhase(ad!, now))).toEqual([
			'running',
			'scheduled',
			'draft',
			'ended',
		]);
		// An active ad past its end is over, even before the job ends it.
		expect(adPhase({ ...running!, ends_at: '2026-10-15T09:00:00Z' }, now)).toBe('ended');
		expect(adPhase({ ...running!, status: 'paused' }, now)).toBe('paused');
	});
});

describe('Ljubljana days', () => {
	it('turns a form date into midnight in Ljubljana, summer and winter time', () => {
		expect(dayStart('2026-10-01')).toBe('2026-09-30T22:00:00.000Z');
		expect(dayStart('2026-11-01')).toBe('2026-10-31T23:00:00.000Z');
		expect(dayOf('2026-09-30T22:00:00Z')).toBe('2026-10-01');
	});

	it('shows the last day an ad runs and saves the end as the next midnight', () => {
		expect(endDay(running!)).toBe('2026-10-31');
		const input = toInput({ ...valid, start: '2026-10-01', end: '2026-10-31' }, false);
		expect([input.starts_at, input.ends_at]).toEqual(['2026-09-30T22:00:00.000Z', '2026-10-31T23:00:00.000Z']);
	});
});

describe('form checks', () => {
	it('passes a complete ad, and the API schema accepts what it sends', () => {
		expect(validate(valid)).toEqual({});
		expect(AdInput.safeParse(toInput(valid, false, 'Več o tem')).success).toBe(true);
		expect(toInput(valid, false, 'Več o tem').cta).toBe('Več o tem');
		expect(toInput({ ...valid, cta: ' Pokliči ' }, false, 'Več o tem').cta).toBe('Pokliči');
	});

	it('flags each rule of P20 §Validation with its message', () => {
		const problems = validate({
			...valid,
			image_alt: 'Pes',
			title: 'x'.repeat(61),
			body: '',
			cta: 'x'.repeat(25),
			link_url: 'http://repek.si',
			slots: [],
			locales: [],
			start: '2026-11-02',
			end: '2026-11-01',
		});
		expect(problems).toEqual({
			image_alt: { key: 'ads_err_alt_length' },
			title: { key: 'ads_err_too_long', values: { max: 60 } },
			body: { key: 'ads_err_required' },
			cta: { key: 'ads_err_too_long', values: { max: 24 } },
			link_url: { key: 'ads_err_link' },
			slots: { key: 'ads_err_slots' },
			locales: { key: 'ads_err_required' },
			end: { key: 'ads_err_dates' },
		});
		expect(validate({ ...valid, image_alt: ' ' }).image_alt).toEqual({ key: 'ads_err_alt' });
		expect(validate({ ...valid, link_url: 'https://repek.si/a b' }).link_url).toEqual({ key: 'ads_err_link' });
	});

	it('sends empty targeting as everyone (null) and a house ad as its creative and slots only', () => {
		expect(toInput(valid, false)).toMatchObject({
			region_ids: null,
			municipality_ids: null,
			species: null,
			starts_at: null,
			ends_at: null,
			status: 'draft',
		});
		expect(Object.keys(toInput(formOf(adminAds.items[4]), true)).sort()).toEqual(
			['body', 'cta', 'image_alt', 'link_url', 'slots', 'title'].sort()
		);
	});

	it('takes 4:3 JPG or PNG images of at least 1200 × 900 under 500 KB only', () => {
		const ok = { width: 1600, height: 1200, bytes: 212_000, type: 'image/jpeg' };
		expect(imageOk(ok)).toBe(true);
		expect(imageOk({ ...ok, width: 1600, height: 900 })).toBe(false);
		expect(imageOk({ ...ok, width: 800, height: 600 })).toBe(false);
		expect(imageOk({ ...ok, bytes: 600_000 })).toBe(false);
		expect(imageOk({ ...ok, type: 'image/webp' })).toBe(false);
	});
});

describe('server problems', () => {
	it('maps a refused word to its field, an overlap to the ad it names, the image and the dates', () => {
		const { problems, other } = serverProblems(
			[
				{ path: 'title', message: 'Ads may not sell, give away or rehome animals' },
				{
					path: 'exclusive',
					message: 'Overlaps the exclusive ad "Repek: jesen" (ad7…) in a shared slot and region',
				},
				{ path: 'image', message: 'The image must be a 4:3 JPG or PNG' },
				{ path: 'ends_at', message: 'Ends before it starts' },
				{ path: 'weight', message: 'Too big' },
			],
			valid
		);
		expect(problems).toEqual({
			title: { key: 'ads_err_blocked' },
			exclusive: { key: 'ads_err_overlap', values: { title: 'Repek: jesen' } },
			image: { key: 'ads_err_image' },
			end: { key: 'ads_err_dates' },
		});
		expect(other).toEqual([{ path: 'weight', message: 'Too big' }]);
	});

	it('guesses blocked terms for title, body and button only', () => {
		const { problems } = serverProblems(
			[
				{ path: 'cta', message: 'x' },
				{ path: 'image_alt', message: 'Alt refused' },
				{ path: 'link_url', message: 'Bad host' },
			],
			valid
		);
		expect(problems.cta).toEqual({ key: 'ads_err_blocked' });
		expect(problems.image_alt).toEqual({ key: 'ads_err_blocked', message: 'Alt refused' });
		expect(problems.link_url).toEqual({ key: 'ads_err_link' });
	});

	it('falls back to the server message when an overlap names no title', () => {
		const { problems } = serverProblems([{ path: 'exclusive', message: 'Overlaps another ad' }], valid);
		expect(problems.exclusive).toEqual({ key: 'ads_err_overlap', message: 'Overlaps another ad' });
	});

	it('takes an empty button text for one locale or several, and the API schema accepts it (C14 1.3)', () => {
		expect(validate({ ...valid, cta: '', locales: ['sl', 'en'] }).cta).toBeUndefined();
		expect(validate({ ...valid, cta: '', locales: ['en'] }).cta).toBeUndefined();
		const input = toInput({ ...valid, cta: ' ', locales: ['sl', 'en'] }, false);
		expect([input.cta, AdInput.safeParse(input).success]).toEqual(['', true]);
	});

	it('keeps the client message when the field breaks a rule the client knows', () => {
		const { problems } = serverProblems([{ path: 'link_url', message: 'Invalid URL' }], {
			...valid,
			link_url: 'ftp://x',
		});
		expect(problems.link_url).toEqual({ key: 'ads_err_link' });
	});
});

describe('statistics', () => {
	const rows = [
		{
			day: '2026-10-13',
			slot: 'detail' as const,
			region_slug: 'gorenjska',
			impressions: 300,
			clicks: 6,
			ctr: 0.02,
		},
		{ day: '2026-10-13', slot: 'sidebar' as const, region_slug: null, impressions: 3, clicks: 0, ctr: 0 },
		{
			day: '2026-10-15',
			slot: 'detail' as const,
			region_slug: 'gorenjska',
			impressions: 100,
			clicks: 4,
			ctr: 0.04,
		},
	];

	it('groups by slot and region, fills days without rows, and has no CTR for masked counts', () => {
		expect(groupBy(rows, (row) => row.slot)).toEqual([
			{ key: 'detail', impressions: 400, clicks: 10 },
			{ key: 'sidebar', impressions: 3, clicks: 0 },
		]);
		expect(byDay(rows, '2026-10-13', '2026-10-15').map((day) => [day.day, day.impressions])).toEqual([
			['2026-10-13', 303],
			['2026-10-14', 0],
			['2026-10-15', 100],
		]);
		expect(ctrOf({ impressions: 400, clicks: 10 })).toBe(0.025);
		expect(ctrOf({ impressions: 1612, clicks: 3 })).toBeNull();
		expect(ctrOf({ impressions: 0, clicks: 0 })).toBeNull();
	});

	it('writes CSV with the byte order mark, a header row, quoting and formula-safe cells', () => {
		expect(['=1+1', '+386', '-2', '@SUM(A1)', 'Gorenjska', 'a,b', 'say "hi"', 12].map(csvCell)).toEqual([
			"'=1+1",
			"'+386",
			"'-2",
			"'@SUM(A1)",
			'Gorenjska',
			'"a,b"',
			'"say ""hi"""',
			'12',
		]);
		const csv = toCsv([
			['Dan', 'Mesto'],
			['2026-10-13', 'Stran prijave'],
		]);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
		expect(csv.slice(1)).toBe('Dan,Mesto\r\n2026-10-13,Stran prijave\r\n');
	});
});

describe('municipalities', () => {
	it('match the GURS seed the API loads (ids and names)', () => {
		const file = path.join(import.meta.dirname, '../../../../../supabase/seed/geo/municipalities.geojson');
		const seed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
			features: { properties: { id: number; name_sl: string } }[];
		};
		const fromSeed = seed.features
			.map(({ properties }) => [properties.id, properties.name_sl])
			.sort((a, b) => Number(a[0]) - Number(b[0]));
		expect(MUNICIPALITIES).toEqual(fromSeed);
		expect(MUNICIPALITIES).toHaveLength(212);
	});
});

import { describe, expect, test } from 'vitest';

import { COLOURS, PATTERNS, SIZES } from '@zivali/types';

import {
	AdSlotParams,
	ATTRIBUTE_LABEL_KEYS,
	BREED_LABEL_KEYS,
	breedsFor,
	CAT_BREEDS,
	CheckoutInput,
	CreatePhotoInput,
	CreateReportInput,
	DOG_BREEDS,
	GeoSearchInput,
	LeadInput,
	PetInput,
	PublicReport,
	ReportSearch,
	SendMessageInput,
	SyncReportsQuery,
	UpdateReportInput,
} from '../src/index.ts';

const photo = '9b0e6c1a-3f2d-4c5e-8a7b-1d2e3f4a5b6c';
const lost = {
	type: 'lost',
	species: 'dog',
	location: { lat: 46.05, lng: 14.5 },
	event_at: '2026-10-15T07:42:10Z',
	photo_ids: [photo],
} as const;
const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
	r.error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

describe('breeds and attributes (C4, C16)', () => {
	test('about 60 dog and 20 cat breeds plus mixed and unknown, all prefixed by species', () => {
		expect(DOG_BREEDS.length).toBeGreaterThanOrEqual(62);
		expect(CAT_BREEDS.length).toBeGreaterThanOrEqual(22);
		for (const s of ['dog', 'cat'] as const) {
			expect(breedsFor(s)).toContain(`${s}.mixed`);
			expect(breedsFor(s)).toContain(`${s}.unknown`);
			expect(breedsFor(s).every((c) => c.startsWith(`${s}.`))).toBe(true);
		}
		expect(new Set([...DOG_BREEDS, ...CAT_BREEDS]).size).toBe(DOG_BREEDS.length + CAT_BREEDS.length);
	});

	test('label keys for the breeds and attributes namespaces', () => {
		expect(BREED_LABEL_KEYS).toContain('breeds.dog.labrador_retriever');
		expect(BREED_LABEL_KEYS).toContain('breeds.cat.european_shorthair');
		expect(ATTRIBUTE_LABEL_KEYS).toContain('attributes.colours.blue_grey');
		expect(ATTRIBUTE_LABEL_KEYS).toContain('attributes.patterns.tortoiseshell');
		expect(ATTRIBUTE_LABEL_KEYS).toHaveLength(2 + SIZES.length + 3 + COLOURS.length + PATTERNS.length);
	});
});

describe('CreateReportInput (C4)', () => {
	test('accepts the contract example and a lost report with a display-only reward', () => {
		expect(CreateReportInput.safeParse({ ...lost, type: 'found', species: 'cat' }).success).toBe(true);
		const r = CreateReportInput.parse({ ...lost, reward_eur: 10_000, reward_note: 'Nagrada za najditelja' });
		expect(r.reward_eur).toBe(10_000);
	});

	test('reward_eur is an integer 1–10 000', () => {
		for (const reward_eur of [0, 10_001, 12.5])
			expect(CreateReportInput.safeParse({ ...lost, reward_eur }).success).toBe(false);
		expect(CreateReportInput.safeParse({ ...lost, reward_eur: 1 }).success).toBe(true);
		expect(CreateReportInput.safeParse({ ...lost, reward_eur: null }).success).toBe(true);
	});

	test('reward_note: one line, ≤ 80 chars, no contact data (issue CONTACT_DATA)', () => {
		expect(issues(CreateReportInput.safeParse({ ...lost, reward_note: 'Kličite 041 123 456' }))).toEqual([
			'reward_note: CONTACT_DATA',
		]);
		expect(CreateReportInput.safeParse({ ...lost, reward_note: 'a\nb' }).success).toBe(false);
		expect(CreateReportInput.safeParse({ ...lost, reward_note: 'x'.repeat(81) }).success).toBe(false);
	});

	test('a 1 MB reward_note fails fast on length alone (refines never see it)', () => {
		CreateReportInput.safeParse(lost); // warm-up
		const huge = 'Kličite 041 123 456, ana@x.si\n'.repeat(35_000); // ~1 MB of contact data and newlines
		const t0 = Date.now();
		const r = CreateReportInput.safeParse({ ...lost, reward_note: huge });
		const ms = Date.now() - t0;
		expect(r.error?.issues.map((i) => `${i.path.join('.')}: ${i.code}`)).toEqual(['reward_note: too_big']);
		expect(ms).toBeLessThan(500); // a ReDoS takes seconds; 500 ms tolerates a loaded machine
	});

	test('found and sighted reports reject reward fields', () => {
		const r = CreateReportInput.safeParse({ ...lost, type: 'found', reward_eur: 50, reward_note: 'Hvala' });
		expect(issues(r)).toEqual(['reward_eur: Lost reports only', 'reward_note: Lost reports only']);
		expect(CreateReportInput.safeParse({ ...lost, type: 'sighted', reward_eur: null }).success).toBe(true);
	});

	test('photos: 1–5 for lost and found, 0–5 for sighted, no repeats', () => {
		expect(CreateReportInput.safeParse({ ...lost, photo_ids: [] }).success).toBe(false);
		expect(CreateReportInput.safeParse({ ...lost, type: 'sighted', photo_ids: [] }).success).toBe(true);
		expect(CreateReportInput.safeParse({ ...lost, photo_ids: Array(6).fill(photo) }).success).toBe(false);
		expect(CreateReportInput.safeParse({ ...lost, photo_ids: [photo, photo] }).success).toBe(false);
	});

	test('breeds must belong to the species; radius 200–20 000', () => {
		expect(CreateReportInput.safeParse({ ...lost, breed_codes: ['cat.persian'] }).success).toBe(false);
		expect(CreateReportInput.safeParse({ ...lost, breed_codes: ['dog.mixed'] }).success).toBe(true);
		expect(CreateReportInput.safeParse({ ...lost, requested_radius_m: 150 }).success).toBe(false);
	});

	test('PATCH is partial without type', () => {
		expect(UpdateReportInput.parse({ reward_eur: null, type: 'found' })).toEqual({ reward_eur: null });
	});
});

test('PublicReport strips everything outside the public whitelist', () => {
	const row = {
		id: photo,
		short_code: 'Hk3vT9qP',
		type: 'lost',
		status: 'open',
		species: 'dog',
		breed_codes: [],
		colours: ['black'],
		pattern: null,
		size: 'm',
		sex: 'male',
		has_chip: true,
		collar_described: false,
		event_at: '2026-10-15T07:42:10Z',
		area: { lat: 46.05, lng: 14.5, radius_m: 1000 },
		in_slovenia: true,
		photos: [],
		boosted: false,
		created_at: '2026-10-15T07:42:10Z',
		updated_at: '2026-10-15T07:42:10Z',
		is_mine: false,
		exact_point: { lat: 46.0512, lng: 14.5023 },
		chip_number: '941000012345678',
		manage_token_hash: 'x',
		created_by: photo,
		finder_email: 'a@b.si',
	};
	const out = PublicReport.parse(row);
	for (const key of ['exact_point', 'chip_number', 'manage_token_hash', 'created_by', 'finder_email'])
		expect(out).not.toHaveProperty(key);
});

test('PetInput carries chip_registered_crhz, ear_tip and lifestyle', () => {
	const pet = { species: 'cat', name: 'Muri', chip_registered_crhz: 'unknown', ear_tip: true, lifestyle: 'both' };
	expect(PetInput.parse(pet)).toEqual(pet);
	expect(PetInput.safeParse({ ...pet, lifestyle: 'garden' }).success).toBe(false);
});

describe('query strings', () => {
	test('ReportSearch splits lists and parses bbox and near', () => {
		expect(
			ReportSearch.parse({
				types: 'lost,found',
				species: ['dog'],
				bbox: '14.4,46.0,14.6,46.1',
				near: '46.05,14.5,10',
				include_closed: 'true',
				limit: '20',
			})
		).toEqual({
			types: ['lost', 'found'],
			species: ['dog'],
			bbox: [14.4, 46.0, 14.6, 46.1],
			near: { lat: 46.05, lng: 14.5, km: 10 },
			include_closed: true,
			limit: 20,
		});
		expect(ReportSearch.safeParse({ types: 'lost,adopted' }).success).toBe(false);
		expect(ReportSearch.safeParse({ near: '46,14,150' }).success).toBe(false);
		expect(ReportSearch.safeParse({ limit: '51' }).success).toBe(false);
	});

	test('SyncReportsQuery takes ≤ 3 JSON circles of ≤ 25 km', () => {
		const areas = JSON.stringify([{ lat: 46.05, lng: 14.5, radius_km: 10 }]);
		expect(SyncReportsQuery.parse({ areas }).areas).toHaveLength(1);
		expect(SyncReportsQuery.safeParse({ areas: '[{' }).success).toBe(false);
		const big = JSON.stringify([{ lat: 46, lng: 14, radius_km: 30 }]);
		expect(SyncReportsQuery.safeParse({ areas: big }).success).toBe(false);
	});

	test('unknown ad slots (report flows included) are VALIDATION', () => {
		expect(AdSlotParams.safeParse({ slot: 'detail' }).success).toBe(true);
		expect(AdSlotParams.safeParse({ slot: 'report-lost' }).success).toBe(false);
	});
});

describe('other request schemas', () => {
	test('GeoSearchInput: q 2–100 chars, trimmed', () => {
		expect(issues(GeoSearchInput.safeParse({ q: 'x' }))).toEqual(['q: Too short']);
		expect(GeoSearchInput.parse({ q: ' kranj ' }).q).toBe('kranj');
	});

	test('CreatePhotoInput: ≤ 1 MB, long edge ≤ 1600, short edge ≥ 320', () => {
		const p = { sha256: 'a'.repeat(64), width: 1600, height: 1200, bytes: 500_000 };
		expect(CreatePhotoInput.safeParse(p).success).toBe(true);
		expect(CreatePhotoInput.safeParse({ ...p, width: 1601 }).success).toBe(false);
		expect(CreatePhotoInput.safeParse({ ...p, height: 300 }).success).toBe(false);
		expect(CreatePhotoInput.safeParse({ ...p, bytes: 2_000_000 }).success).toBe(false);
	});

	test('CheckoutInput: user amounts only for user purposes, same-origin return path', () => {
		const tip = { purpose: 'tip', amount_cents: 500, locale: 'sl', return_to: '/r/Hk3vT9qP/reunited' };
		expect(CheckoutInput.safeParse(tip).success).toBe(true);
		expect(CheckoutInput.safeParse({ ...tip, amount_cents: 150 }).success).toBe(true); // MIN_AMOUNT in the domain
		expect(CheckoutInput.safeParse({ ...tip, amount_cents: 50_001 }).success).toBe(false);
		expect(CheckoutInput.safeParse({ ...tip, purpose: 'boost' }).success).toBe(false);
		expect(CheckoutInput.safeParse({ ...tip, purpose: 'report_contribution' }).success).toBe(false);
		for (const return_to of ['https://evil.example', '//evil.example', '/\\evil'])
			expect(CheckoutInput.safeParse({ ...tip, return_to }).success).toBe(false);
	});

	test('SendMessageInput: location only with kind location', () => {
		expect(SendMessageInput.safeParse({ body: 'Je pri meni' }).success).toBe(true);
		expect(SendMessageInput.safeParse({ body: 'Tu', kind: 'location' }).success).toBe(false);
		expect(SendMessageInput.safeParse({ body: 'Tu', location: { lat: 46, lng: 14 } }).success).toBe(false);
		expect(SendMessageInput.safeParse({ body: ' ' }).success).toBe(false);
	});

	test('LeadInput needs consent: true and an interest', () => {
		const lead = {
			company: 'Vet d.o.o.',
			contact_name: 'Ana',
			email: 'ana@vet.si',
			interest: 'vet_partner',
			message: 'Zanima nas oglaševanje.',
			consent: true,
			captcha_token: 't',
			locale: 'sl',
		};
		expect(LeadInput.safeParse(lead).success).toBe(true);
		expect(LeadInput.safeParse({ ...lead, consent: false }).success).toBe(false);
		expect(LeadInput.safeParse({ ...lead, interest: 'other' }).success).toBe(false);
	});
});

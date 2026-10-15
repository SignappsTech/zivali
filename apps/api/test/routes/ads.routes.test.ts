// TASK-35.1: GET /v1/ads/slot/:slot and POST /v1/ads/:id/impressions (C14) with Supertest. Serving rules in detail
// are in test/domains/ads.domain.test.ts; here: wiring, validation, the DTO, headers, callers and real concurrency.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { config } from '../../lib/config.ts';
import configStore from '../../lib/config-store.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import { houseAds } from '../../prisma/seeders/30-commerce.seeder.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const LJUBLJANA = 61;
const RATE = 'ads.impressions';
const users: string[] = [];
const ads: string[] = [];
let gorenjska: number;
let sponsor: string;

async function caller(role: USER_ROLE | null, claims: TestTokenClaims = {}) {
	const id = await createAuthUser({ is_anonymous: claims.is_anonymous });
	users.push(id);
	await prisma.profiles.create({ data: { id, role: role ?? 'USER', is_anonymous: Boolean(claims.is_anonymous) } });
	return `Bearer ${await signTestToken({ sub: id, ...claims })}`;
}

const slot = (path: string, auth?: string) => {
	const req = request(app).get(`/v1/ads/slot/${path}`);
	return auth ? req.set('Authorization', auth) : req;
};
const impression = (id: string, body: object) => request(app).post(`/v1/ads/${id}/impressions`).send(body);

beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	gorenjska = (await prisma.regions.findUniqueOrThrow({ where: { slug: 'gorenjska' } })).id;
	// The house ads exist in every environment (seeder 30-commerce); idempotent.
	await prisma.ads.createMany({ data: houseAds, skipDuplicates: true });
	// Exclusive, so no other ad in the shared database can take its slot in Gorenjska.
	sponsor = (
		await prisma.ads.create({
			data: {
				title: 'Ambulanta Kranj (test)',
				body: 'Dežurni veterinar za pse na Gorenjskem.',
				cta: 'Pokličite',
				link_url: 'https://example.com/ambulanta-kranj',
				image_path: 'ads/test/1.webp',
				image_alt: 'Veterinarka pregleduje psa',
				locales: ['sl'],
				slots: ['DETAIL'],
				region_ids: [gorenjska],
				species: ['dog'],
				status: 'active',
				exclusive: true,
			},
		})
	).id;
	ads.push(sponsor);
	await prisma.rate_limits.deleteMany({ where: { name: RATE } });
}, 120_000);

afterAll(async () => {
	await prisma.ads.deleteMany({ where: { id: { in: ads } } });
	await prisma.rate_limits.deleteMany({ where: { name: RATE } });
	await deleteAuthUsers(users);
});

describe('GET /v1/ads/slot/:slot', () => {
	it.each(['report-lost', 'report_found', 'sign-in', 'chat', 'payment', 'FEED', 'home'])(
		'unknown slot %s is VALIDATION',
		async (name) => {
			const res = await slot(name);
			expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
		}
	);

	it.each(['species=bird', 'locale=de', 'region_id=abc', 'municipality_id=-1'])(
		'invalid context %s is VALIDATION',
		async (query) => {
			const res = await slot(`detail?${query}`);
			expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
		}
	);

	it('serves the targeted ad as the C14 Ad DTO, browser-cacheable for 60 s', async () => {
		const res = await slot(`detail?region_id=${gorenjska}&species=dog&locale=sl`);
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('private, max-age=60');
		expect(res.headers['set-cookie']).toBeUndefined();
		expect(res.body).toEqual({
			id: sponsor,
			title: 'Ambulanta Kranj (test)',
			body: 'Dežurni veterinar za pse na Gorenjskem.',
			cta: 'Pokličite',
			image_url: expect.stringMatching(/^https?:\/\/.+\/ads\/test\/1\.webp$/),
			image_alt: 'Veterinarka pregleduje psa',
			click_url: `${config.API_URL.replace(/\/+$/, '')}/v1/ads/${sponsor}/click?s=detail&r=${gorenjska}`,
			is_house: false,
			label: 'Oglas',
		});
	});

	it('FR-029: the Gorenjska/dog ad is not served to a Ljubljana cat context; a house ad is', async () => {
		const res = await slot(`detail?municipality_id=${LJUBLJANA}&species=cat&locale=sl`);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ is_house: true, label: 'Oglas', image_url: null });
		expect(res.body.id).not.toBe(sponsor);
		// Ljubljana is in osrednjeslovenska (8): the click is attributed to it.
		expect(res.body.click_url).toMatch(/\?s=detail&r=8$/);
	});

	it('takes the locale from Accept-Language when ?locale is absent', async () => {
		const res = await slot('sidebar').set('Accept-Language', 'en');
		expect(res.status).toBe(200);
		expect(res.headers.vary).toMatch(/Accept-Language/i);
		expect(res.body).toMatchObject({ label: 'Ad' });
		const row = await prisma.ads.findUniqueOrThrow({ where: { id: res.body.id } });
		expect(row.locales).toContain('en');
		expect(res.body.click_url).toMatch(/\?s=sidebar&r=0$/);
	});

	it('serves every caller alike: nobody is ad-free until Premium exists (M4)', async () => {
		const callers = [
			undefined,
			'Bearer not-a-token',
			await caller(null, { is_anonymous: true }),
			await caller('USER'),
			await caller('SHELTER_MEMBER'),
			await caller('MODERATOR', { aal: 'aal1' }),
			await caller('MODERATOR', { aal: 'aal2' }),
			await caller('ADMIN', { aal: 'aal2' }),
		];
		for (const auth of callers) {
			const res = await slot(`detail?region_id=${gorenjska}&species=dog`, auth);
			expect([res.status, res.body?.id]).toEqual([200, sponsor]);
		}
	});
});

describe('POST /v1/ads/:id/impressions', () => {
	const total = async (region_id: number) =>
		(
			await prisma.ad_stats_daily.aggregate({
				where: { ad_id: sponsor, slot: 'DETAIL', region_id },
				_sum: { impressions: true },
			})
		)._sum.impressions ?? 0;

	it('100 concurrent impressions yield exactly 100, without cookies', async () => {
		const before = await total(gorenjska);
		const responses = await Promise.all(
			Array.from({ length: 100 }, () => impression(sponsor, { slot: 'detail', region_id: gorenjska }))
		);
		expect(responses.map((res) => res.status)).toEqual(Array(100).fill(204));
		expect(responses.every((res) => res.headers['set-cookie'] === undefined)).toBe(true);
		expect((await total(gorenjska)) - before).toBe(100);
	});

	it('counts an impression without a region under region 0', async () => {
		const before = await total(0);
		await impression(sponsor, { slot: 'detail' }).expect(204);
		expect((await total(0)) - before).toBe(1);
	});

	it.each([
		['a report-flow slot', { slot: 'report-lost' }],
		['a missing slot', {}],
		['a negative region', { slot: 'detail', region_id: -1 }],
		['a string region', { slot: 'detail', region_id: '9' }],
	])('rejects %s with VALIDATION', async (_case, body) => {
		const res = await impression(sponsor, body);
		expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
	});

	it('VALIDATION for a malformed id, NOT_FOUND for an unknown ad or a slot the ad does not run in', async () => {
		expect((await impression('nope', { slot: 'detail' })).status).toBe(400);
		const unknown = await impression(randomUUID(), { slot: 'detail' });
		expect([unknown.status, unknown.body.error.code]).toEqual([404, 'NOT_FOUND']);
		const otherSlot = await impression(sponsor, { slot: 'feed' });
		expect([otherSlot.status, otherSlot.body.error.code]).toEqual([404, 'NOT_FOUND']);
	});

	it('is rate limited per IP (RATE_LIMITED with Retry-After)', async () => {
		await prisma.rate_limits.deleteMany({ where: { name: RATE } });
		await prisma.app_config.upsert({
			where: { key: `rate.${RATE}` },
			create: { key: `rate.${RATE}`, value: { limit: 2, window: 60 } },
			update: { value: { limit: 2, window: 60 } },
		});
		configStore.invalidate();
		try {
			await impression(sponsor, { slot: 'detail' }).expect(204);
			await impression(sponsor, { slot: 'detail' }).expect(204);
			const res = await impression(sponsor, { slot: 'detail' });
			expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
			expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
			// Keyed by an HMAC of the IP, never the raw address.
			const keys = await prisma.rate_limits.findMany({ where: { name: RATE }, select: { key: true } });
			expect(keys.every(({ key }) => !key.includes('127.0.0.1') && !key.includes('::1'))).toBe(true);
		} finally {
			await prisma.app_config.deleteMany({ where: { key: `rate.${RATE}` } });
			configStore.invalidate();
		}
	});
});

// TASK-35.1: ad serving (C14, FR-029) against the local database. Each serving case runs in a rolled-back transaction
// with every other ad soft-deleted, so seeded and leftover ads never decide the outcome.
import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import type { AdInput } from '@zivali/types';

import AdsDomain from '../../domains/ads/ads.domain.ts';
import type { Prisma } from '../../generated/client.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, userCtx, type Actor, type Ctx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { houseAds } from '../../prisma/seeders/30-commerce.seeder.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';

const NOW = new Date('2026-10-15T10:00:00Z');
const DAY_MS = 24 * 3600 * 1000;
let gorenjska: number;
let kranj: number;
const LJUBLJANA = 61;
const OSREDNJESLOVENSKA = 8;

beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	gorenjska = (await prisma.regions.findUniqueOrThrow({ where: { slug: 'gorenjska' } })).id;
	kranj = (await prisma.municipalities.findUniqueOrThrow({ where: { slug: 'kranj' } })).id;
}, 120_000);

/** Runs `fn` with every existing ad soft-deleted, in a transaction that is always rolled back. */
async function isolated(fn: (tx: Prisma.TransactionClient, ctx: Ctx) => Promise<void>, locale: 'sl' | 'en' = 'sl') {
	const rollback = new Error('rollback');
	await expect(
		prisma.$transaction(
			async (tx) => {
				await tx.ads.updateMany({ where: { deleted_at: null }, data: { deleted_at: NOW } });
				await fn(tx, systemCtx({ tx, now: NOW, locale }));
				throw rollback;
			},
			{ timeout: 60_000 }
		)
	).rejects.toBe(rollback);
}

const base = {
	title: 'Ambulanta',
	body: 'Dežurni veterinar 24/7.',
	cta: 'Pokličite',
	link_url: 'https://example.com/ambulanta',
	image_alt: 'Veterinarka pregleduje psa',
	locales: ['sl'],
	slots: ['DETAIL', 'FEED'],
	status: 'active',
} satisfies Partial<Prisma.adsCreateInput>;

const create = (tx: Prisma.TransactionClient, data: Partial<Prisma.adsCreateInput> = {}) =>
	tx.ads.create({ data: { ...base, ...data } });

const house = (tx: Prisma.TransactionClient) =>
	tx.ads.createMany({ data: houseAds.map((ad) => ({ ...ad, id: randomUUID() })) });

/** n draws of the same slot request; the served ad ids. */
async function draws(n: number, input: Parameters<typeof AdsDomain.getAdForSlot>[0], ctx: Ctx) {
	const served: (string | undefined)[] = [];
	for (let i = 0; i < n; i++) served.push((await AdsDomain.getAdForSlot(input, ctx))?.ad.id);
	return served;
}

describe('pickWeighted', () => {
	const items = [
		{ id: 'a', weight: 1 },
		{ id: 'b', weight: 3 },
		{ id: 'z', weight: 0 },
	];
	it('picks by cumulative weight; weight 0 never wins', () => {
		expect(AdsDomain.pickWeighted(items, () => 0)?.id).toBe('a');
		expect(AdsDomain.pickWeighted(items, () => 0.24)?.id).toBe('a');
		expect(AdsDomain.pickWeighted(items, () => 0.25)?.id).toBe('b');
		expect(AdsDomain.pickWeighted(items, () => 0.999999)?.id).toBe('b');
	});
	it('returns undefined when nothing can win', () => {
		expect(AdsDomain.pickWeighted([])).toBeUndefined();
		expect(AdsDomain.pickWeighted([{ weight: 0 }])).toBeUndefined();
	});
	it('rotates in proportion to the weights', () => {
		const counts = { a: 0, b: 0, z: 0 };
		for (let i = 0; i < 4000; i++) counts[AdsDomain.pickWeighted(items)!.id as 'a' | 'b' | 'z']++;
		expect(counts.z).toBe(0);
		expect(counts.b / counts.a).toBeGreaterThan(2.4);
		expect(counts.b / counts.a).toBeLessThan(3.8);
	});
});

describe('statsDay (Europe/Ljubljana)', () => {
	it.each([
		['2026-10-15T21:59:59Z', '2026-10-15'],
		['2026-10-15T22:00:00Z', '2026-10-16'],
		['2026-12-31T22:59:59Z', '2026-12-31'],
		['2026-12-31T23:00:00Z', '2027-01-01'],
	])('%s is %s', (instant, day) => expect(AdsDomain.statsDay(new Date(instant))).toBe(day));
});

describe('content rule (no selling, giving away or rehoming animals)', () => {
	const ad = (over: Partial<Record<'title' | 'body' | 'cta' | 'image_alt' | 'link_url', string>>) => ({
		title: 'Ambulanta',
		body: 'Dežurni veterinar.',
		cta: 'Pokličite',
		image_alt: 'Veterinarka pregleduje psa',
		link_url: 'https://example.com/ambulanta',
		...over,
	});

	it.each([
		[{ title: 'Prodam mladiče' }, ['title']],
		[{ body: 'Mladiči NAPRODAJ, cepljeni' }, ['body']],
		[{ body: 'Muco ODDAM v dobre roke' }, ['body']],
		[{ title: 'Iscemo nov dom za Rexa' }, ['title']],
		[{ cta: 'IŠČEMO NOV DOM' }, ['cta']],
		[{ title: 'Kittens for sale', body: 'We rehome dogs' }, ['title', 'body']],
		[{ image_alt: 'Free to good home: a puppy' }, ['image_alt']],
		[{ link_url: 'https://example.com/psi-za-prodajo' }, ['link_url']],
		// ads.blocked_terms (migration default, SL and EN)
		[{ body: 'Prodaja mladičev z rodovnikom' }, ['body']],
		[{ body: 'Puppies for sale near you' }, ['body']],
		[{ title: 'Breeder of the year' }, ['title']],
	])('%o is blocked in %o', async (over, fields) => {
		expect(AdsDomain.blockedFields(ad(over), await AdsDomain.blockedTerms())).toEqual(fields);
	});

	it('matches whole words only and lets ordinary sponsor copy through', async () => {
		const terms = await AdsDomain.blockedTerms();
		expect(AdsDomain.blockedFields(ad({ title: 'Bestseller hrana za pse' }), terms)).toEqual([]);
		expect(AdsDomain.blockedFields(ad({ body: 'Prodajalna opreme za mačke' }), terms)).toEqual([]);
		expect(AdsDomain.blockedFields(ad({}), terms)).toEqual([]);
	});

	it('never blocks the house ads (the adopt ad promotes shelters, not a sale)', async () => {
		const terms = await AdsDomain.blockedTerms();
		for (const row of houseAds) expect(AdsDomain.blockedFields(row, terms)).toEqual([]);
	});

	it('adds the app_config ads.blocked_terms keywords without a deploy', async () => {
		const stored = await prisma.app_config.findUniqueOrThrow({ where: { key: 'ads.blocked_terms' } });
		expect(stored.value).toEqual(expect.arrayContaining(['prodaja mladičev', 'puppies for sale']));
		await prisma.app_config.update({
			where: { key: 'ads.blocked_terms' },
			data: { value: [...(stored.value as string[]), 'Hišni ljubljenček na obroke'] },
		});
		configStore.invalidate();
		try {
			const terms = await AdsDomain.blockedTerms();
			expect(AdsDomain.blockedFields(ad({ body: 'hisni ljubljencek na obroke!' }), terms)).toEqual(['body']);
		} finally {
			await prisma.app_config.update({ where: { key: 'ads.blocked_terms' }, data: { value: stored.value! } });
			configStore.invalidate();
		}
	});
});

describe('AdsDomain.getAdForSlot', () => {
	it('FR-029: a Gorenjska/dog ad is not served to a Ljubljana cat context (house ad instead)', () =>
		isolated(async (tx, ctx) => {
			await house(tx);
			const sponsor = await create(tx, { region_ids: [gorenjska], species: ['dog'] });
			const ljubljanaCat = await AdsDomain.getAdForSlot(
				{ slot: 'detail', municipality_id: LJUBLJANA, species: 'cat', locale: 'sl' },
				ctx
			);
			expect(ljubljanaCat).toMatchObject({
				ad: { is_house: true },
				locale: 'sl',
				region_id: OSREDNJESLOVENSKA,
			});
			expect(ljubljanaCat!.ad.locales).toEqual(['sl']);
			const gorenjskaDog = await AdsDomain.getAdForSlot(
				{ slot: 'detail', region_id: gorenjska, species: 'dog', locale: 'sl' },
				ctx
			);
			expect(gorenjskaDog).toMatchObject({ ad: { id: sponsor.id }, region_id: gorenjska });
		}));

	it('derives the region from the municipality (Kranj is in Gorenjska)', () =>
		isolated(async (tx, ctx) => {
			const sponsor = await create(tx, { region_ids: [gorenjska] });
			const served = await AdsDomain.getAdForSlot({ slot: 'feed', municipality_id: kranj }, ctx);
			expect(served).toMatchObject({ ad: { id: sponsor.id }, region_id: gorenjska });
		}));

	it('targets by municipality and species; null or empty targeting means every context', () =>
		isolated(async (tx, ctx) => {
			await house(tx);
			const kranjOnly = await create(tx, { municipality_ids: [kranj], region_ids: [] });
			const anyDog = await create(tx, { species: ['dog'], region_ids: [], municipality_ids: [] });
			const pick = async (input: Omit<Parameters<typeof AdsDomain.getAdForSlot>[0], 'slot'>) =>
				new Set(await draws(30, { slot: 'detail', ...input }, ctx));
			expect(await pick({ municipality_id: kranj, species: 'cat' })).toEqual(new Set([kranjOnly.id]));
			expect(await pick({ municipality_id: LJUBLJANA, species: 'dog' })).toEqual(new Set([anyDog.id]));
			expect(await pick({ municipality_id: kranj, species: 'dog' })).toEqual(new Set([kranjOnly.id, anyDog.id]));
			const none = await AdsDomain.getAdForSlot({ slot: 'detail', municipality_id: LJUBLJANA }, ctx);
			expect(none?.ad.is_house).toBe(true);
		}));

	it('serves only active, in-date, undeleted ads for the slot and locale', () =>
		isolated(async (tx, ctx) => {
			await house(tx);
			await create(tx, { status: 'paused' });
			await create(tx, { status: 'draft' });
			await create(tx, { status: 'ended' });
			await create(tx, { starts_at: new Date(NOW.getTime() + DAY_MS) });
			await create(tx, { ends_at: NOW });
			await create(tx, { deleted_at: NOW });
			await create(tx, { slots: ['SIDEBAR'] });
			await create(tx, { locales: ['en'] });
			const served = await draws(10, { slot: 'detail', locale: 'sl' }, ctx);
			const rows = await tx.ads.findMany({ where: { id: { in: served as string[] } } });
			expect(rows.every((row) => row.is_house)).toBe(true);

			const live = await create(tx, {
				starts_at: new Date(NOW.getTime() - DAY_MS),
				ends_at: new Date(NOW.getTime() + DAY_MS),
			});
			expect(await AdsDomain.getAdForSlot({ slot: 'detail', locale: 'sl' }, ctx)).toMatchObject({
				ad: { id: live.id },
			});
		}));

	it('rotates matching ads by weight', () =>
		isolated(async (tx, ctx) => {
			const light = await create(tx, { weight: 1 });
			const heavy = await create(tx, { weight: 3 });
			const served = await draws(60, { slot: 'feed', locale: 'sl' }, ctx);
			const heavyShare = served.filter((id) => id === heavy.id).length;
			expect(served.every((id) => id === light.id || id === heavy.id)).toBe(true);
			expect(heavyShare).toBeGreaterThan(30);
			expect(heavyShare).toBeLessThan(60);
		}));

	it('an exclusive ad owns the slot for its context', () =>
		isolated(async (tx, ctx) => {
			await create(tx, { weight: 50 });
			const exclusive = await create(tx, { exclusive: true, region_ids: [gorenjska] });
			expect(new Set(await draws(20, { slot: 'detail', region_id: gorenjska }, ctx))).toEqual(
				new Set([exclusive.id])
			);
			const elsewhere = await AdsDomain.getAdForSlot({ slot: 'detail', region_id: OSREDNJESLOVENSKA }, ctx);
			expect(elsewhere?.ad.id).not.toBe(exclusive.id);
		}));

	it('never serves an ad that sells, gives away or rehomes animals, even one stored past the API', () =>
		isolated(async (tx, ctx) => {
			await house(tx);
			await create(tx, { title: 'Prodam mladiče', weight: 100 });
			await create(tx, { body: 'Kittens for sale', weight: 100 });
			const served = await draws(10, { slot: 'detail' }, ctx);
			const rows = await tx.ads.findMany({ where: { id: { in: served as string[] } } });
			expect(rows.every((row) => row.is_house)).toBe(true);
		}));

	it('rotates the house ads for the locale (supporter, partner, adopt) when nothing matches', () =>
		isolated(async (tx) => {
			await house(tx);
			for (const locale of ['sl', 'en'] as const) {
				const ctx = systemCtx({ tx, now: NOW, locale });
				const served = await draws(60, { slot: 'reunited' }, ctx);
				const rows = await tx.ads.findMany({ where: { id: { in: served as string[] } } });
				expect(new Set(rows.map((row) => row.house_kind))).toEqual(new Set(['supporter', 'partner', 'adopt']));
				expect(rows.every((row) => row.is_house && row.locales.includes(locale))).toBe(true);
			}
		}));

	it('uses the request locale over ctx.locale, and returns null when not even a house ad fits', () =>
		isolated(async (tx, ctx) => {
			await house(tx);
			const served = await AdsDomain.getAdForSlot({ slot: 'sidebar', locale: 'en' }, ctx);
			expect(served).toMatchObject({ locale: 'en', ad: { is_house: true, locales: ['en'] } });
			await tx.ads.updateMany({ where: { is_house: true }, data: { status: 'paused' } });
			expect(await AdsDomain.getAdForSlot({ slot: 'sidebar' }, ctx)).toBeNull();
		}));

	it('nobody is ad-free until Premium entitlements exist (M4), signed-in users included', () =>
		isolated(async (tx) => {
			await house(tx);
			const actor: Actor = {
				user_id: randomUUID(),
				role: 'USER',
				is_anonymous: false,
				aal: 'aal1',
				email_verified: true,
				locale: 'sl',
			};
			const served = await AdsDomain.getAdForSlot({ slot: 'feed' }, { ...userCtx(actor), tx, now: NOW });
			expect(served?.ad.is_house).toBe(true);
		}));
});

describe('AdsDomain.recordImpression', () => {
	const stats = (tx: Prisma.TransactionClient, ad_id: string) =>
		tx.ad_stats_daily.findMany({ where: { ad_id }, orderBy: [{ day: 'asc' }, { region_id: 'asc' }] });

	it('aggregates per ad, slot, Ljubljana day and region with no user identifiers: 100 impressions = 100', () =>
		isolated(async (tx, ctx) => {
			const ad = await create(tx);
			for (let i = 0; i < 100; i++)
				await AdsDomain.recordImpression({ ad_id: ad.id, slot: 'detail', region_id: gorenjska }, ctx);
			await AdsDomain.recordImpression({ ad_id: ad.id, slot: 'feed' }, ctx);
			await AdsDomain.recordImpression({ ad_id: ad.id, slot: 'feed', region_id: 999 }, ctx);
			// 22:30 UTC is already the next day in Ljubljana.
			await AdsDomain.recordImpression(
				{ ad_id: ad.id, slot: 'detail', region_id: gorenjska },
				{ ...ctx, now: new Date('2026-10-15T22:30:00Z') }
			);
			const rows = await stats(tx, ad.id);
			expect(
				rows.map(({ day, slot, region_id, impressions, clicks }) => ({
					day: day.toISOString().slice(0, 10),
					slot,
					region_id,
					impressions,
					clicks,
				}))
			).toEqual([
				{ day: '2026-10-15', slot: 'FEED', region_id: 0, impressions: 2, clicks: 0 },
				{ day: '2026-10-15', slot: 'DETAIL', region_id: gorenjska, impressions: 100, clicks: 0 },
				{ day: '2026-10-16', slot: 'DETAIL', region_id: gorenjska, impressions: 1, clicks: 0 },
			]);
			expect(Object.keys(rows[0]!).sort()).toEqual([
				'ad_id',
				'clicks',
				'day',
				'impressions',
				'region_id',
				'slot',
			]);
		}));

	it('NOT_FOUND for an unknown or deleted ad, or a slot the ad does not run in', () =>
		isolated(async (tx, ctx) => {
			const ad = await create(tx, { slots: ['DETAIL'] });
			const deleted = await create(tx, { deleted_at: NOW });
			for (const input of [
				{ ad_id: randomUUID(), slot: 'detail' as const },
				{ ad_id: deleted.id, slot: 'detail' as const },
				{ ad_id: ad.id, slot: 'sidebar' as const },
			])
				await expect(AdsDomain.recordImpression(input, ctx)).rejects.toMatchObject({ code: 'NOT_FOUND' });
			expect(await stats(tx, ad.id)).toEqual([]);
		}));
});

describe('AdsDomain.assertAdWritable (every save, TASK-37.2)', () => {
	const actor = (role: Actor['role'], aal: Actor['aal'], is_anonymous = false): Actor => ({
		user_id: randomUUID(),
		role,
		is_anonymous,
		aal,
		email_verified: true,
		locale: 'sl',
	});
	const adminCtx = (tx: Prisma.TransactionClient): Ctx => ({ ...userCtx(actor('ADMIN', 'aal2')), tx });
	const input = (over: Partial<AdInput> = {}): AdInput & { id?: string } => ({
		title: 'Ambulanta',
		body: 'Dežurni veterinar 24/7.',
		cta: 'Pokličite',
		link_url: 'https://example.com/ambulanta',
		image_alt: 'Veterinarka pregleduje psa',
		slots: ['detail'],
		...over,
	});

	it.each([
		['a signed-out caller', null, 'UNAUTHENTICATED'],
		['an anonymous finder', actor('USER', 'aal2', true), 'UNAUTHENTICATED'],
		['a user', actor('USER', 'aal2'), 'FORBIDDEN'],
		['a shelter member', actor('SHELTER_MEMBER', 'aal2'), 'FORBIDDEN'],
		['a moderator with TOTP', actor('MODERATOR', 'aal2'), 'FORBIDDEN'],
		['an admin without TOTP', actor('ADMIN', 'aal1'), 'AAL2_REQUIRED'],
	])('refuses %s with %s', async (_who, who, code) => {
		const ctx = who ? userCtx(who) : systemCtx();
		await expect(AdsDomain.assertAdWritable(input(), ctx)).rejects.toMatchObject({ code });
	});

	it('lets an admin with aal2 save an ordinary ad', () =>
		isolated(async (tx) => {
			await expect(AdsDomain.assertAdWritable(input(), adminCtx(tx))).resolves.toBeUndefined();
		}));

	it('rejects ads that sell, give away or rehome animals, naming each field', () =>
		isolated(async (tx) => {
			await expect(
				AdsDomain.assertAdWritable(input({ title: 'Prodam psa', cta: 'Oddam' }), adminCtx(tx))
			).rejects.toMatchObject({
				code: 'VALIDATION',
				issues: [
					{ path: 'title', message: 'Ads may not sell, give away or rehome animals' },
					{ path: 'cta', message: 'Ads may not sell, give away or rehome animals' },
				],
			});
		}));

	it('rejects an exclusive ad overlapping another in dates for a shared slot and region', () =>
		isolated(async (tx) => {
			const october = { starts_at: new Date('2026-10-01T00:00:00Z'), ends_at: new Date('2026-11-01T00:00:00Z') };
			const existing = await create(tx, {
				exclusive: true,
				slots: ['DETAIL'],
				region_ids: [gorenjska],
				...october,
			});
			const exclusive = (over: Partial<AdInput> & { id?: string }) =>
				AdsDomain.assertAdWritable(
					input({ exclusive: true, region_ids: [gorenjska], starts_at: '2026-10-15T00:00:00Z', ...over }),
					adminCtx(tx)
				);
			const overlap = { code: 'VALIDATION', issues: [{ path: 'exclusive' }] };

			await expect(exclusive({ ends_at: '2026-11-15T00:00:00Z' })).rejects.toMatchObject(overlap);
			await expect(exclusive({ ends_at: null })).rejects.toMatchObject(overlap);
			await expect(exclusive({ region_ids: null })).rejects.toMatchObject(overlap);
			await expect(exclusive({ slots: ['feed', 'detail'] })).rejects.toMatchObject(overlap);

			await expect(exclusive({ slots: ['feed'] })).resolves.toBeUndefined();
			await expect(exclusive({ region_ids: [OSREDNJESLOVENSKA] })).resolves.toBeUndefined();
			await expect(exclusive({ starts_at: '2026-11-01T00:00:00Z' })).resolves.toBeUndefined();
			await expect(exclusive({ exclusive: false })).resolves.toBeUndefined();
			// Editing the same ad does not collide with itself.
			await expect(exclusive({ id: existing.id })).resolves.toBeUndefined();

			// An existing ad without a region (every region) or without an end date collides as well.
			await tx.ads.update({ where: { id: existing.id }, data: { region_ids: [], ends_at: null } });
			await expect(
				exclusive({ region_ids: [OSREDNJESLOVENSKA], starts_at: '2027-03-01T00:00:00Z' })
			).rejects.toMatchObject(overlap);
			// An ended ad no longer holds the slot.
			await tx.ads.update({ where: { id: existing.id }, data: { status: 'ended' } });
			await expect(exclusive({})).resolves.toBeUndefined();
		}));
});

// GET /v1/sync/reports (C4, C17): first sync, incremental upserts and removals, area filter, the (updated_at, id)
// cursor across page boundaries, the public whitelist for every caller, validation, rate limit and a 1000-report area.
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CachedReport } from '@zivali/validation';

import { app } from '../../app.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import ReportsDao from '../../domains/reports/reports.dao.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { userCtx, type Actor } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

type Area = { lat: number; lng: number; radius_km: number };
type Feed = { upserts: Record<string, unknown>[]; removed_ids: string[]; server_time: string; has_more: boolean };

const ids = {
	owner: randomUUID(),
	finder: randomUUID(),
	other: randomUUID(),
	anon: randomUUID(),
	mod: randomUUID(),
	admin: randomUUID(),
};
const actor = (user_id: string): Actor => ({
	user_id,
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
});
const CHIP = '705098100000077';
const EMAIL = 'sync-finder@test.invalid';
const KM_LAT = 1 / 111.32;
// A random spot in the Atlantic per run, so reports of other test files and earlier runs never fall in the areas.
const centre = { lat: 40 + Math.random() * 5, lng: -30 + Math.random() * 5 };
const at = (northKm: number, eastKm = 0) => ({
	lat: centre.lat + northKm * KM_LAT,
	lng: centre.lng + (eastKm * KM_LAT) / Math.cos((centre.lat * Math.PI) / 180),
});
const area = (northKm: number, eastKm: number, radius_km: number): Area => ({ ...at(northKm, eastKm), radius_km });
const A = area(0, 0, 2);
const B = area(0, 50, 1);
const PAGED = area(100, 0, 1);
const BULK = area(150, 0, 3);

const r = {} as Record<
	| 'lost'
	| 'found'
	| 'matched'
	| 'edge'
	| 'hidden'
	| 'held'
	| 'closed'
	| 'toClose'
	| 'toReunite'
	| 'toExpire'
	| 'toHide'
	| 'toRemove'
	| 'outside'
	| 'inB',
	string
>;
const paged: string[] = [];
const bulk: string[] = [];

const create = (user: Actor, input: Partial<NewReport>) =>
	ReportsDomain.insertReport(
		{ type: 'found', species: 'cat', location: at(0), event_at: new Date(Date.now() - 3600_000), ...input },
		userCtx(user)
	).then(({ id }) => id);

let device = 0;
const sync = (areas: Area[], query: { since?: string; limit?: number } = {}, headers: Record<string, string> = {}) =>
	request(app)
		.get('/v1/sync/reports')
		.query({ areas: JSON.stringify(areas), ...query })
		.set({ 'x-device-id': `sync-test-${process.pid}-${Date.now()}-${device++}`, ...headers });

/** Every page from `since` with this limit; the pages' has_more flags and the last cursor. */
async function syncAll(areas: Area[], since: string | undefined, limit: number) {
	const pages: Feed[] = [];
	let cursor = since;
	do {
		const res = await sync(areas, { ...(cursor && { since: cursor }), limit });
		expect(res.status).toBe(200);
		pages.push(res.body);
		cursor = res.body.server_time;
	} while (pages.at(-1)!.has_more && pages.length < 10);
	return {
		pages,
		upserts: pages.flatMap((page) => page.upserts.map((u) => u.id as string)),
		removed: pages.flatMap((page) => page.removed_ids),
		cursor: cursor!,
	};
}

const ageAll = (reportIds: string[]) =>
	prisma.$executeRaw`update app.reports set updated_at = now() - interval '10 minutes' where id = any(${reportIds}::uuid[])`;

beforeAll(async () => {
	const roles: Record<string, USER_ROLE> = { [ids.mod]: 'MODERATOR', [ids.admin]: 'ADMIN' };
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	const owner = actor(ids.owner);
	const finder = actor(ids.finder);
	r.lost = await create(owner, {
		type: 'lost',
		species: 'dog',
		name: 'Piki',
		chip: CHIP,
		collar: 'rdeča ovratnica',
		circumstances: 'Ušel med sprehodom.',
		reward_eur: 100,
		reward_note: 'Za pomoč',
	});
	await prisma.reports.update({ where: { id: r.lost }, data: { manage_token_hash: randomBytes(32) } });
	await prisma.report_contacts.create({ data: { report_id: r.lost, email: EMAIL } });
	await prisma.photos.createMany({
		data: [0, 1].map((position) => ({
			owner_id: ids.owner,
			report_id: r.lost,
			position,
			sha256: randomBytes(32).toString('hex'),
			width: 800,
			height: 600,
			bytes: 50_000,
			status: 'published' as const,
			public_display_url: `https://media.test/r/${r.lost}/${position}/display.jpg`,
			public_thumb_url: `https://media.test/r/${r.lost}/${position}/thumb.webp`,
		})),
	});
	r.found = await create(finder, { location: at(0.5, 0.5) });
	// A 5 km public circle 6 km away still meets the 2 km area.
	r.edge = await create(owner, { type: 'lost', species: 'dog', location: at(6), requested_radius_m: 5000 });
	r.outside = await create(finder, { location: at(10) });
	r.inB = await create(finder, { location: at(0, 50) });
	for (const key of ['matched', 'hidden', 'held', 'closed', 'toClose', 'toReunite', 'toExpire', 'toHide', 'toRemove'])
		r[key as keyof typeof r] = await create(finder, { location: at(-0.5, 0.3) });
	await prisma.reports.update({ where: { id: r.matched }, data: { status: 'matched' } });
	await prisma.reports.update({ where: { id: r.hidden }, data: { moderation_state: 'hidden' } });
	await prisma.reports.update({ where: { id: r.held }, data: { moderation_state: 'held' } });
	await prisma.reports.update({
		where: { id: r.closed },
		data: { status: 'closed', close_reason: 'gave_up', closed_at: new Date() },
	});
	for (let i = 0; i < 5; i++) paged.push(await create(finder, { location: at(100, i * 0.1) }));
	await ageAll([...Object.values(r), ...paged]);
	// Rows sharing one updated_at: the cursor must not skip any of them at a page boundary.
	await prisma.$executeRaw`update app.reports set updated_at = now() - interval '20 minutes' where id = any(${paged}::uuid[])`;
});

afterAll(async () => {
	await prisma.reports.deleteMany({
		where: { OR: [{ created_by: { in: Object.values(ids) } }, { id: { in: bulk } }] },
	});
	await prisma.profiles.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

const live = ['lost', 'found', 'matched', 'edge', 'toClose', 'toReunite', 'toExpire', 'toHide', 'toRemove'] as const;
let cursor = '';

describe('GET /v1/sync/reports, feed', () => {
	it('first sync (no since): open and matched visible reports of the area as CachedReport, no removals', async () => {
		const res = await sync([A]);
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(res.body.has_more).toBe(false);
		expect(res.body.removed_ids).toEqual([]);
		expect(res.body.upserts.map((u: { id: string }) => u.id).sort()).toEqual(live.map((key) => r[key]).sort());
		const lost = res.body.upserts.find((u: { id: string }) => u.id === r.lost);
		// Outside Slovenia there are no municipality and region slugs; every other CachedReport field is there.
		const keys = Object.keys(CachedReport.shape).filter((key) => !key.endsWith('_slug'));
		expect(Object.keys(lost).sort()).toEqual(keys.sort());
		expect(lost).toMatchObject({
			type: 'lost',
			status: 'open',
			name: 'Piki',
			has_chip: true,
			boosted: false,
			thumb_url: `https://media.test/r/${r.lost}/0/thumb.webp`,
		});
		const stored = (await ReportsDao.getLocation(r.lost))!;
		expect(lost.area).toEqual({ ...stored.public, radius_m: stored.public_radius_m });
		const found = res.body.upserts.find((u: { id: string }) => u.id === r.found);
		expect(found.thumb_url).toBeNull();
		expect(found).not.toHaveProperty('name');
		cursor = res.body.server_time;
	});

	it('never returns the stored point, chip number, token, contact data or creator', async () => {
		const res = await sync([A]);
		const raw = JSON.stringify(res.body);
		const stored = (await ReportsDao.getLocation(r.lost))!;
		for (const secret of [CHIP, EMAIL, ids.owner, ids.finder, String(stored.exact.lat), String(stored.exact.lng)])
			expect(raw).not.toContain(secret);
		for (const key of ['location', 'chip_number', 'manage_token_hash', 'created_by', 'collar', 'reward', 'photos'])
			expect(res.body.upserts[0]).not.toHaveProperty(key);
	});

	it('filters by area: a report outside every area is never sent; a second area adds its reports', async () => {
		const both = await sync([A, B]);
		const got = both.body.upserts.map((u: { id: string }) => u.id);
		expect(got).toContain(r.inB);
		expect(got).not.toContain(r.outside);
		expect((await sync([B])).body.upserts.map((u: { id: string }) => u.id)).toEqual([r.inB]);
	});

	it('incremental: nothing changed → empty; an edit comes back as an upsert', async () => {
		const quiet = await sync([A], { since: cursor });
		expect(quiet.body).toMatchObject({ upserts: [], removed_ids: [], has_more: false });
		await prisma.reports.update({ where: { id: r.lost }, data: { circumstances: 'Viden pri mostu.' } });
		const res = await sync([A], { since: cursor });
		expect(res.body.upserts.map((u: { id: string }) => u.id)).toEqual([r.lost]);
		expect(res.body.removed_ids).toEqual([]);
	});

	it('removal on close, reunite, expiry, hide and remove; changes outside the areas are not sent', async () => {
		const closed_at = new Date();
		await prisma.reports.update({
			where: { id: r.toClose },
			data: { status: 'closed', close_reason: 'found_elsewhere', closed_at },
		});
		await prisma.reports.update({
			where: { id: r.toReunite },
			data: { status: 'reunited', reunited_at: closed_at },
		});
		await prisma.reports.update({
			where: { id: r.toExpire },
			data: { status: 'closed', close_reason: 'expired', closed_at },
		});
		await prisma.reports.update({ where: { id: r.toHide }, data: { moderation_state: 'hidden' } });
		await prisma.reports.update({ where: { id: r.toRemove }, data: { moderation_state: 'removed' } });
		await prisma.reports.update({ where: { id: r.outside }, data: { status: 'closed', closed_at } });
		const res = await sync([A], { since: cursor });
		expect(res.status).toBe(200);
		expect(res.body.removed_ids.sort()).toEqual([r.toClose, r.toReunite, r.toExpire, r.toHide, r.toRemove].sort());
		expect(res.body.upserts.map((u: { id: string }) => u.id)).toEqual([r.lost]);
		// The next first sync no longer has them.
		const fresh = (await sync([A])).body.upserts.map((u: { id: string }) => u.id);
		for (const key of ['toClose', 'toReunite', 'toExpire', 'toHide', 'toRemove'] as const)
			expect(fresh).not.toContain(r[key]);
	});

	it('cursor: rows sharing one updated_at across page boundaries are all delivered, upserts and removals alike', async () => {
		const first = await syncAll([PAGED], undefined, 2);
		expect(first.pages.map((page) => page.has_more)).toEqual([true, true, false]);
		expect(first.upserts.sort()).toEqual([...paged].sort());
		expect(new Set(first.upserts).size).toBe(5);
		expect(first.removed).toEqual([]);

		// Two closed and three edited in one transaction: one shared updated_at after the cursor.
		await prisma.$executeRaw`
			update app.reports set updated_at = now(),
				status = case when id = any(${paged.slice(0, 2)}::uuid[]) then 'closed'::app."REPORT_STATUS" else status end
			where id = any(${paged}::uuid[])`;
		const next = await syncAll([PAGED], first.cursor, 2);
		expect(next.pages.map((page) => page.has_more)).toEqual([true, true, false]);
		expect(next.removed.sort()).toEqual(paged.slice(0, 2).sort());
		expect(next.upserts.sort()).toEqual(paged.slice(2).sort());
		expect(next.pages.map((page) => page.upserts.length + page.removed_ids.length)).toEqual([2, 2, 1]);
	});

	it('serves 1000 reports of one area in one call in under 500 ms', async () => {
		const prefix = ReportsDomain.newShortCode().slice(0, 4);
		const rows = await prisma.$queryRaw<{ id: string }[]>`
			insert into app.reports (id, short_code, type, species, event_at, exact_point, public_point, public_radius_m)
			select gen_random_uuid(), ${prefix} || lpad(i::text, 4, '0'), 'found'::app."REPORT_TYPE",
				'cat'::app."SPECIES", now(), p, p, 150
			from generate_series(1, 1000) as i,
				lateral (select extensions.st_setsrid(extensions.st_makepoint(
					${BULK.lng}::float8 + (i % 40) * 0.0005, ${BULK.lat}::float8 + (i / 40) * 0.0005), 4326)::extensions.geography as p) as g
			returning id::text as id`;
		bulk.push(...rows.map((row) => row.id));
		await sync([BULK], { limit: 1000 }); // warm-up (connection pool, plan cache)
		const started = performance.now();
		const res = await sync([BULK], { limit: 1000 });
		const elapsed = performance.now() - started;
		expect(res.status).toBe(200);
		expect(res.body.upserts).toHaveLength(1000);
		expect(res.body.has_more).toBe(false);
		expect(elapsed).toBeLessThan(500);
	});
});

describe('GET /v1/sync/reports, callers, validation and rate limit', () => {
	const callers: Record<string, () => Promise<string | undefined>> = {
		'anonymous visitor': async () => undefined,
		'anonymous user': () => signTestToken({ sub: ids.anon, is_anonymous: true }),
		'owner (manager)': () => signTestToken({ sub: ids.owner }),
		'other user': () => signTestToken({ sub: ids.other }),
		'moderator aal1': () => signTestToken({ sub: ids.mod }),
		'moderator aal2': () => signTestToken({ sub: ids.mod, aal: 'aal2' }),
		'admin aal2': () => signTestToken({ sub: ids.admin, aal: 'aal2' }),
	};

	for (const [name, token] of Object.entries(callers))
		it(`${name}: the same public feed, never owner fields`, async () => {
			const t = await token();
			const res = await sync([A], {}, t ? { Authorization: `Bearer ${t}` } : {});
			expect(res.status).toBe(200);
			const got = res.body.upserts.map((u: { id: string }) => u.id);
			expect(got).toContain(r.lost);
			expect(got).not.toContain(r.hidden);
			expect(got).not.toContain(r.held);
			for (const upsert of res.body.upserts)
				expect(Object.keys(upsert).every((key) => key in CachedReport.shape)).toBe(true);
			expect(JSON.stringify(res.body)).not.toContain(CHIP);
		});

	it('rejects bad areas, limit and since with VALIDATION', async () => {
		const bad = [
			() => request(app).get('/v1/sync/reports'),
			() => request(app).get('/v1/sync/reports').query({ areas: '[{' }),
			() => sync([A, A, A, A]),
			() => sync([]),
			() => sync([{ ...A, radius_km: 26 }]),
			() => sync([{ ...A, lat: 91 }]),
			() => sync([A], { limit: 1001 }),
			() => sync([A], { since: 'not-a-cursor' }),
			() => sync([A], { since: Buffer.from(JSON.stringify(['yesterday', 'x'])).toString('base64url') }),
		];
		for (const call of bad) {
			const res = await call();
			expect(res.status).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
	});

	it('allows 60 calls per hour per device id, then RATE_LIMITED', async () => {
		const empty = [area(-300, 0, 0.1)];
		const headers = { 'x-device-id': `sync-limit-${randomUUID()}` };
		for (let i = 0; i < 60; i++) expect((await sync(empty, {}, headers)).status).toBe(200);
		const limited = await sync(empty, {}, headers);
		expect(limited.status).toBe(429);
		expect(limited.body.error.code).toBe('RATE_LIMITED');
		expect(limited.headers['retry-after']).toBeDefined();
		expect((await sync(empty)).status).toBe(200);
	});
});

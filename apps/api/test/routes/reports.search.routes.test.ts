// GET /v1/reports and GET /v1/reports/map (C4 ReportSearch, TASK-31.3): filters, visibility, boosted first, keyset
// pages, public fields only (public_point, never the stored point or contact data), permission matrix, 500 reports
// in a viewport under 300 ms with the GiST index.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MapReport, PublicReport } from '@zivali/validation';

import { app } from '../../app.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import { searchWhere } from '../../domains/reports/search.dao.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import { userCtx, type Actor } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const ids = {
	owner: randomUUID(),
	finder: randomUUID(),
	other: randomUUID(),
	anon: randomUUID(),
	mod: randomUUID(),
	admin: randomUUID(),
	perf: randomUUID(),
};
const actor = (user_id: string, is_anonymous = false): Actor => ({
	user_id,
	role: 'USER',
	is_anonymous,
	aal: 'aal1',
	email_verified: !is_anonymous,
	locale: 'sl',
});
const CHIP = '705098100000077';
const EMAIL = 'search-contact@test.invalid';
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
// Kočevje: no seeded fixture reports here.
const BBOX = '14.8,45.6,14.9,45.7';
type Key =
	| 'lostDog'
	| 'foundCat'
	| 'sightedDog'
	| 'matched'
	| 'oldEvent'
	| 'outside'
	| 'hidden'
	| 'held'
	| 'removed'
	| 'closedRecent'
	| 'closedOld'
	| 'expired'
	| 'reunitedRecent';
const codes = {} as Record<Key, string>;
const DEFAULT: Key[] = ['lostDog', 'foundCat', 'sightedDog', 'matched', 'oldEvent'];
const CLOSED: Key[] = ['closedRecent', 'expired', 'reunitedRecent'];
const NOT_VISIBLE: Key[] = ['hidden', 'held', 'removed'];

const create = async (key: Key, user: Actor, input: Partial<NewReport>, data?: object) => {
	const { id, short_code } = await ReportsDomain.insertReport(
		{
			type: 'lost',
			species: 'dog',
			location: { lat: 45.65, lng: 14.85 },
			event_at: new Date(Date.now() - DAY),
			...input,
		},
		userCtx(user)
	);
	if (data) await prisma.reports.update({ where: { id }, data });
	codes[key] = short_code;
	return id;
};

const list = (query: string, token?: string) => {
	const req = request(app).get(`/v1/reports?${query}`);
	return token ? req.set('Authorization', `Bearer ${token}`) : req;
};
const map = (query: string, token?: string) => {
	const req = request(app).get(`/v1/reports/map?${query}`);
	return token ? req.set('Authorization', `Bearer ${token}`) : req;
};
const shortCodes = (body: { items: { short_code: string }[] }) => body.items.map((item) => item.short_code);
const codesOf = (keys: Key[]) => keys.map((key) => codes[key]);
const sorted = (values: string[]) => [...values].sort();

beforeAll(async () => {
	const roles: Record<string, USER_ROLE> = { [ids.mod]: 'MODERATOR', [ids.admin]: 'ADMIN' };
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	const owner = actor(ids.owner);
	const lostId = await create(
		'lostDog',
		owner,
		{
			location: { lat: 45.64, lng: 14.84 },
			chip: CHIP,
			collar: 'modra ovratnica',
			colours: ['brown', 'white'],
			size: 'm',
		},
		{ boosted_until: new Date(Date.now() + DAY), manage_token_hash: randomBytes(32) }
	);
	await prisma.report_contacts.create({ data: { report_id: lostId, email: EMAIL } });
	await prisma.photos.createMany({
		data: [0, 1].map((position) => ({
			owner_id: ids.owner,
			report_id: lostId,
			position,
			sha256: randomBytes(32).toString('hex'),
			width: 800,
			height: 600,
			bytes: 50_000,
			status: 'published' as const,
			public_display_url: `https://media.test/r/${lostId}/${position}/display.jpg`,
			public_thumb_url: `https://media.test/r/${lostId}/${position}/thumb.webp`,
		})),
	});
	await create('foundCat', actor(ids.anon, true), {
		type: 'found',
		species: 'cat',
		source: 'anonymous',
		location: { lat: 45.65, lng: 14.86 },
		event_at: new Date(Date.now() - 2 * HOUR),
		colours: ['black'],
		size: 's',
	});
	await create('sightedDog', actor(ids.finder), {
		type: 'sighted',
		location: { lat: 45.66, lng: 14.88 },
		event_at: new Date(Date.now() - 3 * HOUR),
		size: 'l',
		linked_report_id: lostId,
	});
	await create(
		'matched',
		owner,
		{ location: { lat: 45.62, lng: 14.82 }, event_at: new Date(Date.now() - 2 * DAY) },
		{ status: 'matched' }
	);
	await create('oldEvent', owner, {
		location: { lat: 45.68, lng: 14.83 },
		event_at: new Date(Date.now() - 60 * DAY),
	});
	await create('outside', owner, { location: { lat: 45.75, lng: 14.95 } });
	await create('hidden', owner, {}, { moderation_state: 'hidden' });
	await create('held', owner, {}, { moderation_state: 'held' });
	// Abuse auto-hide (TASK-25.2) sets hidden on an otherwise open report; removed by moderation.
	await create('removed', owner, {}, { moderation_state: 'removed' });
	await create(
		'closedRecent',
		owner,
		{},
		{
			status: 'closed',
			close_reason: 'found_elsewhere',
			closed_at: new Date(Date.now() - 5 * DAY),
		}
	);
	await create(
		'closedOld',
		owner,
		{},
		{
			status: 'closed',
			close_reason: 'gave_up',
			closed_at: new Date(Date.now() - 31 * DAY),
		}
	);
	await create(
		'expired',
		owner,
		{},
		{
			status: 'closed',
			close_reason: 'expired',
			closed_at: new Date(Date.now() - 2 * DAY),
		}
	);
	await create('reunitedRecent', owner, {}, { status: 'reunited', reunited_at: new Date(Date.now() - 3 * DAY) });
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
	await prisma.profiles.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

describe('GET /v1/reports', () => {
	it('lists visible open and matched reports in the viewport, boosted first, then the latest events', async () => {
		const res = await list(`bbox=${BBOX}`);
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(shortCodes(res.body)).toEqual(codesOf(DEFAULT));
		expect(res.body).toMatchObject({ next_cursor: null, total_estimate: 5 });
		expect(res.body.items[0]).toMatchObject({ boosted: true, is_mine: false, has_chip: true });
		expect(res.body.items.slice(1).every((item: { boosted: boolean }) => !item.boosted)).toBe(true);
	});

	it('returns the PublicReport whitelist only: public_point area, no stored point, chip or contact data', async () => {
		const res = await list(`bbox=${BBOX}`);
		for (const item of res.body.items) {
			expect(PublicReport.safeParse(item).success).toBe(true);
			expect(Object.keys(item).every((key) => key in PublicReport.shape)).toBe(true);
		}
		const raw = JSON.stringify(res.body);
		for (const secret of [CHIP, EMAIL, ids.owner, 'modra ovratnica', 'manage_token'])
			expect(raw).not.toContain(secret);
		const lost = res.body.items[0];
		expect(lost.photos[0].thumb_url).toContain('/0/thumb.webp');
		expect(lost.area).toEqual((await request(app).get(`/v1/reports/${codes.lostDog}`)).body.area);
	});

	it('gives managers is_mine on their items but still only public fields and the public area', async () => {
		const token = await signTestToken({ sub: ids.owner });
		const res = await list(`bbox=${BBOX}`, token);
		const lost = res.body.items.find((item: { short_code: string }) => item.short_code === codes.lostDog);
		expect(lost.is_mine).toBe(true);
		for (const key of ['location', 'chip_number', 'manager_role', 'moderation_state', 'reward_eur'])
			expect(lost).not.toHaveProperty(key);
		const owned = (await request(app).get(`/v1/reports/${codes.lostDog}`).set('Authorization', `Bearer ${token}`))
			.body;
		expect(lost.area).toMatchObject({ lat: owned.area.lat, lng: owned.area.lng });
		expect([lost.area.lat, lost.area.lng]).not.toEqual([owned.location.lat, owned.location.lng]);
		expect(JSON.stringify(res.body)).not.toContain(String(owned.location.lat));
		const found = res.body.items.find((item: { short_code: string }) => item.short_code === codes.foundCat);
		expect(found.is_mine).toBe(false);
	});

	it('adds reports closed or reunited in the last 30 days with include_closed, never hidden, held or older', async () => {
		const res = await list(`bbox=${BBOX}&include_closed=true`);
		expect(sorted(shortCodes(res.body))).toEqual(sorted(codesOf([...DEFAULT, ...CLOSED])));
		expect(res.body.total_estimate).toBe(8);
		expect(sorted(shortCodes((await list(`bbox=${BBOX}&include_closed=false`)).body))).toEqual(
			sorted(codesOf(DEFAULT))
		);
	});

	it('never returns hidden, held or removed reports (moderation_state visible only), also to their owner', async () => {
		const owner = await signTestToken({ sub: ids.owner });
		const hidden = codesOf(NOT_VISIBLE);
		for (const query of [
			`bbox=${BBOX}`,
			`bbox=${BBOX}&include_closed=true`,
			'near=45.65,14.85,20&sort=distance',
			`bbox=${BBOX}&types=lost&species=dog`,
		])
			for (const token of [undefined, owner]) {
				const res = await list(query, token);
				expect(res.status, query).toBe(200);
				expect(
					shortCodes(res.body).filter((code) => hidden.includes(code)),
					query
				).toEqual([]);
				const mapped = await map(`bbox=${BBOX}&include_closed=true`, token);
				expect(shortCodes(mapped.body).filter((code) => hidden.includes(code))).toEqual([]);
			}
		// The same open report becomes visible again once moderation sets it back.
		await prisma.reports.update({ where: { short_code: codes.hidden }, data: { moderation_state: 'visible' } });
		expect(shortCodes((await list(`bbox=${BBOX}`)).body)).toContain(codes.hidden);
		expect(shortCodes((await map(`bbox=${BBOX}`)).body)).toContain(codes.hidden);
		await prisma.reports.update({ where: { short_code: codes.hidden }, data: { moderation_state: 'hidden' } });
		expect(shortCodes((await list(`bbox=${BBOX}`)).body)).not.toContain(codes.hidden);
		expect(shortCodes((await map(`bbox=${BBOX}`)).body)).not.toContain(codes.hidden);
	});

	it('filters by types, species, colours (any of), sizes and the event date range', async () => {
		const cases: [string, Key[]][] = [
			['types=found,sighted', ['foundCat', 'sightedDog']],
			['types=lost&types=found', ['lostDog', 'foundCat', 'matched', 'oldEvent']],
			['species=cat', ['foundCat']],
			['colours=white,black', ['lostDog', 'foundCat']],
			['sizes=l', ['sightedDog']],
			[`to=${new Date(Date.now() - 30 * DAY).toISOString()}`, ['oldEvent']],
			[`from=${new Date(Date.now() - 30 * DAY).toISOString()}`, ['lostDog', 'foundCat', 'sightedDog', 'matched']],
		];
		for (const [query, keys] of cases) {
			const res = await list(`bbox=${BBOX}&${query}`);
			expect(res.status, query).toBe(200);
			expect(sorted(shortCodes(res.body)), query).toEqual(sorted(codesOf(keys)));
			expect(res.body.total_estimate, query).toBe(keys.length);
		}
	});

	it('filters by near (km around a point) on the public centre', async () => {
		const res = await list('near=45.75,14.95,2');
		expect(shortCodes(res.body)).toEqual([codes.outside]);
		expect(shortCodes((await list(`bbox=${BBOX}&near=45.75,14.95,2`)).body)).toEqual([]);
	});

	it('sorts by distance of the public centre with near, boosted first', async () => {
		const [lat, lng] = [45.62, 14.82];
		const res = await list(`bbox=${BBOX}&near=${lat},${lng},50&sort=distance`);
		expect(res.status).toBe(200);
		expect(sorted(shortCodes(res.body))).toEqual(sorted(codesOf(DEFAULT)));
		expect(res.body.items[0].short_code).toBe(codes.lostDog);
		const distances = res.body.items
			.slice(1)
			.map((item: { area: { lat: number; lng: number } }) =>
				Math.hypot(item.area.lat - lat, (item.area.lng - lng) * Math.cos((lat * Math.PI) / 180))
			);
		expect(distances).toEqual([...distances].sort((a, b) => a - b));
	});

	it('pages with a keyset cursor (the last item id) in both sorts', async () => {
		for (const query of [`bbox=${BBOX}`, `bbox=${BBOX}&near=45.62,14.82,50&sort=distance`]) {
			const all = shortCodes((await list(query)).body);
			const seen: string[] = [];
			let cursor: string | null = null;
			do {
				const res: request.Response = await list(`${query}&limit=2${cursor ? `&cursor=${cursor}` : ''}`);
				expect(res.status).toBe(200);
				expect(res.body.items.length).toBeLessThanOrEqual(2);
				expect(res.body.total_estimate).toBe(5);
				seen.push(...shortCodes(res.body));
				cursor = res.body.next_cursor;
				if (cursor) expect(cursor).toBe(res.body.items[1].id);
			} while (cursor);
			expect(seen).toEqual(all);
		}
		const unknown = await list(`bbox=${BBOX}&cursor=${randomUUID()}`);
		expect(unknown.body).toMatchObject({ items: [], next_cursor: null, total_estimate: 5 });
		// A cursor naming a hidden report is as good as unknown.
		const hidden = await prisma.reports.findFirstOrThrow({ where: { short_code: codes.hidden } });
		const gone = await list(`bbox=${BBOX}&cursor=${hidden.id}`);
		expect(gone.body).toMatchObject({ items: [], next_cursor: null });
	});

	it('answers VALIDATION for bad queries', async () => {
		for (const query of [
			'sort=distance',
			`bbox=${BBOX}&sort=distance`,
			'bbox=14.9,45.6,14.8,45.7',
			'bbox=14.8,45.6,14.9',
			'near=45.6,14.8,101',
			'types=adopted',
			'limit=51',
			'cursor=not-a-uuid',
			'from=yesterday',
		]) {
			const res = await list(query);
			expect(res.status, query).toBe(400);
			expect(res.body.error.code, query).toBe('VALIDATION');
		}
		expect((await list('sort=distance')).body.error.issues).toEqual([
			{ path: 'sort', message: expect.any(String) },
		]);
	});
});

describe('GET /v1/reports/map', () => {
	it('returns minimal items in the viewport: boosted first, public area and the first thumbnail', async () => {
		const res = await map(`bbox=${BBOX}`);
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(shortCodes(res.body)).toEqual(codesOf(DEFAULT));
		for (const item of res.body.items)
			expect(sorted(Object.keys(item))).toEqual(sorted(Object.keys(MapReport.shape)));
		const [lost] = res.body.items;
		expect(lost).toMatchObject({ type: 'lost', species: 'dog', boosted: true });
		expect(lost.thumb_url).toContain('/0/thumb.webp');
		expect(lost.area).toEqual((await list(`bbox=${BBOX}`)).body.items[0].area);
		expect(res.body.items[1].thumb_url).toBeNull();
		const raw = JSON.stringify(res.body);
		for (const secret of [CHIP, EMAIL, ids.owner]) expect(raw).not.toContain(secret);
	});

	it('applies the list filters and include_closed', async () => {
		expect(shortCodes((await map(`bbox=${BBOX}&types=lost&species=dog`)).body)).toEqual(
			codesOf(['lostDog', 'matched', 'oldEvent'])
		);
		expect(sorted(shortCodes((await map(`bbox=${BBOX}&include_closed=true`)).body))).toEqual(
			sorted(codesOf([...DEFAULT, ...CLOSED]))
		);
		expect(shortCodes((await map(`bbox=${BBOX}&limit=2`)).body)).toEqual(codesOf(['lostDog', 'foundCat']));
	});

	it('answers VALIDATION without a bbox or above the limit', async () => {
		for (const query of ['', 'types=lost', `bbox=${BBOX}&limit=1001`, 'bbox=14.9,45.7,14.8,45.6']) {
			const res = await map(query);
			expect(res.status, query).toBe(400);
			expect(res.body.error.code, query).toBe('VALIDATION');
		}
	});
});

describe('GET /v1/reports and /map, permission matrix', () => {
	const callers: Record<string, () => Promise<string | undefined>> = {
		'anonymous visitor': async () => undefined,
		'anonymous user': () => signTestToken({ sub: ids.anon, is_anonymous: true }),
		'other user': () => signTestToken({ sub: ids.other }),
		owner: () => signTestToken({ sub: ids.owner }),
		'moderator aal1': () => signTestToken({ sub: ids.mod }),
		'moderator aal2': () => signTestToken({ sub: ids.mod, aal: 'aal2' }),
		'admin aal2': () => signTestToken({ sub: ids.admin, aal: 'aal2' }),
	};
	const mine: Record<string, Key[]> = {
		'anonymous user': ['foundCat'],
		owner: ['lostDog', 'matched', 'oldEvent', ...CLOSED],
	};

	for (const [name, token] of Object.entries(callers)) {
		it(`${name}: the same public results, is_mine only on own reports, never held, hidden or removed`, async () => {
			const auth = await token();
			const res = await list(`bbox=${BBOX}&include_closed=true`, auth);
			expect(res.status).toBe(200);
			expect(sorted(shortCodes(res.body))).toEqual(sorted(codesOf([...DEFAULT, ...CLOSED])));
			const own = res.body.items.filter((item: { is_mine: boolean }) => item.is_mine);
			expect(sorted(shortCodes({ items: own }))).toEqual(sorted(codesOf(mine[name] ?? [])));
			for (const item of res.body.items) {
				expect(item).not.toHaveProperty('location');
				expect(item).not.toHaveProperty('chip_number');
			}
			const mapped = await map(`bbox=${BBOX}`, auth);
			expect(mapped.status).toBe(200);
			expect(shortCodes(mapped.body)).toEqual(codesOf(DEFAULT));
		});
	}
});

describe('500 reports in a viewport', () => {
	const PERF = { w: 13.95, s: 45.9, e: 14.05, n: 46.0 };
	const PERF_BBOX = `${PERF.w},${PERF.s},${PERF.e},${PERF.n}`;

	beforeAll(async () => {
		// 500 in the viewport and 2000 elsewhere in Slovenia (east of it), so the viewport is selective.
		await prisma.$executeRaw`
			insert into app.reports (id, short_code, type, species, event_at, exact_point, public_point, public_radius_m,
				in_slovenia, created_by)
			select gen_random_uuid(), 'p' || lpad(g::text, 7, '0'),
				(array['lost', 'found', 'sighted'])[1 + g % 3]::app."REPORT_TYPE",
				(array['dog', 'cat'])[1 + g % 2]::app."SPECIES", now() - make_interval(hours => g), p.pt, p.pt, 500, true,
				${ids.perf}::uuid
			from generate_series(1, 2500) g,
				lateral (select extensions.st_setsrid(case when g <= 500
					then extensions.st_makepoint(13.95 + random() * 0.1 + 0 * g, 45.9 + random() * 0.1)
					else extensions.st_makepoint(15.0 + random() * 1.5 + 0 * g, 45.45 + random() * 1.4) end,
					4326)::extensions.geography as pt) p`;
		await prisma.$executeRaw`analyze app.reports`;
	});

	afterAll(async () => {
		await prisma.reports.deleteMany({ where: { created_by: ids.perf } });
	});

	const fastest = async (path: string) => {
		let best = Infinity;
		for (let run = 0; run < 3; run++) {
			const started = performance.now();
			const res = await request(app).get(path);
			best = Math.min(best, performance.now() - started);
			expect(res.status).toBe(200);
		}
		return best;
	};

	it('answers the list and the map in under 300 ms', async () => {
		const page = await list(`bbox=${PERF_BBOX}&limit=50`);
		expect(page.body.items).toHaveLength(50);
		expect(page.body.total_estimate).toBe(500);
		expect((await map(`bbox=${PERF_BBOX}`)).body.items).toHaveLength(500);
		expect(await fastest(`/v1/reports?bbox=${PERF_BBOX}&limit=50`)).toBeLessThan(300);
		expect(await fastest(`/v1/reports?near=45.95,14,5&sort=distance&limit=50`)).toBeLessThan(300);
		expect(await fastest(`/v1/reports/map?bbox=${PERF_BBOX}`)).toBeLessThan(300);
	});

	it('uses the GiST index on public_point for the viewport and near filters', async () => {
		for (const filters of [
			{ bbox: [PERF.w, PERF.s, PERF.e, PERF.n] as [number, number, number, number] },
			{ near: { lat: 45.95, lng: 14, km: 5 } },
		]) {
			const plan = await prisma.$queryRaw<{ 'QUERY PLAN': string }[]>`
				explain select r.id from app.reports r where ${searchWhere(filters, new Date(Date.now() - 30 * DAY))}`;
			expect(plan.map((row) => row['QUERY PLAN']).join('\n')).toContain('reports_public_point_idx');
		}
	});
});

describe('search rate limits', () => {
	const names = ['reports.search', 'reports.map'];
	afterAll(async () => {
		await prisma.app_config.deleteMany({ where: { key: { in: names.map((name) => `rate.${name}`) } } });
		configStore.invalidate();
	});

	it.each([
		['list', 'reports.search', `/v1/reports?bbox=${BBOX}`],
		['map', 'reports.map', `/v1/reports/map?bbox=${BBOX}`],
	])('answers 429 RATE_LIMITED with Retry-After over the %s limit per IP', async (_n, name, url) => {
		// Same code path as the 120/min default, stubbed low (rate.<name> in app_config).
		await prisma.app_config.create({ data: { key: `rate.${name}`, value: { limit: 2, window: 60 } } });
		configStore.invalidate();
		const client = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
		const get = () => request(app).get(url).set('x-forwarded-for', client);
		expect((await get()).status).toBe(200);
		expect((await get()).status).toBe(200);
		const res = await get();
		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe('RATE_LIMITED');
		expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(1);
	});
});

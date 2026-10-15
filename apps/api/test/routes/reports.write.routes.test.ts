// POST /v1/reports, PATCH /v1/reports/:code, GET /v1/me/reports and releaseReport (C4, C6, C1): validation, the
// permission matrix, idempotency, coarsened storage and the jobs queued in the write transaction.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CreateReportResponse, ReportOwnerView } from '@zivali/validation';

import { app } from '../../app.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { runJob } from '../../jobs/index.ts';
import { userCtx, type Actor } from '../../lib/ctx.ts';
import { drain } from '../../lib/jobs.ts';
import { loggerOptions, requestLogger } from '../../lib/logger.ts';
import { errorHandler } from '../../middleware/error.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import v1Routes from '../../routes/index.ts';
import { signTestToken } from '../helpers/token.ts';

const ids = {
	owner: randomUUID(),
	other: randomUUID(),
	finder: randomUUID(),
	anon: randomUUID(),
	lister: randomUUID(),
	mod: randomUUID(),
	admin: randomUUID(),
};
const tokens = {} as Record<keyof typeof ids | 'anonOther', string>;
const DAY = 24 * 3600 * 1000;
// Prešernov trg, Ljubljana and Glavni trg, Maribor, with more decimals than a stored point ever has.
const LJ = { lat: 46.0514263, lng: 14.5060547 };
const MB = { lat: 46.5576841, lng: 15.6455183 };

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
	const rad = Math.PI / 180;
	const h =
		Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
	return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
};
const ip = () => `198.51.100.${randomInt(1, 255)}`;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const photo = async (owner_id: string) =>
	(
		await prisma.photos.create({
			data: { owner_id, sha256: randomBytes(32).toString('hex'), width: 800, height: 600, bytes: 50_000 },
		})
	).id;
const body = (overrides: Record<string, unknown> = {}) => ({
	type: 'lost',
	species: 'dog',
	location: LJ,
	event_at: iso(-DAY),
	photo_ids: [] as string[],
	...overrides,
});
const post = (token: string | undefined, payload: object, key: string | null = randomUUID()) => {
	const req = request(app).post('/v1/reports').set('x-forwarded-for', ip());
	if (token) req.set('Authorization', `Bearer ${token}`);
	if (key) req.set('Idempotency-Key', key);
	return req.send(payload);
};
const patch = (code: string, token: string | undefined, payload: object) => {
	const req = request(app).patch(`/v1/reports/${code}`).set('x-forwarded-for', ip());
	if (token) req.set('Authorization', `Bearer ${token}`);
	return req.send(payload);
};
const get = (path: string, token?: string) => {
	const req = request(app).get(path);
	return token ? req.set('Authorization', `Bearer ${token}`) : req;
};
/** A lost report of the owner with one photo, created through the API. */
const lostReport = async (overrides: Record<string, unknown> = {}) => {
	const res = await post(tokens.owner, body({ photo_ids: [await photo(ids.owner)], ...overrides }));
	expect(res.status).toBe(201);
	return res.body as { id: string; short_code: string };
};
const queued = async (report_id: string) =>
	(
		await prisma.$queryRaw<{ name: string; data: unknown }[]>`
			select name, data from pgboss.job where data->>'report_id' = ${report_id} order by name`
	).map(({ name, data }) => {
		// ids-only payloads: no point, no other field
		expect(data).toEqual({ report_id });
		return name;
	});
const clearJobs = (report_id: string) =>
	prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = ${report_id}`;
const ownerView = async (code: string) => (await get(`/v1/reports/${code}`, tokens.owner)).body;
const issue = (res: request.Response) => res.body.error.issues?.[0];

beforeAll(async () => {
	const roles: Record<string, USER_ROLE> = { [ids.mod]: 'MODERATOR', [ids.admin]: 'ADMIN' };
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	for (const key of ['owner', 'other', 'finder', 'lister'] as const)
		tokens[key] = await signTestToken({ sub: ids[key] });
	tokens.anon = await signTestToken({ sub: ids.anon, is_anonymous: true });
	tokens.anonOther = await signTestToken({ is_anonymous: true });
	tokens.mod = await signTestToken({ sub: ids.mod, aal: 'aal2' });
	tokens.admin = await signTestToken({ sub: ids.admin, aal: 'aal2' });
});

afterAll(async () => {
	const users = Object.values(ids);
	const reports = await prisma.reports.findMany({ where: { created_by: { in: users } }, select: { id: true } });
	const reportIds = reports.map((r) => r.id);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reportIds}::text[])`;
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: { in: users } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

describe('POST /v1/reports', () => {
	it('creates a lost report: owner manager, photos in order, coarsened point, jobs with ids only', async () => {
		const [first, second] = [await photo(ids.owner), await photo(ids.owner)];
		const res = await post(
			tokens.owner,
			body({ name: 'Piki', photo_ids: [second, first], chip: '705 098-100.000077', requested_radius_m: 1500 })
		);
		expect(res.status).toBe(201);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(CreateReportResponse.strict().safeParse(res.body).success).toBe(true);
		expect(res.body).toMatchObject({ moderation_state: 'visible', warnings: [] });
		expect(res.body).not.toHaveProperty('manage_token');
		const { id, short_code } = res.body;

		expect(await prisma.report_managers.findMany({ where: { report_id: id } })).toEqual([
			expect.objectContaining({ user_id: ids.owner, role: 'owner' }),
		]);
		const photos = await prisma.photos.findMany({ where: { report_id: id }, orderBy: { position: 'asc' } });
		expect(photos.map((p) => [p.id, p.position])).toEqual([
			[second, 0],
			[first, 1],
		]);
		expect(await queued(id)).toEqual(['alerts.fanout', 'match.report', 'photo.publish']);

		const view = await ownerView(short_code);
		expect(view).toMatchObject({
			chip_number: '705098100000077',
			chip_status: 'valid',
			requested_radius_m: 1500,
			area: { radius_m: 1500 },
			manager_role: 'owner',
		});
		const offset = metres(LJ, view.location);
		expect(offset).toBeGreaterThanOrEqual(19.9);
		expect(offset).toBeLessThanOrEqual(30.1);
		expect((await ownerView(short_code)).location).toEqual(view.location);

		// No column (geography as text included) holds the received coordinates or lies within 19 m of them.
		const [row] = await prisma.$queryRaw<{ dump: string; near: number }[]>`
			with p as (
				select extensions.st_setsrid(extensions.st_makepoint(${LJ.lng}, ${LJ.lat}), 4326)::extensions.geography as g
			)
			select (row_to_json(r)::jsonb || jsonb_build_object('exact', extensions.st_astext(r.exact_point),
				'public', extensions.st_astext(r.public_point)))::text as dump,
				least(extensions.st_distance(r.exact_point, p.g), extensions.st_distance(r.public_point, p.g)) as near
			from app.reports r, p
			where r.id = ${id}::uuid`;
		expect(row!.dump).not.toContain(String(LJ.lat));
		expect(row!.dump).not.toContain(String(LJ.lng));
		expect(row!.near).toBeGreaterThan(19);
	});

	it('lets an anonymous finder report a found pet (no nearby alerts) and a signed-in user a sighting', async () => {
		const found = await post(tokens.anon, body({ type: 'found', photo_ids: [await photo(ids.anon)] }));
		expect(found.status).toBe(201);
		const row = await prisma.reports.findUniqueOrThrow({ where: { id: found.body.id } });
		expect(row).toMatchObject({ source: 'anonymous', created_by: ids.anon, moderation_state: 'visible' });
		expect(await queued(found.body.id)).toEqual(['match.report', 'photo.publish']);
		const finderView = (await get(`/v1/reports/${found.body.short_code}`, tokens.anon)).body;
		expect(finderView).toMatchObject({ manager_role: 'finder', area: { radius_m: 150 } });

		const lost = await lostReport();
		const sighting = await post(tokens.finder, body({ type: 'sighted', linked_report_id: lost.id }));
		expect(sighting.status).toBe(201);
		expect(await queued(sighting.body.id)).toEqual(['match.report', 'photo.publish']);
		expect((await get(`/v1/reports/${sighting.body.short_code}`)).body.linked_report_code).toBe(lost.short_code);
	});

	it('refuses lost reports from anonymous users (FORBIDDEN) and signed-out callers (UNAUTHENTICATED)', async () => {
		const anon = await post(tokens.anon, body({ photo_ids: [await photo(ids.anon)] }));
		expect(anon.status).toBe(403);
		expect(anon.body.error.code).toBe('FORBIDDEN');
		const signedOut = await post(undefined, body({ type: 'found', photo_ids: [randomUUID()] }));
		expect(signedOut.status).toBe(401);
		expect(await prisma.reports.count({ where: { created_by: ids.anon, type: 'lost' } })).toBe(0);
	});

	it('requires an Idempotency-Key; a replay returns the stored response, another user gets CONFLICT', async () => {
		const missing = await post(tokens.other, body({ photo_ids: [randomUUID()] }), null);
		expect(missing.status).toBe(400);
		expect(issue(missing).path).toBe('headers.idempotency-key');

		const key = randomUUID();
		const payload = body({ photo_ids: [await photo(ids.other)] });
		const first = await post(tokens.other, payload, key);
		expect(first.status).toBe(201);
		const replay = await post(tokens.other, payload, key);
		expect(replay.status).toBe(201);
		expect(replay.headers['idempotent-replayed']).toBe('true');
		expect(replay.body).toEqual(first.body);
		expect(await prisma.reports.count({ where: { created_by: ids.other } })).toBe(1);
		const foreign = await post(tokens.finder, payload, key);
		expect(foreign.status).toBe(409);
		expect(foreign.body.error.code).toBe('CONFLICT');
	});

	it('rejects a future event_at and accepts an event older than 30 days with the OLD_EVENT warning', async () => {
		const future = await post(tokens.owner, body({ event_at: iso(3600_000), photo_ids: [await photo(ids.owner)] }));
		expect(future.status).toBe(400);
		expect(issue(future).path).toBe('event_at');
		const old = await post(tokens.owner, body({ event_at: iso(-31 * DAY), photo_ids: [await photo(ids.owner)] }));
		expect(old.status).toBe(201);
		expect(old.body.warnings).toEqual(['OLD_EVENT']);
	});

	it('takes rewards on lost reports only and refuses contact data in the reward note', async () => {
		const found = await post(
			tokens.finder,
			body({ type: 'found', reward_eur: 50, photo_ids: [await photo(ids.finder)] })
		);
		expect(found.status).toBe(400);
		expect(issue(found).path).toBe('reward_eur');
		const contact = await post(
			tokens.owner,
			body({ reward_note: 'Pokličite 041 123 456', photo_ids: [randomUUID()] })
		);
		expect(contact.status).toBe(400);
		expect(issue(contact)).toEqual({ path: 'reward_note', message: 'CONTACT_DATA' });
		const ok = await post(
			tokens.owner,
			body({ reward_eur: 200, reward_note: 'Za najditelja', photo_ids: [await photo(ids.owner)] })
		);
		expect(ok.status).toBe(201);
		expect((await get(`/v1/reports/${ok.body.short_code}`)).body.reward).toEqual({
			eur: 200,
			note: 'Za najditelja',
		});
	});

	it('refuses missing or foreign photos, lost-only fields on found reports and links to non-lost reports', async () => {
		const before = await prisma.reports.count({ where: { created_by: ids.owner } });
		const noPhoto = await post(tokens.owner, body());
		expect(issue(noPhoto).path).toBe('photo_ids');
		const [own, foreignPhoto] = [await photo(ids.owner), await photo(ids.other)];
		const foreign = await post(tokens.owner, body({ photo_ids: [own, foreignPhoto] }));
		expect(foreign.status).toBe(400);
		expect(issue(foreign)).toEqual({ path: 'photo_ids', message: 'Unknown or foreign photo' });
		// The write rolled back: no report, both photos still unattached.
		expect(await prisma.reports.count({ where: { created_by: ids.owner } })).toBe(before);
		const photos = await prisma.photos.findMany({ where: { id: { in: [own, foreignPhoto] } } });
		expect(photos.map((p) => p.report_id)).toEqual([null, null]);

		const radius = await post(
			tokens.finder,
			body({ type: 'found', requested_radius_m: 2000, photo_ids: [await photo(ids.finder)] })
		);
		expect(issue(radius)).toEqual({ path: 'requested_radius_m', message: 'Lost reports only' });
		const named = await post(
			tokens.finder,
			body({ type: 'found', name: 'Piki', photo_ids: [await photo(ids.finder)] })
		);
		expect(issue(named)).toEqual({ path: 'name', message: 'Lost reports only' });
		const found = await post(tokens.finder, body({ type: 'found', photo_ids: [await photo(ids.finder)] }));
		const link = await post(tokens.finder, body({ type: 'sighted', linked_report_id: found.body.id }));
		expect(issue(link).path).toBe('linked_report_id');
		const breed = await post(
			tokens.owner,
			body({ breed_codes: ['cat.european_shorthair'], photo_ids: [randomUUID()] })
		);
		expect(issue(breed).path).toBe('breed_codes.0');
	});

	it('fills a lost report from the own pet and refuses a second open lost report (DUPLICATE_OPEN_REPORT)', async () => {
		const pet = await prisma.pets.create({
			data: {
				owner_id: ids.owner,
				species: 'dog',
				name: 'Luna',
				chip_number: '705098100000099',
				chip_status: 'valid',
			},
		});
		const first = await post(tokens.owner, body({ pet_id: pet.id, photo_ids: [await photo(ids.owner)] }));
		expect(first.status).toBe(201);
		expect(await ownerView(first.body.short_code)).toMatchObject({
			name: 'Luna',
			pet_id: pet.id,
			chip_number: '705098100000099',
		});

		const second = await post(tokens.owner, body({ pet_id: pet.id, photo_ids: [await photo(ids.owner)] }));
		expect(second.status).toBe(409);
		expect(second.body.error).toMatchObject({
			code: 'DUPLICATE_OPEN_REPORT',
			details: { report_id: first.body.id, short_code: first.body.short_code },
		});
		const notMine = await post(tokens.other, body({ pet_id: pet.id, photo_ids: [await photo(ids.other)] }));
		expect(issue(notMine).path).toBe('pet_id');
		const cat = await post(tokens.owner, body({ species: 'cat', pet_id: pet.id, photo_ids: [randomUUID()] }));
		expect(issue(cat).path).toBe('species');
	});

	it('is readable by everyone through GET /v1/reports/:code after the jobs are drained', async () => {
		const { short_code } = await lostReport();
		await drain(runJob);
		const res = await get(`/v1/reports/${short_code}`);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ short_code, is_mine: false });
		expect(res.body).not.toHaveProperty('location');
	});
});

describe('PATCH /v1/reports/:code', () => {
	it('edits fields and keeps the stored point; match.report only when a matching input changed', async () => {
		const { id, short_code } = await lostReport();
		const before = await ownerView(short_code);
		await clearJobs(id);

		const text = await patch(short_code, tokens.owner, {
			circumstances: 'Ušel pri Tromostovju.',
			location: before.location,
		});
		expect(text.status).toBe(200);
		expect(text.headers['cache-control']).toBe('private, no-store');
		expect(ReportOwnerView.safeParse(text.body).success).toBe(true);
		expect(text.body).toMatchObject({
			circumstances: 'Ušel pri Tromostovju.',
			location: before.location,
			area: before.area,
		});
		expect(Date.parse(text.body.last_owner_update_at)).toBeGreaterThanOrEqual(
			Date.parse(before.last_owner_update_at)
		);
		expect(await queued(id)).toEqual([]);

		const colours = await patch(short_code, tokens.owner, {
			colours: ['black', 'white'],
			chip: '705-098-100-000-011',
		});
		expect(colours.body).toMatchObject({
			colours: ['black', 'white'],
			chip_number: '705098100000011',
			location: before.location,
		});
		expect(await queued(id)).toEqual(['match.report']);
	});

	it('coarsens a moved point anew and queues matching and nearby alerts; a radius change keeps the centre', async () => {
		const { id, short_code } = await lostReport();
		await clearJobs(id);
		const moved = await patch(short_code, tokens.owner, { location: MB });
		expect(moved.status).toBe(200);
		const offset = metres(MB, moved.body.location);
		expect(offset).toBeGreaterThanOrEqual(19.9);
		expect(offset).toBeLessThanOrEqual(30.1);
		expect(moved.body.municipality_slug).toBe('maribor');
		expect(await queued(id)).toEqual(['alerts.fanout', 'match.report']);

		await clearJobs(id);
		const radius = await patch(short_code, tokens.owner, { requested_radius_m: 4000 });
		expect(radius.body.location).toEqual(moved.body.location);
		expect(radius.body.area).toEqual({ lat: moved.body.area.lat, lng: moved.body.area.lng, radius_m: 4000 });
		expect(await queued(id)).toEqual([]);
	});

	it('replaces the photos in order and queues photo.publish', async () => {
		const first = await photo(ids.owner);
		const { id, short_code } = await lostReport({ photo_ids: [first] });
		await clearJobs(id);
		const next = await photo(ids.owner);
		expect((await patch(short_code, tokens.owner, { photo_ids: [next] })).status).toBe(200);
		expect((await prisma.photos.findUniqueOrThrow({ where: { id: next } })).report_id).toBe(id);
		expect((await prisma.photos.findUniqueOrThrow({ where: { id: first } })).report_id).toBeNull();
		expect(await queued(id)).toEqual(['photo.publish']);
		expect(issue(await patch(short_code, tokens.owner, { photo_ids: [] })).path).toBe('photo_ids');
	});

	it('validates rewards, event_at and breeds against the stored report', async () => {
		const found = await post(tokens.finder, body({ type: 'found', photo_ids: [await photo(ids.finder)] }));
		const reward = await patch(found.body.short_code, tokens.finder, { reward_eur: 20 });
		expect(issue(reward)).toEqual({ path: 'reward_eur', message: 'Lost reports only' });
		const { short_code } = await lostReport({ breed_codes: ['dog.beagle'] });
		expect(issue(await patch(short_code, tokens.owner, { reward_note: 'info@primer.si' }))).toEqual({
			path: 'reward_note',
			message: 'CONTACT_DATA',
		});
		expect(issue(await patch(short_code, tokens.owner, { event_at: iso(3600_000) })).path).toBe('event_at');
		expect(issue(await patch(short_code, tokens.owner, { species: 'cat' })).path).toBe('breed_codes.0');
		expect((await patch(short_code, tokens.owner, { reward_eur: 50, reward_note: null })).body).toMatchObject({
			reward_eur: 50,
			reward_note: null,
		});
	});

	it('queues no nearby alerts for a held report whose point moved', async () => {
		const { id, short_code } = await lostReport();
		await prisma.reports.update({ where: { id }, data: { moderation_state: 'held' } });
		await clearJobs(id);
		expect((await patch(short_code, tokens.owner, { location: MB })).status).toBe(200);
		expect(await queued(id)).toEqual(['match.report']);
	});

	describe('permission matrix', () => {
		let code: string;
		beforeAll(async () => {
			code = (await lostReport()).short_code;
		});

		for (const [name, token] of [
			['other user', () => tokens.other],
			['anonymous user', () => tokens.anonOther],
			['moderator aal2', () => tokens.mod],
			['admin aal2', () => tokens.admin],
		] as const) {
			it(`${name}: FORBIDDEN`, async () => {
				const res = await patch(code, token(), { circumstances: 'x' });
				expect(res.status).toBe(403);
				expect(res.body.error.code).toBe('FORBIDDEN');
			});
		}

		it('signed out: UNAUTHENTICATED; unknown code: NOT_FOUND', async () => {
			expect((await patch(code, undefined, { circumstances: 'x' })).status).toBe(401);
			expect((await patch('Zz9Zz9Zz', tokens.owner, { circumstances: 'x' })).status).toBe(404);
		});

		it('owner and anonymous finder edit their own reports; removed and closed ones are GONE', async () => {
			expect((await patch(code, tokens.owner, { circumstances: 'Še vedno iščemo.' })).status).toBe(200);
			const found = await post(tokens.anon, body({ type: 'found', photo_ids: [await photo(ids.anon)] }));
			expect((await patch(found.body.short_code, tokens.anon, { collar: 'modra ovratnica' })).body).toMatchObject(
				{
					manager_role: 'finder',
					collar: 'modra ovratnica',
				}
			);
			for (const [data, reason] of [
				[{ moderation_state: 'removed' }, 'removed'],
				[{ status: 'closed', close_reason: 'gave_up', closed_at: new Date() }, 'closed'],
			] as const) {
				const { id, short_code } = await lostReport();
				await prisma.reports.update({ where: { id }, data });
				const res = await patch(short_code, tokens.owner, { circumstances: 'x' });
				expect(res.status).toBe(410);
				expect(res.body.error).toMatchObject({ code: 'GONE', details: { reason } });
			}
		});
	});
});

describe('releaseReport (held → visible)', () => {
	it('queues photo publishing, matching and nearby alerts once; only moderators or the system may release', async () => {
		const { id } = await lostReport();
		await prisma.reports.update({ where: { id }, data: { moderation_state: 'held' } });
		await clearJobs(id);
		const actor = (user_id: string, role: Actor['role']): Actor => ({
			user_id,
			role,
			is_anonymous: false,
			aal: 'aal2',
			email_verified: true,
			locale: 'sl',
		});
		await expect(ReportsDomain.releaseReport({ id }, userCtx(actor(ids.owner, 'USER')))).rejects.toMatchObject({
			code: 'FORBIDDEN',
		});
		await ReportsDomain.releaseReport({ id }, userCtx(actor(ids.mod, 'MODERATOR')));
		expect((await prisma.reports.findUniqueOrThrow({ where: { id } })).moderation_state).toBe('visible');
		expect(await queued(id)).toEqual(['alerts.fanout', 'match.report', 'photo.publish']);
		await expect(ReportsDomain.releaseReport({ id }, userCtx(actor(ids.mod, 'MODERATOR')))).rejects.toMatchObject({
			code: 'CONFLICT',
		});
	});
});

describe('GET /v1/me/reports', () => {
	it('lists the reports the caller manages, newest first, held included, with keyset pages', async () => {
		const codes: string[] = [];
		for (let i = 0; i < 3; i++) {
			const res = await post(tokens.lister, body({ photo_ids: [await photo(ids.lister)] }));
			codes.unshift(res.body.short_code);
		}
		await prisma.reports.update({ where: { short_code: codes[0]! }, data: { moderation_state: 'held' } });

		const first = await get('/v1/me/reports?limit=2', tokens.lister);
		expect(first.status).toBe(200);
		expect(first.headers['cache-control']).toBe('private, no-store');
		expect(first.body.items.map((r: { short_code: string }) => r.short_code)).toEqual(codes.slice(0, 2));
		for (const item of first.body.items) expect(ReportOwnerView.safeParse(item).success).toBe(true);
		expect(first.body.items[0]).toMatchObject({ moderation_state: 'held', manager_role: 'owner', is_mine: true });
		const second = await get(`/v1/me/reports?limit=2&cursor=${first.body.next_cursor}`, tokens.lister);
		expect(second.body).toEqual({ items: [expect.objectContaining({ short_code: codes[2] })], next_cursor: null });

		const other = await get('/v1/me/reports', tokens.other);
		expect(other.body.items.some((r: { short_code: string }) => codes.includes(r.short_code))).toBe(false);
		expect((await get('/v1/me/reports')).status).toBe(401);
		expect((await get('/v1/me/reports?cursor=nope', tokens.lister)).status).toBe(400);
	});
});

describe('logs', () => {
	it('never log the points of create and update bodies, only route patterns', async () => {
		const lines: string[] = [];
		const capture = pino({ ...loggerOptions, level: 'debug' }, { write: (line: string) => void lines.push(line) });
		const logged = express();
		logged.set('trust proxy', 1);
		logged.use(requestLogger(capture), express.json());
		logged.use('/v1', v1Routes);
		logged.use(errorHandler);
		const created = await request(logged)
			.post('/v1/reports')
			.set({ Authorization: `Bearer ${tokens.owner}`, 'Idempotency-Key': randomUUID(), 'x-forwarded-for': ip() })
			.send(body({ photo_ids: [await photo(ids.owner)] }));
		expect(created.status).toBe(201);
		const updated = await request(logged)
			.patch(`/v1/reports/${created.body.short_code}`)
			.set({ Authorization: `Bearer ${tokens.owner}`, 'x-forwarded-for': ip() })
			.send({ location: MB });
		expect(updated.status).toBe(200);
		await new Promise((resolve) => setImmediate(resolve));

		const output = lines.join('');
		for (const leak of ['46.05', '14.50', '46.55', '15.64', '"lat"', '"lng"', 'location'])
			expect(output).not.toContain(leak);
		expect(
			lines
				.map((line) => JSON.parse(line))
				.filter((entry) => entry.route)
				.map((entry) => entry.route)
		).toEqual(['POST /v1/reports', 'PATCH /v1/reports/:code']);
	});
});

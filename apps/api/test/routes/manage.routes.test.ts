// Anonymous reporter safeguards (C7): the submission guard (limits per IP and device, holds), the manage token on
// POST /v1/reports, POST /v1/manage/claim, POST /v1/reports/:code/manage-link/resend, the device-hash retention and
// converting an anonymous user to an account (Supabase Auth Admin API on the local stack).
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';

import { decodeJwt, SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { app } from '../../app.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import { config } from '../../lib/config.ts';
import { hashKey } from '../../lib/crypto.ts';
import { systemCtx, userCtx } from '../../lib/ctx.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const LJ = { lat: 46.0514263, lng: 14.5060547 };
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

const users: string[] = [];
const emails: string[] = [];
type Who = { id: string; token: string };

async function person({
	anonymous = false,
	role = 'USER' as USER_ROLE,
	aal = 'aal1' as 'aal1' | 'aal2',
} = {}): Promise<Who> {
	const id = randomUUID();
	users.push(id);
	await prisma.profiles.create({ data: { id, role, is_anonymous: anonymous } });
	return { id, token: await signTestToken({ sub: id, is_anonymous: anonymous, aal }) };
}
const anon = () => person({ anonymous: true });

// A fresh client IP per call unless one is given (each IP has its own limits).
const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const email = () => {
	const address = `${randomUUID()}@test.invalid`;
	emails.push(address);
	return address;
};
const photo = async (owner_id: string, sha256 = randomBytes(32).toString('hex'), report_id?: string) =>
	(await prisma.photos.create({ data: { owner_id, sha256, width: 800, height: 600, bytes: 50_000, report_id } })).id;
const sighted = (overrides: Record<string, unknown> = {}) => ({
	type: 'sighted',
	species: 'cat',
	location: LJ,
	event_at: new Date(Date.now() - HOUR).toISOString(),
	photo_ids: [] as string[],
	...overrides,
});
type PostOptions = { device?: string; ip?: string; key?: string };
const post = (who: Who, payload: object, opts: PostOptions = {}) => {
	const req = request(app)
		.post('/v1/reports')
		.set('Authorization', `Bearer ${who.token}`)
		.set('x-forwarded-for', opts.ip ?? ip())
		.set('Idempotency-Key', opts.key ?? randomUUID());
	if (opts.device) req.set('x-device-id', opts.device);
	return req.send(payload);
};
const claim = (who: Who | null, token: unknown, from = ip()) => {
	const req = request(app).post('/v1/manage/claim').set('x-forwarded-for', from);
	if (who) req.set('Authorization', `Bearer ${who.token}`);
	return req.send({ token });
};
const resend = (who: Who | null, code: string) => {
	const req = request(app).post(`/v1/reports/${code}/manage-link/resend`).set('x-forwarded-for', ip());
	return who ? req.set('Authorization', `Bearer ${who.token}`) : req;
};
/** An anonymous found report through the API (finder email optional); returns the 201 body. */
async function anonReport(who: Who, finder_email?: string) {
	const res = await post(who, sighted({ ...(finder_email && { finder_email }) }));
	expect(res.status).toBe(201);
	return res.body as { id: string; short_code: string; moderation_state: string; manage_token: string };
}
const mailsTo = (to: string) => (adapters.email.sent ?? []).filter((m) => m.to === to);
const tokenIn = (html: string) => /\/m#([A-Za-z0-9_-]{43})/.exec(html)?.[1];
const sha256 = (token: string) => createHash('sha256').update(token).digest();

afterAll(async () => {
	const reports = await prisma.reports.findMany({ where: { created_by: { in: users } }, select: { id: true } });
	const reportIds = reports.map((r) => r.id);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reportIds}::text[])`;
	await prisma.moderation_flags.deleteMany({ where: { target_id: { in: reportIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: { in: users } } });
	await prisma.email_outbox.deleteMany({
		where: { to_address_hash: { in: emails.map((e) => hashKey(`email:${e}`)) } },
	});
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

describe('submission guard (C7)', () => {
	it('refuses the sixth anonymous report within an hour from one device (RATE_LIMITED, Retry-After)', async () => {
		const finder = await anon();
		const device = randomUUID();
		for (let i = 0; i < 5; i++) expect((await post(finder, sighted(), { device })).status).toBe(201);
		const sixth = await post(finder, sighted(), { device });
		expect(sixth.status).toBe(429);
		expect(sixth.body.error.code).toBe('RATE_LIMITED');
		const retryAfter = Number(sixth.headers['retry-after']);
		expect(retryAfter).toBeGreaterThan(0);
		expect(retryAfter).toBeLessThanOrEqual(3600);
		expect(sixth.body.error.details.retry_after_s).toBe(retryAfter);
		expect(await prisma.reports.count({ where: { created_by: finder.id } })).toBe(5);
		// Another device from another IP still reports.
		expect((await post(finder, sighted(), { device: randomUUID() })).status).toBe(201);
	});

	it('limits per IP without x-device-id, across anonymous sign-ins; signed-in users are not limited by it', async () => {
		const from = ip();
		for (let i = 0; i < 5; i++) expect((await post(await anon(), sighted(), { ip: from })).status).toBe(201);
		expect((await post(await anon(), sighted(), { ip: from })).body.error.code).toBe('RATE_LIMITED');

		const member = await person();
		const device = randomUUID();
		for (let i = 0; i < 6; i++) expect((await post(member, sighted(), { ip: from, device })).status).toBe(201);
	});

	it('reads the limits from app_config (defaults 5 per hour, 20 per day)', async () => {
		const rows = await prisma.app_config.findMany({
			where: { key: { in: ['rate.anon_report_per_hour', 'rate.anon_report_per_day'] } },
			orderBy: { key: 'asc' },
		});
		expect(rows.map((r) => [r.key, r.value])).toEqual([
			['rate.anon_report_per_day', 20],
			['rate.anon_report_per_hour', 5],
		]);
		await prisma.app_config.update({ where: { key: 'rate.anon_report_per_hour' }, data: { value: 2 } });
		configStore.invalidate();
		try {
			const finder = await anon();
			const device = randomUUID();
			for (let i = 0; i < 2; i++) expect((await post(finder, sighted(), { device })).status).toBe(201);
			expect((await post(finder, sighted(), { device })).status).toBe(429);
		} finally {
			await prisma.app_config.update({ where: { key: 'rate.anon_report_per_hour' }, data: { value: 5 } });
			configStore.invalidate();
		}
	});

	it('holds the report when the device sent more than 10 reports in 7 days; the manage link is still issued', async () => {
		const finder = await anon();
		const device = randomUUID();
		const device_hash = hashKey(`device:${device}`);
		const ctx = userCtx({
			user_id: finder.id,
			role: 'USER',
			is_anonymous: true,
			aal: 'aal1',
			email_verified: false,
			locale: 'sl',
		});
		const seed = () =>
			ReportsDomain.insertReport(
				{
					type: 'sighted',
					species: 'cat',
					location: LJ,
					event_at: new Date(),
					source: 'anonymous',
					device_hash,
				},
				ctx
			);
		for (let i = 0; i < 9; i++) await seed();
		// Older than 7 days: does not count.
		const old = await seed();
		await prisma.reports.update({ where: { id: old.id }, data: { created_at: new Date(Date.now() - 8 * DAY) } });

		const tenth = await post(finder, sighted(), { device });
		expect(tenth.body.moderation_state).toBe('visible');
		const eleventh = await post(finder, sighted(), { device });
		expect(eleventh.status).toBe(201);
		expect(eleventh.body).toMatchObject({ moderation_state: 'held', manage_token: expect.stringMatching(TOKEN) });
		expect(
			await prisma.moderation_flags.findMany({
				where: { target_id: eleventh.body.id },
				select: { kind: true, details: true },
			})
		).toEqual([{ kind: 'anon_hold', details: { reasons: ['device_volume'] } }]);
		// Held reads as unknown to the public; the finder still manages it.
		expect((await request(app).get(`/v1/reports/${eleventh.body.short_code}`)).status).toBe(404);
		const own = await request(app)
			.get(`/v1/reports/${eleventh.body.short_code}`)
			.set('Authorization', `Bearer ${finder.token}`);
		expect(own.body).toMatchObject({ manager_role: 'finder', moderation_state: 'held' });
		// The raw device id is never stored.
		const row = await prisma.reports.findUniqueOrThrow({ where: { id: eleventh.body.id } });
		expect(row.device_hash).toBe(device_hash);
		expect(JSON.stringify(row)).not.toContain(device);
	});

	it('holds the report when a photo matches a photo of a held or removed report, not of a visible one', async () => {
		const other = await person();
		for (const state of ['held', 'removed', 'visible'] as const) {
			const sha = randomBytes(32).toString('hex');
			const earlier = await ReportsDomain.insertReport(
				{ type: 'found', species: 'dog', location: LJ, event_at: new Date(), moderation_state: state },
				userCtx({
					user_id: other.id,
					role: 'USER',
					is_anonymous: false,
					aal: 'aal1',
					email_verified: true,
					locale: 'sl',
				})
			);
			await photo(other.id, sha, earlier.id);
			const finder = await anon();
			const res = await post(
				finder,
				sighted({ type: 'found', species: 'dog', photo_ids: [await photo(finder.id, sha)] })
			);
			expect(res.status).toBe(201);
			expect(res.body.moderation_state).toBe(state === 'visible' ? 'visible' : 'held');
			if (state !== 'visible')
				expect(
					(await prisma.moderation_flags.findFirstOrThrow({ where: { target_id: res.body.id } })).details
				).toEqual({ reasons: ['photo_match'] });
		}
	});

	it('retention clears device hashes older than 7 days', async () => {
		const finder = await anon();
		const res = await post(finder, sighted(), { device: randomUUID() });
		await prisma.reports.update({
			where: { id: res.body.id },
			data: { created_at: new Date(Date.now() - 8 * DAY) },
		});
		const recent = await post(finder, sighted(), { device: randomUUID() });
		expect(await ReportsDomain.purgeDeviceHashes(undefined, systemCtx())).toBeGreaterThanOrEqual(1);
		const rows = await prisma.reports.findMany({
			where: { id: { in: [res.body.id, recent.body.id] } },
			select: { id: true, device_hash: true },
		});
		expect(rows.find((r) => r.id === res.body.id)?.device_hash).toBeNull();
		expect(rows.find((r) => r.id === recent.body.id)?.device_hash).toEqual(expect.any(String));
	});
});

describe('manage token on POST /v1/reports (C7)', () => {
	it('returns a 256-bit token, stores only its SHA-256 and the finder email, mails the link; a replay returns the same token', async () => {
		const finder = await anon();
		const to = email();
		const key = randomUUID();
		const payload = sighted({ finder_email: to });
		const first = await post(finder, payload, { key, device: randomUUID() });
		expect(first.status).toBe(201);
		const token = first.body.manage_token as string;
		expect(token).toMatch(TOKEN);
		expect(Buffer.from(token, 'base64url')).toHaveLength(32);

		const row = await prisma.reports.findUniqueOrThrow({ where: { id: first.body.id } });
		expect(Buffer.from(row.manage_token_hash!)).toEqual(sha256(token));
		expect(row.source).toBe('anonymous');
		expect(JSON.stringify(row)).not.toContain(token);
		expect(await prisma.report_contacts.findUnique({ where: { report_id: row.id } })).toMatchObject({ email: to });
		const mails = mailsTo(to);
		expect(mails).toHaveLength(1);
		expect(tokenIn(mails[0]!.html)).toBe(token);

		const replay = await post(finder, payload, { key });
		expect(replay.status).toBe(201);
		expect(replay.headers['idempotent-replayed']).toBe('true');
		expect(replay.body).toEqual(first.body);
		expect(await prisma.reports.count({ where: { created_by: finder.id } })).toBe(1);
		expect(mailsTo(to)).toHaveLength(1);
		// The stored response is encrypted: the token is not readable in the idempotency store.
		const stored = await prisma.idempotency_keys.findUniqueOrThrow({ where: { key } });
		expect(JSON.stringify(stored)).not.toContain(token);
	});

	it('gives signed-in users no token and refuses finder_email from them', async () => {
		const member = await person();
		const plain = await post(member, sighted());
		expect(plain.status).toBe(201);
		expect(plain.body).not.toHaveProperty('manage_token');
		const withEmail = await post(member, sighted({ finder_email: email() }));
		expect(withEmail.status).toBe(400);
		expect(withEmail.body.error.issues[0].path).toBe('finder_email');
	});
});

describe('POST /v1/manage/claim (C7)', () => {
	it('makes another anonymous user and a signed-in user finder managers; claiming again changes nothing', async () => {
		const finder = await anon();
		const created = await anonReport(finder);
		const device2 = await anon();
		const member = await person();
		for (const who of [device2, member, device2]) {
			const res = await claim(who, created.manage_token);
			expect(res.status).toBe(200);
			expect(res.headers['cache-control']).toBe('private, no-store');
			expect(res.body).toEqual({ report_id: created.id, short_code: created.short_code });
		}
		const managers = await prisma.report_managers.findMany({ where: { report_id: created.id } });
		expect(managers.map((m) => [m.user_id, m.role]).sort()).toEqual(
			[
				[finder.id, 'finder'],
				[device2.id, 'finder'],
				[member.id, 'finder'],
			].sort()
		);
		const view = await request(app)
			.get(`/v1/reports/${created.short_code}`)
			.set('Authorization', `Bearer ${device2.token}`);
		expect(view.body.manager_role).toBe('finder');
		const edit = await request(app)
			.patch(`/v1/reports/${created.short_code}`)
			.set('Authorization', `Bearer ${device2.token}`)
			.send({ collar: 'rdeča ovratnica' });
		expect(edit.status).toBe(200);
	});

	it('unknown token: NOT_FOUND; malformed: VALIDATION; signed out: UNAUTHENTICATED', async () => {
		const who = await anon();
		expect((await claim(who, randomBytes(32).toString('base64url'))).body.error.code).toBe('NOT_FOUND');
		expect((await claim(who, 'short')).body.error.code).toBe('VALIDATION');
		expect((await claim(who, undefined)).body.error.code).toBe('VALIDATION');
		expect((await claim(null, randomBytes(32).toString('base64url'))).status).toBe(401);
	});

	it('answers GONE for removed reports and reports closed more than 7 days ago; within the window it works', async () => {
		const created = await anonReport(await anon());
		const who = await anon();
		const set = (data: Prisma.reportsUpdateInput) => prisma.reports.update({ where: { id: created.id }, data });

		await set({ status: 'closed', closed_at: new Date(Date.now() - 8 * DAY) });
		const late = await claim(who, created.manage_token);
		expect(late.status).toBe(410);
		expect(late.body.error.details).toEqual({ reason: 'closed' });
		await set({ status: 'reunited', closed_at: null, reunited_at: new Date(Date.now() - 8 * DAY) });
		expect((await claim(who, created.manage_token)).status).toBe(410);

		await set({ status: 'closed', reunited_at: null, closed_at: new Date(Date.now() - DAY) });
		expect((await claim(who, created.manage_token)).status).toBe(200);

		await set({ status: 'open', closed_at: null, moderation_state: 'removed' });
		const removed = await claim(await anon(), created.manage_token);
		expect(removed.status).toBe(410);
		expect(removed.body.error.details).toEqual({ reason: 'removed' });
	});

	it('is limited to 10 per hour per IP', async () => {
		const who = await anon();
		const from = ip();
		for (let i = 0; i < 10; i++)
			expect((await claim(who, randomBytes(32).toString('base64url'), from)).status).toBe(404);
		const res = await claim(await anon(), randomBytes(32).toString('base64url'), from);
		expect(res.status).toBe(429);
		expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
	});
});

describe('POST /v1/reports/:code/manage-link/resend (C7)', () => {
	it('sends a new link to the finder email on file (any manager); the old link stops working', async () => {
		const to = email();
		const created = await anonReport(await anon(), to);
		const device2 = await anon();
		expect((await claim(device2, created.manage_token)).status).toBe(200);

		const res = await resend(device2, created.short_code);
		expect(res.status).toBe(204);
		const mails = mailsTo(to);
		expect(mails).toHaveLength(2);
		const fresh = tokenIn(mails[1]!.html)!;
		expect(fresh).toMatch(TOKEN);
		expect(fresh).not.toBe(created.manage_token);
		const row = await prisma.reports.findUniqueOrThrow({ where: { id: created.id } });
		expect(Buffer.from(row.manage_token_hash!)).toEqual(sha256(fresh));

		const third = await anon();
		expect((await claim(third, created.manage_token)).status).toBe(404);
		expect((await claim(third, fresh)).status).toBe(200);
	});

	it('managers only: everyone else FORBIDDEN, signed out UNAUTHENTICATED, unknown code NOT_FOUND', async () => {
		const created = await anonReport(await anon(), email());
		const others: [string, () => Promise<Who>][] = [
			['other anonymous user', anon],
			['other user', () => person()],
			['moderator aal1', () => person({ role: 'MODERATOR' })],
			['moderator aal2', () => person({ role: 'MODERATOR', aal: 'aal2' })],
			['admin aal2', () => person({ role: 'ADMIN', aal: 'aal2' })],
		];
		for (const [name, make] of others) {
			const res = await resend(await make(), created.short_code);
			expect([name, res.status, res.body.error?.code]).toEqual([name, 403, 'FORBIDDEN']);
		}
		expect((await resend(null, created.short_code)).status).toBe(401);
		expect((await resend(await anon(), 'zzzzzzzz')).status).toBe(404);
	});

	it('no email on file: CONFLICT; at most 3 per report per day (RATE_LIMITED)', async () => {
		const finder = await anon();
		const without = await anonReport(finder);
		const conflict = await resend(finder, without.short_code);
		expect(conflict.status).toBe(409);
		expect(conflict.body.error.code).toBe('CONFLICT');

		const withEmail = await anonReport(finder, email());
		for (let i = 0; i < 3; i++) expect((await resend(finder, withEmail.short_code)).status).toBe(204);
		const limited = await resend(finder, withEmail.short_code);
		expect(limited.status).toBe(429);
		expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
	});
});

describe('converting an anonymous user to an account (C7, Supabase Auth on the local stack)', () => {
	const auth = `${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
	// The local stack signs with the shared JWT secret, so these are its anon and service_role keys.
	const key = (role: 'anon' | 'service_role') =>
		new SignJWT({ role })
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuedAt()
			.setExpirationTime('5m')
			.sign(new TextEncoder().encode(config.SUPABASE_JWT_SECRET));
	const call = async (path: string, init: { method: string; body?: object; role: 'anon' | 'service_role' }) => {
		const apikey = await key(init.role);
		const res = await fetch(`${auth}${path}`, {
			method: init.method,
			headers: { apikey, Authorization: `Bearer ${apikey}`, 'Content-Type': 'application/json' },
			body: init.body && JSON.stringify(init.body),
		});
		if (!res.ok) throw new Error(`Auth ${init.method} ${path}: ${res.status} ${await res.text()}`);
		return res.status === 204 ? null : res.json();
	};

	it('keeps the same user id and every report the anonymous user managed', async () => {
		const signedIn = await call('/signup', { method: 'POST', body: {}, role: 'anon' });
		const id: string = signedIn.user.id;
		expect(signedIn.user.is_anonymous).toBe(true);
		users.push(id);
		try {
			const anonymous: Who = { id, token: signedIn.access_token };
			// The first API request creates the profile; then the anonymous finder reports with a photo.
			expect((await request(app).get('/v1/me').set('Authorization', `Bearer ${anonymous.token}`)).status).toBe(
				200
			);
			const res = await post(anonymous, sighted({ type: 'found', photo_ids: [await photo(id)] }));
			expect(res.status).toBe(201);
			const { short_code } = res.body;

			const address = `${randomUUID()}@test.invalid`;
			const password = randomBytes(18).toString('base64url');
			const updated = await call(`/admin/users/${id}`, {
				method: 'PUT',
				body: { email: address, password, email_confirm: true },
				role: 'service_role',
			});
			expect(updated).toMatchObject({ id, is_anonymous: false, email: address });

			const session = await call('/token?grant_type=password', {
				method: 'POST',
				body: { email: address, password },
				role: 'anon',
			});
			expect(decodeJwt(session.access_token)).toMatchObject({ sub: id, is_anonymous: false });
			const bearer = `Bearer ${session.access_token}`;

			const me = await request(app).get('/v1/me').set('Authorization', bearer);
			expect(me.body).toMatchObject({ id, is_anonymous: false });
			const view = await request(app).get(`/v1/reports/${short_code}`).set('Authorization', bearer);
			expect(view.body).toMatchObject({ short_code, manager_role: 'finder' });
			const mine = await request(app).get('/v1/me/reports').set('Authorization', bearer);
			expect(mine.body.items.map((r: { short_code: string }) => r.short_code)).toContain(short_code);
		} finally {
			await call(`/admin/users/${id}`, { method: 'DELETE', role: 'service_role' });
		}
	});
});

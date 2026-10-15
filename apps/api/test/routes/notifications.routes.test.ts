// /v1/notifications, /v1/notification-prefs, /v1/push-tokens (C10, TASK-22.3) over real auth.users rows: the inbox
// with cursor and unread count, mark read, prefs with defaults, push tokens (token in the body for DELETE), the signed
// one-click unsubscribe, and the permission matrix (every signed-in actor sees and changes only their own rows).
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import type { USER_ROLE } from '../../generated/enums.ts';
import { app } from '../../app.ts';
import { NotificationsDomain } from '../../domains/notifications/index.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const ids: string[] = [];
afterAll(() => deleteAuthUsers(ids));

async function actor(
	options: { role?: USER_ROLE; locale?: 'sl' | 'en'; is_anonymous?: boolean } = {},
	claims: TestTokenClaims = {}
) {
	const { role = 'USER', locale = 'sl', is_anonymous = false } = options;
	const id = await createAuthUser({ is_anonymous });
	ids.push(id);
	await prisma.profiles.create({ data: { id, role, locale, is_anonymous } });
	const token = await signTestToken({ sub: id, is_anonymous, ...claims });
	return { id, auth: `Bearer ${token}` };
}

async function notify(user_id: string, count: number) {
	const rows = [];
	for (let i = 0; i < count; i++) {
		rows.push(
			await prisma.notifications.create({
				data: {
					user_id,
					type: 'report_reunited',
					payload: { report_code: 'Pq7abcde', species: 'dog' },
					created_at: new Date(Date.now() - (count - i) * 1000),
				},
			})
		);
	}
	return rows;
}

const signedIn = [
	{ who: 'user', options: {}, claims: {} },
	{ who: 'anonymous finder', options: { is_anonymous: true }, claims: {} },
	{ who: 'moderator aal1', options: { role: 'MODERATOR' as const }, claims: {} },
	{ who: 'moderator aal2', options: { role: 'MODERATOR' as const }, claims: { aal: 'aal2' as const } },
	{ who: 'admin aal2', options: { role: 'ADMIN' as const }, claims: { aal: 'aal2' as const } },
];

describe('permissions', () => {
	const calls = [
		{ method: 'get', path: '/v1/notifications' },
		{ method: 'post', path: '/v1/notifications/read', body: { all: true } },
		{ method: 'get', path: '/v1/notification-prefs' },
		{ method: 'put', path: '/v1/notification-prefs/match_chip', body: { push: false } },
		{ method: 'post', path: '/v1/push-tokens', body: { token: 'ExponentPushToken[x]', platform: 'ios' } },
		{ method: 'delete', path: '/v1/push-tokens', body: { token: 'ExponentPushToken[x]' } },
	] as const;

	it.each(calls)('signed-out visitor: $method $path → 401', async ({ method, path, ...rest }) => {
		const res = await request(app)
			[method](path)
			.send('body' in rest ? rest.body : undefined);
		expect(res.status).toBe(401);
		expect(res.body.error.code).toBe('UNAUTHENTICATED');
	});

	it.each(signedIn)('$who reads only their own inbox and prefs', async ({ options, claims }) => {
		const me = await actor(options, claims);
		const other = await actor();
		await notify(me.id, 1);
		const [theirs] = await notify(other.id, 1);
		const list = await request(app).get('/v1/notifications').set('Authorization', me.auth);
		expect(list.status).toBe(200);
		expect(list.body.items).toHaveLength(1);
		expect(list.body.unread).toBe(1);
		// Someone else's id is ignored.
		const read = await request(app)
			.post('/v1/notifications/read')
			.set('Authorization', me.auth)
			.send({ ids: [theirs!.id] });
		expect(read.status).toBe(204);
		expect((await prisma.notifications.findUnique({ where: { id: theirs!.id } }))!.read_at).toBeNull();
		const prefs = await request(app).get('/v1/notification-prefs').set('Authorization', me.auth);
		expect(prefs.status).toBe(200);
	});
});

describe('GET /v1/notifications', () => {
	it('pages newest first with next_cursor and counts every unread row', async () => {
		const me = await actor();
		const rows = await notify(me.id, 3);
		const first = await request(app).get('/v1/notifications?limit=2').set('Authorization', me.auth);
		expect(first.status).toBe(200);
		expect(first.body.items.map((n: { id: string }) => n.id)).toEqual([rows[2]!.id, rows[1]!.id]);
		expect(first.body).toMatchObject({ next_cursor: rows[1]!.id, unread: 3 });
		expect(first.body.items[0]).toEqual({
			id: rows[2]!.id,
			type: 'report_reunited',
			payload: { report_code: 'Pq7abcde', species: 'dog' },
			read_at: null,
			created_at: rows[2]!.created_at.toISOString(),
		});
		const second = await request(app)
			.get(`/v1/notifications?limit=2&cursor=${first.body.next_cursor}`)
			.set('Authorization', me.auth);
		expect(second.body.items.map((n: { id: string }) => n.id)).toEqual([rows[0]!.id]);
		expect(second.body.next_cursor).toBeNull();
	});

	it('returns nothing after another user’s cursor and rejects a limit over 50', async () => {
		const me = await actor();
		const other = await actor();
		await notify(me.id, 1);
		const [theirs] = await notify(other.id, 1);
		const res = await request(app).get(`/v1/notifications?cursor=${theirs!.id}`).set('Authorization', me.auth);
		expect(res.body.items).toEqual([]);
		const tooMany = await request(app).get('/v1/notifications?limit=51').set('Authorization', me.auth);
		expect(tooMany.status).toBe(400);
	});
});

describe('POST /v1/notifications/read', () => {
	it('marks the given ids, or all, as read', async () => {
		const me = await actor();
		const [a, b, c] = await notify(me.id, 3);
		await request(app)
			.post('/v1/notifications/read')
			.set('Authorization', me.auth)
			.send({ ids: [a!.id] })
			.expect(204);
		let list = await request(app).get('/v1/notifications').set('Authorization', me.auth);
		expect(list.body.unread).toBe(2);
		await request(app).post('/v1/notifications/read').set('Authorization', me.auth).send({ all: true }).expect(204);
		list = await request(app).get('/v1/notifications').set('Authorization', me.auth);
		expect(list.body.unread).toBe(0);
		expect(list.body.items.every((n: { read_at: string | null }) => n.read_at)).toBe(true);
		expect([b, c]).toHaveLength(2);
	});

	it('validates the body', async () => {
		const me = await actor();
		for (const body of [{}, { ids: [] }, { ids: ['nope'] }, { all: false }]) {
			const res = await request(app).post('/v1/notifications/read').set('Authorization', me.auth).send(body);
			expect(res.status).toBe(400);
		}
	});
});

describe('/v1/notification-prefs', () => {
	it('lists every switchable type with defaults (nearby_lost email opt-in) and the quiet hours', async () => {
		const me = await actor();
		await prisma.profiles.update({ where: { id: me.id }, data: { quiet_from: '22:00', quiet_to: '07:00' } });
		const res = await request(app).get('/v1/notification-prefs').set('Authorization', me.auth);
		expect(res.status).toBe(200);
		expect(res.body.quiet_from).toBe('22:00');
		expect(res.body.quiet_to).toBe('07:00');
		const types = res.body.items.map((p: { type: string }) => p.type);
		expect(types).not.toContain('manage_link');
		expect(types).not.toContain('payment_receipt');
		expect(types).toHaveLength(10);
		expect(res.body.items).toContainEqual({ type: 'nearby_lost', in_app: true, push: true, email: false });
		expect(res.body.items).toContainEqual({ type: 'match_chip', in_app: true, push: true, email: true });
	});

	it('PUT changes only the given channels and returns the pref', async () => {
		const me = await actor();
		const put = (body: object) =>
			request(app).put('/v1/notification-prefs/nearby_lost').set('Authorization', me.auth).send(body);
		expect((await put({ email: true })).body).toEqual({
			type: 'nearby_lost',
			in_app: true,
			push: true,
			email: true,
		});
		expect((await put({ push: false })).body).toEqual({
			type: 'nearby_lost',
			in_app: true,
			push: false,
			email: true,
		});
		const list = await request(app).get('/v1/notification-prefs').set('Authorization', me.auth);
		expect(list.body.items).toContainEqual({ type: 'nearby_lost', in_app: true, push: false, email: true });
	});

	it('rejects transactional and unknown types and invalid values', async () => {
		const me = await actor();
		for (const [type, body] of [
			['manage_link', { email: false }],
			['payment_receipt', { in_app: false }],
			['nope', { email: false }],
			['match_chip', { email: 'no' }],
		] as const) {
			const res = await request(app)
				.put(`/v1/notification-prefs/${type}`)
				.set('Authorization', me.auth)
				.send(body);
			expect(res.status).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
	});
});

describe('/v1/push-tokens', () => {
	const token = () => `ExponentPushToken[${randomUUID()}]`;

	it('registers (anonymous finders too), moves a token to the device’s new user and removes only one’s own', async () => {
		const finder = await actor({ is_anonymous: true });
		const other = await actor();
		const t = token();
		await request(app)
			.post('/v1/push-tokens')
			.set('Authorization', finder.auth)
			.send({ token: t, platform: 'android' })
			.expect(204);
		expect(await prisma.push_tokens.findUnique({ where: { token: t } })).toMatchObject({
			user_id: finder.id,
			platform: 'android',
		});
		// Someone else cannot remove it.
		await request(app).delete('/v1/push-tokens').set('Authorization', other.auth).send({ token: t }).expect(204);
		expect(await prisma.push_tokens.count({ where: { token: t } })).toBe(1);
		// The same device signs in as another user: the token moves.
		await request(app)
			.post('/v1/push-tokens')
			.set('Authorization', other.auth)
			.send({ token: t, platform: 'ios' })
			.expect(204);
		expect(await prisma.push_tokens.findUnique({ where: { token: t } })).toMatchObject({
			user_id: other.id,
			platform: 'ios',
		});
		await request(app).delete('/v1/push-tokens').set('Authorization', other.auth).send({ token: t }).expect(204);
		expect(await prisma.push_tokens.count({ where: { token: t } })).toBe(0);
	});

	it('validates the body', async () => {
		const me = await actor();
		const bad = await request(app)
			.post('/v1/push-tokens')
			.set('Authorization', me.auth)
			.send({ token: token(), platform: 'web' });
		expect(bad.status).toBe(400);
		const noToken = await request(app).delete('/v1/push-tokens').set('Authorization', me.auth).send({});
		expect(noToken.status).toBe(400);
	});
});

describe('GET /v1/notifications/unsubscribe', () => {
	it('turns the type’s email off without sign-in and answers an HTML page in the profile language', async () => {
		const me = await actor({ locale: 'en' });
		const token = NotificationsDomain.unsubscribeToken(me.id, 'nearby_lost');
		const res = await request(app).get('/v1/notifications/unsubscribe').query({ token });
		expect(res.status).toBe(200);
		expect(res.type).toBe('text/html');
		expect(res.text).toContain('Emails turned off');
		expect(res.headers['cache-control']).toBe('no-store');
		expect(
			await prisma.notification_prefs.findUnique({
				where: { user_id_type: { user_id: me.id, type: 'nearby_lost' } },
			})
		).toMatchObject({ in_app: true, push: true, email: false });
	});

	it('rejects a tampered or foreign token and answers 404 for a deleted account', async () => {
		const me = await actor();
		const valid = NotificationsDomain.unsubscribeToken(me.id, 'nearby_lost');
		const other = await actor();
		const forged = valid.replace(me.id, other.id);
		for (const token of [forged, valid.replace('nearby_lost', 'match_chip'), `${valid}x`, 'x', `${valid}.extra`]) {
			const res = await request(app).get('/v1/notifications/unsubscribe').query({ token });
			expect(res.status).toBe(400);
		}
		expect(await prisma.notification_prefs.count({ where: { user_id: { in: [me.id, other.id] } } })).toBe(0);
		const gone = NotificationsDomain.unsubscribeToken(randomUUID(), 'nearby_lost');
		expect((await request(app).get('/v1/notifications/unsubscribe').query({ token: gone })).status).toBe(404);
	});
});

// /v1/admin (C3, ADR-018, TASK-34.2) over real auth.users rows: role + aal2 on every staff route, masked users list,
// audited role changes that apply at once, the audit log with filters and cursor, read-only pg-boss queue state.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const ids: string[] = [];
async function actor(role: USER_ROLE | null, claims: TestTokenClaims = {}, display_name?: string) {
	const id = await createAuthUser({ is_anonymous: claims.is_anonymous });
	ids.push(id);
	if (role) await prisma.profiles.create({ data: { id, role, display_name } });
	return { id, auth: `Bearer ${await signTestToken({ sub: id, ...claims })}` };
}

afterAll(async () => {
	await prisma.audit_log.deleteMany({ where: { OR: [{ actor_id: { in: ids } }, { target_id: { in: ids } }] } });
	await deleteAuthUsers(ids);
});

const admin = await actor('ADMIN', { aal: 'aal2' });
const target = await actor('USER', { aal: 'aal2' });

type Call = { method: 'get' | 'put'; path: string; body?: object; moderator: boolean };
const routes: Call[] = [
	{ method: 'get', path: '/v1/admin/users', moderator: true },
	{
		method: 'put',
		path: `/v1/admin/users/${target.id}/role`,
		body: { role: 'USER', note: 'check' },
		moderator: false,
	},
	{ method: 'get', path: '/v1/admin/audit-log', moderator: false },
	{ method: 'get', path: '/v1/admin/queues', moderator: false },
];
const send = (call: Call, auth?: string) => {
	const req = request(app)[call.method](call.path);
	if (auth) req.set('Authorization', auth);
	return call.body ? req.send(call.body) : req;
};

describe('staff guards on every /v1/admin route', () => {
	const cases = [
		{ who: 'signed-out visitor', role: null, claims: undefined, code: 'UNAUTHENTICATED' },
		{ who: 'anonymous finder', role: null, claims: { is_anonymous: true, aal: 'aal2' }, code: 'UNAUTHENTICATED' },
		{ who: 'user (aal2)', role: 'USER', claims: { aal: 'aal2' }, code: 'FORBIDDEN' },
		{ who: 'shelter member (aal2)', role: 'SHELTER_MEMBER', claims: { aal: 'aal2' }, code: 'FORBIDDEN' },
		{ who: 'moderator without TOTP', role: 'MODERATOR', claims: { aal: 'aal1' }, code: 'AAL2_REQUIRED' },
		{ who: 'admin without TOTP', role: 'ADMIN', claims: { aal: 'aal1' }, code: 'AAL2_REQUIRED' },
	] as const;

	it.each(cases)('$who gets $code', async ({ role, claims, code }) => {
		const caller = claims ? await actor(role, claims) : undefined;
		for (const call of routes) {
			const res = await send(call, caller?.auth);
			expect([call.path, res.body.error?.code]).toEqual([call.path, code]);
		}
	});

	it('a moderator with TOTP lists users; the admin-only routes answer FORBIDDEN', async () => {
		const moderator = await actor('MODERATOR', { aal: 'aal2' });
		for (const call of routes) {
			const res = await send(call, moderator.auth);
			expect([call.path, res.status]).toEqual([call.path, call.moderator ? 200 : 403]);
		}
	});

	it('an admin with TOTP passes every route', async () => {
		for (const call of routes) {
			const res = await send(call, admin.auth);
			expect([call.path, res.status]).toEqual([call.path, 200]);
		}
	});

	it('guards run before validation: a bad query from a user is FORBIDDEN, not VALIDATION', async () => {
		const res = await request(app).get('/v1/admin/audit-log?cursor=nope').set('Authorization', target.auth);
		expect(res.body.error.code).toBe('FORBIDDEN');
	});
});

describe('GET /v1/admin/users', () => {
	it('finds users by name, masks emails, has no phone, pages with the cursor and is audited', async () => {
		const tag = `zz-${randomUUID().slice(0, 8)}`;
		const first = await actor('USER', {}, `${tag} one`);
		const second = await actor('USER', {}, `${tag} two`);
		await prisma.profiles.update({ where: { id: first.id }, data: { phone: '+386 40 123 456' } });

		const page1 = await request(app)
			.get('/v1/admin/users')
			.query({ query: tag, limit: 1 })
			.set('Authorization', admin.auth);
		expect(page1.status).toBe(200);
		expect(page1.body.items).toEqual([
			{
				id: second.id,
				display_name: `${tag} two`,
				email_masked: `${second.id[0]}***@test.invalid`,
				role: 'USER',
				is_anonymous: false,
				created_at: expect.any(String),
			},
		]);
		expect(page1.body.next_cursor).toBe(second.id);

		const page2 = await request(app)
			.get('/v1/admin/users')
			.query({ query: tag, limit: 1, cursor: page1.body.next_cursor })
			.set('Authorization', admin.auth);
		expect(page2.body.items.map((u: { id: string }) => u.id)).toEqual([first.id]);
		expect(page2.body.next_cursor).toBeNull();
		expect(JSON.stringify(page2.body)).not.toContain('386');

		const byEmail = await request(app)
			.get('/v1/admin/users')
			.query({ query: `${first.id}@test.invalid` })
			.set('Authorization', admin.auth);
		expect(byEmail.body.items.map((u: { id: string }) => u.id)).toEqual([first.id]);

		// A partial email matches nothing, so a masked email cannot be rebuilt by probing substrings.
		const partial = await request(app)
			.get('/v1/admin/users')
			.query({ query: `${first.id}@test` })
			.set('Authorization', admin.auth);
		expect(partial.body.items).toEqual([]);

		const audit = await prisma.audit_log.findMany({ where: { actor_id: admin.id, action: 'admin.users.list' } });
		expect(audit.length).toBeGreaterThanOrEqual(3);
		expect(JSON.stringify(audit)).not.toContain(tag);
	});

	it('treats LIKE wildcards in the query literally', async () => {
		const res = await request(app)
			.get('/v1/admin/users')
			.query({ query: '%_%', limit: 5 })
			.set('Authorization', admin.auth);
		expect(res.status).toBe(200);
		for (const user of res.body.items) expect(user.display_name).toContain('%_%');
	});
});

describe('PUT /v1/admin/users/:id/role', () => {
	it('requires a non-empty note', async () => {
		for (const body of [{ role: 'MODERATOR' }, { role: 'MODERATOR', note: '   ' }, { role: 'GOD', note: 'x' }]) {
			const res = await request(app)
				.put(`/v1/admin/users/${target.id}/role`)
				.set('Authorization', admin.auth)
				.send(body);
			expect(res.body.error.code).toBe('VALIDATION');
		}
	});

	it('answers NOT_FOUND for an unknown user', async () => {
		const res = await request(app)
			.put(`/v1/admin/users/${randomUUID()}/role`)
			.set('Authorization', admin.auth)
			.send({ role: 'MODERATOR', note: 'x' });
		expect(res.body.error.code).toBe('NOT_FOUND');
	});

	it('changes the role at once (no stale role cache) and writes the audit entry with the note', async () => {
		const promoted = await actor('USER', { aal: 'aal2' });
		// Caches the USER role for the next 60 s.
		expect((await request(app).get('/v1/admin/users').set('Authorization', promoted.auth)).status).toBe(403);

		const res = await request(app)
			.put(`/v1/admin/users/${promoted.id}/role`)
			.set('Authorization', admin.auth)
			.send({ role: 'MODERATOR', note: '  Shelter coordinator  ' });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ id: promoted.id, role: 'MODERATOR' });

		expect((await request(app).get('/v1/admin/users').set('Authorization', promoted.auth)).status).toBe(200);
		const [entry] = await prisma.audit_log.findMany({ where: { target_id: promoted.id, action: 'user.role.set' } });
		expect(entry).toMatchObject({
			actor_id: admin.id,
			target_type: 'profile',
			diff: { from: 'USER', to: 'MODERATOR', note: 'Shelter coordinator' },
		});
	});
});

describe('GET /v1/admin/audit-log', () => {
	it('filters by target and actor, pages newest first with the cursor', async () => {
		const subject = await actor('USER');
		for (const role of ['MODERATOR', 'SHELTER_MEMBER', 'USER'])
			await request(app)
				.put(`/v1/admin/users/${subject.id}/role`)
				.set('Authorization', admin.auth)
				.send({ role, note: `to ${role}` });

		const query = { target_id: subject.id, actor_id: admin.id, action: 'user.role.set', limit: 2 };
		const page1 = await request(app).get('/v1/admin/audit-log').query(query).set('Authorization', admin.auth);
		expect(page1.status).toBe(200);
		expect(page1.body.items.map((e: { diff: { to: string } }) => e.diff.to)).toEqual(['USER', 'SHELTER_MEMBER']);
		expect(page1.body.items[0]).toMatchObject({
			id: expect.any(String),
			actor_id: admin.id,
			action: 'user.role.set',
			target_type: 'profile',
			target_id: subject.id,
			diff: { from: 'SHELTER_MEMBER', to: 'USER', note: 'to USER' },
			created_at: expect.any(String),
		});

		const page2 = await request(app)
			.get('/v1/admin/audit-log')
			.query({ ...query, cursor: page1.body.next_cursor })
			.set('Authorization', admin.auth);
		expect(page2.body.items.map((e: { diff: { to: string } }) => e.diff.to)).toEqual(['MODERATOR']);
		expect(page2.body.next_cursor).toBeNull();

		const reads = await prisma.audit_log.count({ where: { actor_id: admin.id, action: 'admin.audit_log.list' } });
		expect(reads).toBeGreaterThanOrEqual(2);
	});

	it('rejects a malformed cursor or filter', async () => {
		for (const query of [{ cursor: 'nope' }, { actor_id: 'x' }, { limit: 51 }]) {
			const res = await request(app).get('/v1/admin/audit-log').query(query).set('Authorization', admin.auth);
			expect(res.body.error.code).toBe('VALIDATION');
		}
	});
});

describe('GET /v1/admin/queues', () => {
	it('shows counts per queue and failed jobs with the error message only (no payload, no stack)', async () => {
		const [{ ready }] = await prisma.$queryRaw<{ ready: boolean }[]>`
			select to_regclass('pgboss.queue') is not null and to_regclass('pgboss.job') is not null as ready`;
		if (!ready) {
			const res = await request(app).get('/v1/admin/queues').set('Authorization', admin.auth);
			expect(res.body).toEqual({ available: false, queues: [], failed_jobs: [] });
			return;
		}
		const [queue] = await prisma.$queryRaw<{ name: string }[]>`select name from pgboss.queue order by name limit 1`;
		if (!queue) return;
		const id = randomUUID();
		await prisma.$executeRaw`
			insert into pgboss.job (id, name, state, data, output, completed_on)
			values (${id}::uuid, ${queue.name}, 'failed', ${JSON.stringify({ email: 'private@test.invalid' })}::jsonb,
				${JSON.stringify({ message: 'boom', stack: 'at secret.ts:1' })}::jsonb, now())`;
		try {
			const res = await request(app).get('/v1/admin/queues').set('Authorization', admin.auth);
			expect(res.status).toBe(200);
			expect(res.body.available).toBe(true);
			const counts = res.body.queues.find((q: { name: string }) => q.name === queue.name);
			expect(counts.failed).toBeGreaterThanOrEqual(1);
			const job = res.body.failed_jobs.find((j: { id: string }) => j.id === id);
			expect(job).toEqual({
				id,
				queue: queue.name,
				error: 'boom',
				retry_count: 0,
				created_at: expect.any(String),
				failed_at: expect.any(String),
			});
			expect(JSON.stringify(res.body)).not.toMatch(/private@|secret\.ts/);
		} finally {
			await prisma.$executeRaw`delete from pgboss.job where name = ${queue.name} and id = ${id}::uuid`;
		}
	});
});

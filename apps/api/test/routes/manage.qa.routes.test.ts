// TASK-17.4 (QA) regression tests for the anonymous safeguards (C7): a held report stays unpublished, closing ends the
// manage link, and rotating x-device-id and anonymous users from one IP does not reset the hourly limit.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { userCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

const HOUR = 3600 * 1000;
const LJ = { lat: 46.0514263, lng: 14.5060547 };

const users: string[] = [];
type Who = { id: string; token: string };

/** A profile with a signed token; `verified` also adds a confirmed auth.users row (chat needs it). */
async function person(anonymous = false, verified = false): Promise<Who> {
	const id = verified ? await createAuthUser() : randomUUID();
	users.push(id);
	await prisma.profiles.create({ data: { id, role: 'USER', is_anonymous: anonymous } });
	return { id, token: await signTestToken({ sub: id, is_anonymous: anonymous, aal: 'aal1' }) };
}
const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const photo = async (owner_id: string, sha256 = randomBytes(32).toString('hex'), report_id?: string) =>
	(await prisma.photos.create({ data: { owner_id, sha256, width: 800, height: 600, bytes: 50_000, report_id } })).id;
const report = (type: 'found' | 'sighted', photo_ids: string[] = []) => ({
	type,
	species: 'dog',
	location: LJ,
	event_at: new Date(Date.now() - HOUR).toISOString(),
	photo_ids,
});
const post = (who: Who, payload: object, opts: { ip?: string; device?: string } = {}) => {
	const req = request(app)
		.post('/v1/reports')
		.set('Authorization', `Bearer ${who.token}`)
		.set('x-forwarded-for', opts.ip ?? ip())
		.set('Idempotency-Key', randomUUID());
	if (opts.device) req.set('x-device-id', opts.device);
	return req.send(payload);
};
const as = (req: request.Test, who: Who) => req.set('Authorization', `Bearer ${who.token}`);

afterAll(async () => {
	const reports = await prisma.reports.findMany({ where: { created_by: { in: users } }, select: { id: true } });
	const reportIds = reports.map((r) => r.id);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reportIds}::text[])`;
	await prisma.moderation_flags.deleteMany({ where: { target_id: { in: reportIds } } });
	await prisma.conversations.deleteMany({ where: { about_report_id: { in: reportIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: { in: users } } });
	await deleteAuthUsers(users);
});

describe('held anonymous reports stay unpublished (C7 holds)', () => {
	it('reads as unknown to everyone but its managers, is off the map and cannot be contacted', async () => {
		const other = await person();
		const sha = randomBytes(32).toString('hex');
		const removed = await ReportsDomain.insertReport(
			{ type: 'found', species: 'dog', location: LJ, event_at: new Date(), moderation_state: 'removed' },
			userCtx({
				user_id: other.id,
				role: 'USER',
				is_anonymous: false,
				aal: 'aal1',
				email_verified: true,
				locale: 'sl',
			})
		);
		await photo(other.id, sha, removed.id);

		const finder = await person(true);
		const created = await post(finder, report('found', [await photo(finder.id, sha)]));
		expect(created.status).toBe(201);
		expect(created.body.moderation_state).toBe('held');
		const code = created.body.short_code as string;

		expect((await request(app).get(`/v1/reports/${code}`)).status).toBe(404);
		const stranger = await person(false, true);
		expect((await as(request(app).get(`/v1/reports/${code}`), stranger)).status).toBe(404);
		const mine = await as(request(app).get(`/v1/reports/${code}`), finder);
		expect(mine.status).toBe(200);
		expect(mine.body.moderation_state).toBe('held');

		const map = await request(app).get('/v1/reports/map').query({ bbox: '14.4,46.0,14.6,46.1' });
		expect(map.status).toBe(200);
		expect(map.body.items.map((item: { short_code: string }) => item.short_code)).not.toContain(code);

		const chat = await as(request(app).post('/v1/conversations'), stranger).send({ about_report_code: code });
		expect(chat.status).toBe(404);
	});
});

describe('the manage link ends with the report (C7, C4)', () => {
	it('closing clears the token, so the link no longer claims; the finder can mark the animal returned', async () => {
		const finder = await person(true);
		const created = await post(finder, report('sighted'));
		const close = await as(request(app).post(`/v1/reports/${created.body.short_code}/transitions`), finder).send({
			action: 'close',
			reason: 'returned_to_owner',
		});
		expect(close.status).toBe(200);
		const claim = await as(request(app).post('/v1/manage/claim'), await person(true))
			.set('x-forwarded-for', ip())
			.send({ token: created.body.manage_token });
		expect(claim.status).toBe(404);

		const second = await post(finder, report('sighted'));
		const returned = await as(request(app).post(`/v1/reports/${second.body.short_code}/transitions`), finder).send({
			action: 'mark_reunited',
		});
		expect(returned.status).toBe(200);
		expect(returned.body.status).toBe('reunited');
	});
});

describe('anonymous limits per IP (C7, CH-126)', () => {
	it('a new x-device-id and a new anonymous user per report from one IP still meet the hourly limit', async () => {
		const from = ip();
		for (let i = 0; i < 5; i++)
			expect((await post(await person(true), report('sighted'), { ip: from, device: randomUUID() })).status).toBe(
				201
			);
		const sixth = await post(await person(true), report('sighted'), { ip: from, device: randomUUID() });
		expect(sixth.status).toBe(429);
		expect(sixth.body.error.code).toBe('RATE_LIMITED');
		expect(Number(sixth.headers['retry-after'])).toBeGreaterThan(0);
	});
});

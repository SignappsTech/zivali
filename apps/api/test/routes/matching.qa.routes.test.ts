// QA TASK-19.3 (story TASK-19, matching engine v1): the whole path over HTTP. POST and PATCH /v1/reports queue
// match.report, the worker (drain) stores the suggestion, GET /v1/reports/:code/matches shows it to the lost side only,
// without the other side's contact data, exact point or chip number; a rejected pair never comes back after edits.
// Reports sit in a random 19th-century slot with random chips, so seed data and other tests never become candidates.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { runJob } from '../../jobs/index.ts';
import { drain, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

type User = { id: string; auth: string };
type Created = { id: string; short_code: string };

const HOUR = 3600_000;
const LJ = { lat: 46.0514263, lng: 14.5060547 };
const north = (km: number) => ({ lat: LJ.lat + km * 0.009, lng: LJ.lng });
let slot = randomInt(0, 900);
const month = () => new Date(Date.UTC(1800, 0, 1) + slot++ * 70 * 24 * HOUR);
const chip = () => `941${String(randomInt(0, 1e12)).padStart(12, '0')}`;
const ip = () => `198.51.100.${randomInt(1, 255)}`;

const userIds: string[] = [];
let owner: User, finder: User, stranger: User;

async function user(): Promise<User> {
	const id = await createAuthUser();
	userIds.push(id);
	await prisma.profiles.create({ data: { id } });
	return { id, auth: `Bearer ${await signTestToken({ sub: id })}` };
}

const send = (req: request.Test, who: User | null) =>
	(who ? req.set('Authorization', who.auth) : req).set('x-forwarded-for', ip());

const photo = async (owner_id: string) =>
	(
		await prisma.photos.create({
			data: { owner_id, sha256: randomBytes(32).toString('hex'), width: 800, height: 600, bytes: 50_000 },
		})
	).id;

async function post(who: User, body: Record<string, unknown>): Promise<Created> {
	const res = await send(request(app).post('/v1/reports'), who)
		.set('Idempotency-Key', randomUUID())
		.send({ species: 'dog', photo_ids: [await photo(who.id)], ...body });
	expect(res.status, JSON.stringify(res.body)).toBe(201);
	expect(res.body.moderation_state).toBe('visible');
	return res.body;
}
const patch = (who: User, code: string, body: object) =>
	send(request(app).patch(`/v1/reports/${code}`), who).send(body);
const list = (who: User | null, code: string, query = '') =>
	send(request(app).get(`/v1/reports/${code}/matches${query}`), who);
const get = (who: User | null, code: string) => send(request(app).get(`/v1/reports/${code}`), who);

const attrs = { sex: 'female', size: 'm', colours: ['black', 'white'], pattern: 'bicolour' };
const notifyJobs = async (match_id: string) =>
	(
		await prisma.$queryRaw<{ data: { user_id: string; type: string; payload: object } }[]>`
			select data from pgboss.job where name = 'notify.send' and data->'payload'->>'match_id' = ${match_id}`
	).map((row) => row.data);

beforeAll(async () => {
	await startJobs();
	[owner, finder, stranger] = await Promise.all([user(), user(), user()]);
}, 60_000);

afterAll(async () => {
	const reports = await prisma.reports.findMany({ where: { created_by: { in: userIds } }, select: { id: true } });
	const ids = reports.map((r) => r.id);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${ids}::text[])`;
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'user_id' = any(${userIds})`;
	await prisma.notifications.deleteMany({ where: { user_id: { in: userIds } } });
	await prisma.matches.deleteMany({ where: { lost_report_id: { in: ids } } });
	await prisma.reports.deleteMany({ where: { id: { in: ids } } });
	await prisma.photos.deleteMany({ where: { owner_id: { in: userIds } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: { in: userIds } } });
	await deleteAuthUsers(userIds);
});

describe('QA TASK-19.3: matching end to end', () => {
	it('AC#1 #2 #6: saving a found report matches the chip automatically, idempotently, and leaks nothing', async () => {
		const at = month();
		const number = chip();
		const started = Date.now();
		const lost = await post(owner, {
			type: 'lost',
			name: 'Piki',
			location: LJ,
			event_at: at.toISOString(),
			chip: number.replace(/(\d{3})/g, '$1 ').trim(),
			...attrs,
		});
		// 120 km away, 60 days later, the other sex: only the (differently formatted) chip can pair them.
		const found = await post(finder, {
			type: 'found',
			location: north(120),
			event_at: new Date(at.getTime() + 60 * 24 * HOUR).toISOString(),
			chip: number.replace(/(\d{5})/g, '$1-').replace(/-$/, ''),
			...attrs,
			sex: 'male',
		});
		await drain(runJob);
		const res = await list(owner, lost.short_code);
		expect(Date.now() - started).toBeLessThan(120_000);
		expect(res.status).toBe(200);
		expect(res.body.items).toHaveLength(1);
		const [item] = res.body.items;
		expect(item).toMatchObject({ score: 1, strength: 'strong', chip_match: true, state: 'suggested' });
		expect(item.reasons).toContainEqual({ code: 'chip' });
		expect(item.other.short_code).toBe(found.short_code);

		// Only what anyone sees on the found report's public page: same public circle, no contact, chip or ids.
		const pub = await get(null, found.short_code);
		expect(pub.status).toBe(200);
		expect(item.other.area).toEqual(pub.body.area);
		const raw = JSON.stringify(res.body);
		for (const secret of [number, 'chip_number', 'email', 'phone', 'manage', finder.id, found.id, 'exact'])
			expect(raw).not.toContain(secret);
		for (const reason of item.reasons) expect(Object.keys(reason)).not.toContain('distance_km');

		// Re-running the engine (a repeat job, a second save) keeps one pair and one notification per manager.
		await patch(finder, found.short_code, { size: 'l' }).expect(200);
		await drain(runJob);
		const again = await list(owner, lost.short_code);
		expect(again.body.items.map((m: { id: string }) => m.id)).toEqual([item.id]);
		expect(await prisma.matches.count({ where: { lost_report_id: lost.id } })).toBe(1);
		const jobs = await notifyJobs(item.id);
		expect(jobs.map((job) => [job.user_id, job.type])).toEqual([[owner.id, 'match_chip']]);
		expect(jobs[0]!.payload).toEqual({ template: 'match_chip', match_id: item.id, report_id: lost.id });

		// The finder side learns nothing before the owner confirms: no list, nothing on its own report.
		expect((await list(finder, lost.short_code)).status).toBe(403);
		expect((await list(stranger, lost.short_code)).status).toBe(403);
		expect((await list(finder, found.short_code)).body).toEqual({ items: [] });
		const finderView = JSON.stringify((await get(finder, found.short_code)).body);
		for (const secret of [lost.short_code, lost.id, owner.id, 'Piki']) expect(finderView).not.toContain(secret);
		expect(await prisma.notifications.count({ where: { user_id: finder.id } })).toBe(0);
	});

	it('AC#3 #4: a near look-alike is suggested with band reasons; once rejected it never returns after edits', async () => {
		const at = month();
		const lost = await post(owner, { type: 'lost', location: LJ, event_at: at.toISOString(), ...attrs });
		const found = await post(finder, {
			type: 'found',
			location: north(1),
			event_at: new Date(at.getTime() + 6 * HOUR).toISOString(),
			...attrs,
		});
		// Same pet seen 31 days later: outside the default 30-day window.
		await post(finder, {
			type: 'sighted',
			location: north(1),
			event_at: new Date(at.getTime() + 31 * 24 * HOUR).toISOString(),
			...attrs,
		});
		// Same place and time, but a cat.
		await post(finder, {
			type: 'found',
			species: 'cat',
			location: LJ,
			event_at: new Date(at.getTime() + HOUR).toISOString(),
			...attrs,
		});
		await drain(runJob);

		const res = await list(owner, lost.short_code);
		expect(res.body.items.map((m: { other: Created }) => m.other.short_code)).toEqual([found.short_code]);
		const [item] = res.body.items;
		expect(item.chip_match).toBe(false);
		expect(item.score).toBeGreaterThanOrEqual(0.5);
		// Human-readable reason codes with bands only (the found side's point is its public circle centre).
		const distance = item.reasons.find((r: { code: string }) => r.code === 'distance');
		expect(Object.keys(distance).sort()).toEqual(['band', 'code']);
		expect(['lt1', '1to3']).toContain(distance.band);
		expect(item.reasons).toEqual(
			expect.arrayContaining([
				{ code: 'time', hours_band: 'lt24' },
				{ code: 'size', match: 'equal' },
				{ code: 'colour', overlap: 1 },
				{ code: 'sex', match: 'equal' },
			])
		);

		const rejected = await send(request(app).post(`/v1/matches/${item.id}/reject`), owner).send({
			reason: 'Druga ovratnica',
		});
		expect(rejected.status).toBe(204);

		// Matching inputs change on both sides: the engine runs again, the pair stays rejected and hidden.
		await patch(finder, found.short_code, { colours: ['black', 'white', 'brown'] }).expect(200);
		await patch(owner, lost.short_code, { event_at: new Date(at.getTime() - HOUR).toISOString() }).expect(200);
		await drain(runJob);
		expect((await list(owner, lost.short_code)).body.items).toEqual([]);
		expect((await list(owner, lost.short_code, '?state=rejected')).body.items).toEqual([]);
		const rows = await prisma.matches.findMany({ where: { lost_report_id: lost.id } });
		expect(rows.map((row) => [row.other_report_id, row.state])).toEqual([[found.id, 'rejected']]);
		const feedback = await prisma.match_feedback.findMany({ where: { match_id: item.id } });
		expect(feedback).toEqual([
			expect.objectContaining({ user_id: owner.id, verdict: 'reject', reason: 'Druga ovratnica' }),
		]);
	});
});

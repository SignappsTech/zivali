// Match review (C8 §REST) over real auth.users rows: GET /v1/reports/:code/matches, POST /v1/matches/:id/confirm and
// /reject. The permission matrix, state transitions (CONFLICT, GONE), idempotent repeats, the match conversation (C9),
// the match_confirmed notification and the rejected pair staying gone for the engine. Reports sit in a random
// 19th-century slot, so the engine run below never pairs them with seed data or other tests.
import { randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MatchList } from '@zivali/validation';

import { app } from '../../app.ts';
import { MatchingDomain } from '../../domains/matching/index.ts';
import { matchConfirmedVars } from '../../domains/matching/matching.notify.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

type User = { id: string; auth: string; actor: Actor };
type Kind = { anonymous?: boolean; verified?: boolean; role?: 'MODERATOR' | 'ADMIN'; aal?: 'aal1' | 'aal2' };
type Report = { id: string; short_code: string };

const userIds: string[] = [];
const reportIds: string[] = [];
const LJ = { lat: 46.0514, lng: 14.5061 };
const EVENT_AT = new Date(Date.UTC(1800, 0, 1) + randomInt(0, 900) * 70 * 86_400_000);
const CHIP = `941${String(randomInt(0, 1e12)).padStart(12, '0')}`;

async function user(kind: Kind = {}): Promise<User> {
	const { anonymous = false, verified = true, role = 'USER', aal = 'aal1' } = kind;
	const id = await createAuthUser({ email_verified: verified, is_anonymous: anonymous });
	userIds.push(id);
	await prisma.profiles.create({ data: { id, is_anonymous: anonymous, role } });
	const token = await signTestToken({ sub: id, is_anonymous: anonymous, aal });
	const actor: Actor = { user_id: id, role, is_anonymous: anonymous, aal, email_verified: verified, locale: 'sl' };
	return { id, auth: `Bearer ${token}`, actor };
}

async function report(manager: User, type: 'lost' | 'found' | 'sighted'): Promise<Report> {
	const created = await ReportsDomain.insertReport(
		{
			type,
			species: 'dog',
			location: LJ,
			event_at: type === 'lost' ? EVENT_AT : new Date(EVENT_AT.getTime() + 3_600_000),
			chip: type === 'lost' ? CHIP : undefined,
		},
		userCtx(manager.actor)
	);
	reportIds.push(created.id);
	return created;
}

async function match(lost: Report, other: Report, score = 0.7, state: 'suggested' | 'closed' = 'suggested') {
	const row = await prisma.matches.create({
		data: {
			lost_report_id: lost.id,
			other_report_id: other.id,
			score,
			strength: score >= 0.8 ? 'strong' : 'good',
			chip_match: false,
			reasons: [
				{ code: 'distance', band: 'lt1' },
				{ code: 'time', hours_band: 'lt24' },
			],
			state,
		},
	});
	return row.id;
}

const list = (who: User | null, code: string, query = '') => {
	const req = request(app).get(`/v1/reports/${code}/matches${query}`);
	return who ? req.set('Authorization', who.auth) : req;
};
const confirm = (who: User | null, id: string) => {
	const req = request(app).post(`/v1/matches/${id}/confirm`);
	return who ? req.set('Authorization', who.auth) : req;
};
const reject = (who: User | null, id: string, body: object = {}) => {
	const req = request(app).post(`/v1/matches/${id}/reject`).send(body);
	return who ? req.set('Authorization', who.auth) : req;
};
const code = (res: request.Response) => [res.status, res.body.error?.code];

const confirmedJobs = (match_id: string) =>
	prisma.$queryRaw<{ data: { user_id: string; type: string; payload: object; dedupe_key: string } }[]>`
		select data from pgboss.job
		where name = 'notify.send' and data->>'type' = 'match_confirmed' and data->'payload'->>'match_id' = ${match_id}`;

let owner: User, coOwner: User, finder: User, stranger: User, anon: User, unverified: User;
let modAal1: User, modAal2: User, admin: User;
let lost: Report, found: Report, sighted: Report, hiddenFound: Report;

beforeAll(async () => {
	await startJobs();
	// Anonymous callers count per IP (127.0.0.1 here): start every run with a fresh window.
	await prisma.rate_limits.deleteMany({ where: { name: 'matches.verdict' } });
	[owner, coOwner, finder, stranger, anon, unverified, modAal1, modAal2, admin] = await Promise.all([
		user(),
		user(),
		user(),
		user(),
		user({ anonymous: true }),
		user({ verified: false }),
		user({ role: 'MODERATOR' }),
		user({ role: 'MODERATOR', aal: 'aal2' }),
		user({ role: 'ADMIN', aal: 'aal2' }),
	]);
	lost = await report(owner, 'lost');
	await prisma.report_managers.create({ data: { report_id: lost.id, user_id: coOwner.id, role: 'owner' } });
	found = await report(finder, 'found');
	sighted = await report(finder, 'sighted');
	hiddenFound = await report(finder, 'found');
	await prisma.reports.update({ where: { id: hiddenFound.id }, data: { moderation_state: 'hidden' } });
}, 60_000);

afterAll(async () => {
	await prisma.conversations.deleteMany({ where: { about_report_id: { in: reportIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'user_id' = any(${userIds})`;
	await deleteAuthUsers(userIds);
});

describe('GET /v1/reports/:code/matches', () => {
	let best: string, good: string, closed: string;

	beforeAll(async () => {
		good = await match(lost, sighted, 0.66);
		best = await match(lost, found, 0.91);
		await match(lost, hiddenFound, 0.95);
		const otherFound = await report(finder, 'found');
		closed = await match(lost, otherFound, 0.6, 'closed');
	});

	it('answers only the managers of the lost report', async () => {
		expect((await list(null, lost.short_code)).status).toBe(401);
		for (const who of [stranger, finder, anon, modAal1, modAal2, admin])
			expect(code(await list(who, lost.short_code))).toEqual([403, 'FORBIDDEN']);
		expect(code(await list(owner, 'zzzzzzzz'))).toEqual([404, 'NOT_FOUND']);
		expect(code(await list(owner, 'bad'))).toEqual([400, 'VALIDATION']);
		expect(code(await list(owner, lost.short_code, '?state=maybe'))).toEqual([400, 'VALIDATION']);
		expect((await list(coOwner, lost.short_code)).status).toBe(200);
	});

	it('ranks suggestions by score with the public view of the other report and no contact data', async () => {
		const res = await list(owner, lost.short_code);
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(() => MatchList.parse(res.body)).not.toThrow();
		// The hidden found report is not listed although it scores best.
		expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([best, good]);
		expect(res.body.items[0]).toMatchObject({
			score: 0.91,
			strength: 'strong',
			chip_match: false,
			state: 'suggested',
			reasons: [
				{ code: 'distance', band: 'lt1' },
				{ code: 'time', hours_band: 'lt24' },
			],
			other: { short_code: found.short_code, type: 'found', species: 'dog', photos: [] },
		});
		const fields = ['short_code', 'type', 'species', 'breed_codes', 'colours', 'size', 'sex', 'photos', 'event_at'];
		expect(Object.keys(res.body.items[0].other).sort()).toEqual([...fields, 'area'].sort());
		const raw = JSON.stringify(res.body);
		for (const secret of [CHIP, 'chip_number', 'location', 'email', 'phone', 'manage', finder.id])
			expect(raw).not.toContain(secret);
	});

	it('filters by state; a found report has no suggestions of its own', async () => {
		const closedOnly = await list(owner, lost.short_code, '?state=closed');
		expect(closedOnly.body.items.map((item: { id: string }) => item.id)).toEqual([closed]);
		const both = await list(owner, lost.short_code, '?state=suggested&state=closed');
		expect(both.body.items).toHaveLength(3);
		expect((await list(finder, found.short_code)).body).toEqual({ items: [] });
	});
});

describe('POST /v1/matches/:id/confirm', () => {
	it('needs a session, a real account with a confirmed email and a manager of the lost report', async () => {
		const id = await match(lost, await report(finder, 'found'));
		expect((await confirm(null, id)).status).toBe(401);
		expect(code(await confirm(anon, id))).toEqual([401, 'UNAUTHENTICATED']);
		expect(code(await confirm(unverified, id))).toEqual([403, 'UNVERIFIED_EMAIL']);
		for (const who of [stranger, finder, modAal1, modAal2, admin])
			expect(code(await confirm(who, id))).toEqual([403, 'FORBIDDEN']);
		expect(code(await confirm(owner, randomUUID()))).toEqual([404, 'NOT_FOUND']);
		expect(code(await confirm(owner, 'not-a-uuid'))).toEqual([400, 'VALIDATION']);
		expect((await prisma.matches.findUniqueOrThrow({ where: { id } })).state).toBe('suggested');
	});

	it('confirms, marks the lost report matched, opens the conversation and notifies the other side once', async () => {
		const lostSide = await report(owner, 'lost');
		await prisma.report_managers.create({ data: { report_id: lostSide.id, user_id: coOwner.id, role: 'owner' } });
		const other = await report(finder, 'found');
		const id = await match(lostSide, other);

		const res = await confirm(owner, id);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ conversation_id: expect.any(String) });
		const conversation_id = res.body.conversation_id;
		expect((await prisma.matches.findUniqueOrThrow({ where: { id } })).state).toBe('confirmed');
		expect((await prisma.reports.findUniqueOrThrow({ where: { id: lostSide.id } })).status).toBe('matched');
		const conversation = await prisma.conversations.findUniqueOrThrow({
			where: { id: conversation_id },
			include: { participants: { select: { user_id: true, role: true } } },
		});
		expect(conversation).toMatchObject({ match_id: id, lost_report_id: lostSide.id, other_report_id: other.id });
		expect(conversation.participants).toEqual(
			expect.arrayContaining([
				{ user_id: owner.id, role: 'owner' },
				{ user_id: coOwner.id, role: 'owner' },
				{ user_id: finder.id, role: 'finder' },
			])
		);
		expect(await prisma.match_feedback.findMany({ where: { match_id: id } })).toMatchObject([
			{ user_id: owner.id, verdict: 'confirm', reason: null },
		]);

		// Repeats (the same manager or a co-owner) return the same conversation and notify nobody again.
		expect((await confirm(owner, id)).body).toEqual({ conversation_id });
		expect((await confirm(coOwner, id)).body).toEqual({ conversation_id });
		expect(await prisma.conversations.count({ where: { match_id: id } })).toBe(1);
		const jobs = await confirmedJobs(id);
		expect(jobs.map((job) => job.data)).toEqual([
			{
				user_id: finder.id,
				type: 'match_confirmed',
				payload: { template: 'match_confirmed', match_id: id, thread_id: conversation_id },
				dedupe_key: `match_confirmed:${id}`,
			},
		]);

		// notify.send resolves the copy for the finder only: their report's code, type and species.
		const recipient = (who: User) => ({ user_id: who.id, locale: 'sl' as const });
		const payload = { template: 'match_confirmed' as const, match_id: id, thread_id: conversation_id };
		expect(await matchConfirmedVars(payload, recipient(finder), systemCtx())).toEqual({
			conversation_id,
			report_code: other.short_code,
			species: 'dog',
			report_type: 'found',
		});
		expect(await matchConfirmedVars(payload, recipient(owner), systemCtx())).toBeNull();
		expect(
			await matchConfirmedVars({ ...payload, thread_id: randomUUID() }, recipient(finder), systemCtx())
		).toBeNull();

		// Confirmed matches stay in the list; they can no longer be rejected.
		const listed = (await list(owner, lostSide.short_code)).body.items;
		expect(listed).toMatchObject([{ id, state: 'confirmed' }]);
		expect(code(await reject(owner, id))).toEqual([409, 'CONFLICT']);
	});

	it('refuses closed matches and closed lost reports', async () => {
		const closedMatch = await match(lost, await report(finder, 'found'), 0.7, 'closed');
		expect(code(await confirm(owner, closedMatch))).toEqual([409, 'CONFLICT']);

		const closedLost = await report(owner, 'lost');
		const id = await match(closedLost, await report(finder, 'found'));
		await prisma.reports.update({
			where: { id: closedLost.id },
			data: { status: 'closed', closed_at: new Date() },
		});
		expect(code(await confirm(owner, id))).toEqual([410, 'GONE']);
		// The whole verdict rolled back.
		expect((await prisma.matches.findUniqueOrThrow({ where: { id } })).state).toBe('suggested');
		expect(await prisma.match_feedback.count({ where: { match_id: id } })).toBe(0);
		expect(await confirmedJobs(id)).toEqual([]);
	});
});

describe('POST /v1/matches/:id/reject', () => {
	it('needs a session and a manager of the lost report, and validates the body', async () => {
		const id = await match(lost, await report(finder, 'found'));
		expect((await reject(null, id)).status).toBe(401);
		for (const who of [anon, stranger, finder, modAal1, modAal2, admin])
			expect(code(await reject(who, id))).toEqual([403, 'FORBIDDEN']);
		expect(code(await reject(owner, randomUUID()))).toEqual([404, 'NOT_FOUND']);
		expect(code(await reject(owner, id, { reason: 'x'.repeat(501) }))).toEqual([400, 'VALIDATION']);
		expect((await prisma.matches.findUniqueOrThrow({ where: { id } })).state).toBe('suggested');
	});

	it('rejects for good with the reason in match_feedback; repeats are no-ops, confirming it is CONFLICT', async () => {
		const other = await report(finder, 'found');
		const id = await match(lost, other);

		expect((await reject(owner, id, { reason: '  Druga barva ovratnice  ' })).status).toBe(204);
		expect(await prisma.matches.findUniqueOrThrow({ where: { id } })).toMatchObject({
			state: 'rejected',
			rejected_reason: 'Druga barva ovratnice',
		});
		expect(await prisma.match_feedback.findMany({ where: { match_id: id } })).toMatchObject([
			{ user_id: owner.id, verdict: 'reject', reason: 'Druga barva ovratnice' },
		]);
		expect((await reject(owner, id)).status).toBe(204);
		expect((await reject(coOwner, id, { reason: 'Ni on' })).status).toBe(204);
		expect((await prisma.matches.findUniqueOrThrow({ where: { id } })).rejected_reason).toBe(
			'Druga barva ovratnice'
		);
		expect(code(await confirm(owner, id))).toEqual([409, 'CONFLICT']);

		// Never listed again, not even when asked for, and the engine does not bring the pair back.
		for (const query of ['', '?state=rejected', '?state=suggested,confirmed,rejected,closed'])
			expect(
				(await list(owner, lost.short_code, query)).body.items.map((item: { id: string }) => item.id)
			).not.toContain(id);
		await MatchingDomain.matchReport({ report_id: other.id }, systemCtx());
		expect(
			await prisma.matches.findMany({ where: { lost_report_id: lost.id, other_report_id: other.id } })
		).toMatchObject([{ id, state: 'rejected' }]);
	});
});

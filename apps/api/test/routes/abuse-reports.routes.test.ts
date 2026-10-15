// /v1/abuse-reports and the staff lists /v1/admin/abuse-reports, /v1/admin/moderation-flags (C11, TASK-25.2) over
// real auth.users rows: targets and their checks, duplicates, weighting by account age, rate limits per user and per
// IP, the auto-hide (hidden, flag, photo.publish, report_hidden with ids only) and the aal2 staff guards.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { AdminAbuseReportList, ModerationFlagList } from '@zivali/validation';

import { app } from '../../app.ts';
import { reportHiddenVars } from '../../domains/abuse/abuse.notify.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

type User = { id: string; auth: string; actor: Actor };
type Kind = { anonymous?: boolean; role?: 'USER' | 'MODERATOR' | 'ADMIN'; aal?: 'aal1' | 'aal2'; young?: boolean };

const userIds: string[] = [];
const reportIds: string[] = [];
const RATE_NAMES = ['abuse.report', 'abuse.report_ip'];

/** Accounts are a day and more old unless `young` (created now: weight 0.5). */
async function user(kind: Kind = {}): Promise<User> {
	const { anonymous = false, role = 'USER', aal = 'aal1', young = false } = kind;
	const id = await createAuthUser({ is_anonymous: anonymous });
	userIds.push(id);
	if (!young)
		await prisma.$executeRaw`update auth.users set created_at = now() - interval '2 days' where id = ${id}::uuid`;
	await prisma.profiles.create({ data: { id, is_anonymous: anonymous, role } });
	const token = await signTestToken({ sub: id, is_anonymous: anonymous, aal });
	const actor: Actor = { user_id: id, role, is_anonymous: anonymous, aal, email_verified: true, locale: 'sl' };
	return { id, auth: `Bearer ${token}`, actor };
}

async function listing(owner: User) {
	const created = await ReportsDomain.insertReport(
		{ type: 'lost', species: 'dog', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
		userCtx(owner.actor)
	);
	reportIds.push(created.id);
	return created;
}

// Every call from its own client IP unless told otherwise, so only the limit under test can trip.
let ipSeq = 0;
const nextIp = () => `10.25.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;
const report = (who: User | null, body: object, ip = nextIp()) => {
	const req = request(app).post('/v1/abuse-reports').set('X-Forwarded-For', ip);
	if (who) req.set('Authorization', who.auth);
	return req.send(body);
};
const onListing = (id: string, reason = 'scam') => ({ target_type: 'report', target_id: id, reason });

const jobs = (name: string, report_id: string) =>
	prisma.$queryRaw<{ data: Record<string, unknown> }[]>`
		select data from pgboss.job
		where name = ${name} and (data->>'report_id' = ${report_id} or data->'payload'->>'report_id' = ${report_id})`;
const moderationState = async (id: string) =>
	(await prisma.reports.findUniqueOrThrow({ where: { id }, select: { moderation_state: true } })).moderation_state;

beforeEach(async () => {
	await prisma.rate_limits.deleteMany({ where: { name: { in: RATE_NAMES } } });
});

afterAll(async () => {
	await prisma.moderation_flags.deleteMany({ where: { target_id: { in: [...reportIds, ...userIds] } } });
	await prisma.rate_limits.deleteMany({ where: { name: { in: RATE_NAMES } } });
	await prisma.audit_log.deleteMany({ where: { actor_id: { in: userIds } } });
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reportIds}) or data->'payload'->>'report_id' = any(${reportIds})`;
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await deleteAuthUsers(userIds);
});

const [owner, reporter, anon, other] = await Promise.all([
	user(),
	user(),
	user({ anonymous: true, young: true }),
	user(),
]);

describe('POST /v1/abuse-reports', () => {
	it('needs a session and a valid body; an unknown listing or profile is VALIDATION', async () => {
		const target = await listing(owner);
		expect((await report(null, onListing(target.id))).status).toBe(401);
		for (const body of [
			{ ...onListing(target.id), reason: 'boring' },
			{ ...onListing(target.id), target_type: 'pet' },
			{ ...onListing(target.id), note: 'x'.repeat(501) },
			{ ...onListing(target.id), note: '   ' },
			{ ...onListing('nope') },
		]) {
			const res = await report(reporter, body);
			expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
		}
		for (const target_type of ['report', 'profile']) {
			const res = await report(reporter, { target_type, target_id: randomUUID(), reason: 'spam' });
			expect([res.status, res.body.error.code, res.body.error.issues]).toEqual([
				400,
				'VALIDATION',
				[{ path: 'target_id', message: 'Not found' }],
			]);
		}
	});

	it('stores a listing report (201) and answers a repeat by the same reporter with the first one (200)', async () => {
		const target = await listing(owner);
		const first = await report(reporter, { ...onListing(target.id), note: '  Asks for money upfront ' });
		expect(first.status).toBe(201);
		expect(first.body).toEqual({ id: expect.any(String), duplicate: false });
		const again = await report(reporter, onListing(target.id, 'fake'));
		expect([again.status, again.body]).toEqual([200, { id: first.body.id, duplicate: true }]);

		const rows = await prisma.abuse_reports.findMany({ where: { target_id: target.id } });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			reporter_id: reporter.id,
			target_type: 'report',
			reason: 'SCAM',
			note: 'Asks for money upfront',
			status: 'open',
		});
		expect(Number(rows[0]!.weight)).toBe(1);
	});

	it('accepts anonymous users and profile targets; accounts younger than 24 h weigh 0.5', async () => {
		const young = await user({ young: true });
		const anonRes = await report(anon, { target_type: 'profile', target_id: other.id, reason: 'spam' });
		const youngRes = await report(young, { target_type: 'profile', target_id: other.id, reason: 'other' });
		const oldRes = await report(reporter, { target_type: 'profile', target_id: other.id, reason: 'other' });
		expect([anonRes.status, youngRes.status, oldRes.status]).toEqual([201, 201, 201]);
		const weights = await prisma.abuse_reports.findMany({
			where: { target_type: 'profile', target_id: other.id },
			select: { reporter_id: true, weight: true },
		});
		expect(Object.fromEntries(weights.map((row) => [row.reporter_id, Number(row.weight)]))).toEqual({
			[anon.id]: 0.5,
			[young.id]: 0.5,
			[reporter.id]: 1,
		});
	});

	it('takes message reports from participants of the conversation only (FORBIDDEN otherwise)', async () => {
		const about = await listing(owner);
		const conversation = await prisma.conversations.create({
			data: {
				about_report_id: about.id,
				participants: {
					create: [
						{ user_id: owner.id, role: 'owner' },
						{ user_id: anon.id, role: 'contact' },
					],
				},
				messages: { create: { sender_id: anon.id, kind: 'text', body: 'Send 50 EUR first' } },
			},
			include: { messages: true },
		});
		const message = conversation.messages[0]!.id;
		const body = { target_type: 'message', target_id: message, reason: 'scam' };

		const outsider = await report(reporter, body);
		expect([outsider.status, outsider.body.error.code]).toEqual([403, 'FORBIDDEN']);
		const unknown = await report(owner, { ...body, target_id: randomUUID() });
		expect([unknown.status, unknown.body.error.code]).toEqual([403, 'FORBIDDEN']);
		const res = await report(owner, body);
		expect([res.status, res.body.duplicate]).toEqual([201, false]);
	});

	it('limits each user to 10 reports per hour (from any IP)', async () => {
		const targets = await Promise.all(Array.from({ length: 11 }, () => listing(owner)));
		for (const target of targets.slice(0, 10))
			expect((await report(reporter, onListing(target.id))).status).toBe(201);
		const res = await report(reporter, onListing(targets[10]!.id));
		expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
		expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
	});

	it('limits each IP to 10 reports per hour (whoever sends them)', async () => {
		const target = await listing(owner);
		const senders = await Promise.all(Array.from({ length: 11 }, () => user()));
		const ip = nextIp();
		for (const sender of senders.slice(0, 10))
			expect((await report(sender, onListing(target.id), ip)).status).toBe(201);
		const res = await report(senders[10]!, onListing(target.id), ip);
		expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
		expect((await report(senders[10]!, onListing(target.id))).status).toBe(201);
	});
});

describe('auto-hide at abuse.auto_hide_threshold (3)', () => {
	it('hides the listing once the weighted open reports reach 3: flag, photo.publish, report_hidden to managers', async () => {
		const target = await listing(owner);
		const [a, b] = await Promise.all([user(), user()]);
		const [y1, y2] = await Promise.all([user({ young: true }), user({ anonymous: true, young: true })]);

		// 1 + 1 + 0.5 = 2.5: still visible.
		for (const who of [a, b, y1]) expect((await report(who, onListing(target.id))).status).toBe(201);
		expect(await moderationState(target.id)).toBe('visible');
		expect(await jobs('photo.publish', target.id)).toEqual([]);

		// + 0.5 = 3: hidden.
		expect((await report(y2, onListing(target.id, 'inappropriate_image'))).status).toBe(201);
		expect(await moderationState(target.id)).toBe('hidden');

		const flags = await prisma.moderation_flags.findMany({ where: { target_id: target.id } });
		expect(flags).toHaveLength(1);
		expect(flags[0]).toMatchObject({
			kind: 'auto_hidden',
			target_type: 'report',
			details: { weight: 3, threshold: 3 },
		});
		expect((await jobs('photo.publish', target.id)).map((job) => job.data)).toEqual([{ report_id: target.id }]);
		// The managers' notification carries the listing id only: nothing about who reported it.
		expect((await jobs('notify.send', target.id)).map((job) => job.data)).toEqual([
			{ user_id: owner.id, type: 'report_hidden', payload: { template: 'report_hidden', report_id: target.id } },
		]);

		// More reports on a hidden listing are stored but neither flag nor notify again.
		expect((await report(reporter, onListing(target.id))).status).toBe(201);
		expect(await prisma.moderation_flags.count({ where: { target_id: target.id } })).toBe(1);
		expect(await jobs('notify.send', target.id)).toHaveLength(1);
	});

	it('report_hidden variables: code and type for a manager while hidden, nothing otherwise', async () => {
		const target = await listing(owner);
		await prisma.reports.update({ where: { id: target.id }, data: { moderation_state: 'hidden' } });
		const payload = { template: 'report_hidden' as const, report_id: target.id };
		const ctx = systemCtx();
		expect(await reportHiddenVars(payload, { user_id: owner.id, locale: 'sl' }, ctx)).toEqual({
			report_code: target.short_code,
			report_type: 'lost',
		});
		expect(await reportHiddenVars(payload, { user_id: reporter.id, locale: 'sl' }, ctx)).toBeNull();
		await prisma.reports.update({ where: { id: target.id }, data: { moderation_state: 'visible' } });
		expect(await reportHiddenVars(payload, { user_id: owner.id, locale: 'sl' }, ctx)).toBeNull();
	});
});

describe('GET /v1/admin/abuse-reports and /v1/admin/moderation-flags', () => {
	const paths = ['/v1/admin/abuse-reports', '/v1/admin/moderation-flags'];

	it.each([
		{ who: 'signed-out visitor', kind: null, status: 401, code: 'UNAUTHENTICATED' },
		{ who: 'anonymous user', kind: { anonymous: true, aal: 'aal2' }, status: 401, code: 'UNAUTHENTICATED' },
		{ who: 'user (aal2)', kind: { aal: 'aal2' }, status: 403, code: 'FORBIDDEN' },
		{ who: 'moderator without TOTP', kind: { role: 'MODERATOR', aal: 'aal1' }, status: 403, code: 'AAL2_REQUIRED' },
		{ who: 'admin without TOTP', kind: { role: 'ADMIN', aal: 'aal1' }, status: 403, code: 'AAL2_REQUIRED' },
	] as const)('$who gets $code', async ({ kind, status, code }) => {
		const caller = kind ? await user(kind) : null;
		for (const path of paths) {
			const req = request(app).get(path);
			if (caller) req.set('Authorization', caller.auth);
			const res = await req;
			expect([path, res.status, res.body.error?.code]).toEqual([path, status, code]);
		}
	});

	it('moderators and admins with TOTP list reports (reporter as id, filters, cursor) and flags; both audited', async () => {
		const [mod, admin] = await Promise.all([
			user({ role: 'MODERATOR', aal: 'aal2' }),
			user({ role: 'ADMIN', aal: 'aal2' }),
		]);
		const target = await listing(owner);
		const [r1, r2] = await Promise.all([user(), user()]);
		await report(r1, { ...onListing(target.id), note: 'Fake photos' });
		await report(r2, onListing(target.id, 'spam'));
		await prisma.abuse_reports.updateMany({ where: { reporter_id: r2.id }, data: { status: 'dismissed' } });

		const all = await request(app).get('/v1/admin/abuse-reports?limit=1').set('Authorization', mod.auth);
		expect(all.status).toBe(200);
		expect(() => AdminAbuseReportList.parse(all.body)).not.toThrow();
		expect(all.body.items).toHaveLength(1);
		expect(all.body.next_cursor).toBe(all.body.items[0].id);
		const next = await request(app)
			.get(`/v1/admin/abuse-reports?limit=1&cursor=${all.body.next_cursor}`)
			.set('Authorization', mod.auth);
		expect(next.body.items[0].id).not.toBe(all.body.items[0].id);

		const open = await request(app)
			.get('/v1/admin/abuse-reports?status=open&target_type=report&limit=50')
			.set('Authorization', admin.auth);
		const mine = open.body.items.find((item: { reporter_id: string }) => item.reporter_id === r1.id);
		expect(mine).toEqual({
			id: expect.any(String),
			reporter_id: r1.id,
			target_type: 'report',
			target_id: target.id,
			reason: 'scam',
			note: 'Fake photos',
			weight: 1,
			status: 'open',
			created_at: expect.any(String),
		});
		expect(open.body.items.every((item: { status: string }) => item.status === 'open')).toBe(true);
		expect(open.body.items.some((item: { reporter_id: string }) => item.reporter_id === r2.id)).toBe(false);

		const bad = await request(app).get('/v1/admin/abuse-reports?status=gone').set('Authorization', mod.auth);
		expect([bad.status, bad.body.error.code]).toEqual([400, 'VALIDATION']);

		await prisma.moderation_flags.create({
			data: {
				kind: 'auto_hidden',
				target_type: 'report',
				target_id: target.id,
				details: { weight: 3, threshold: 3 },
			},
		});
		const flags = await request(app).get('/v1/admin/moderation-flags').set('Authorization', mod.auth);
		expect(flags.status).toBe(200);
		expect(() => ModerationFlagList.parse(flags.body)).not.toThrow();
		expect(flags.body.items.find((flag: { target_id: string }) => flag.target_id === target.id)).toEqual({
			id: expect.any(String),
			kind: 'auto_hidden',
			target_type: 'report',
			target_id: target.id,
			details: { weight: 3, threshold: 3 },
			created_at: expect.any(String),
			resolved_at: null,
		});

		const audit = await prisma.audit_log.findMany({
			where: { actor_id: { in: [mod.id, admin.id] } },
			select: { action: true },
		});
		expect(new Set(audit.map((row) => row.action))).toEqual(
			new Set(['admin.abuse_reports.list', 'admin.moderation_flags.list'])
		);
	});
});

// POST /v1/reports/:code/transitions (C4 status machine, TASK-26.3) over real auth.users rows: the permission matrix,
// every allowed and refused transition, and the side effects of mark_reunited (matches closed, counterpart reunited
// and notified, boost stopped, alerts dropped, conversation read-only, timings audited), close (manage link ended),
// reopen (window from app_config) and extend.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ReportOwnerView } from '@zivali/validation';

import { app } from '../../app.ts';
import { AlertsDomain } from '../../domains/alerts/index.ts';
import { MatchReviewDomain } from '../../domains/matching/index.ts';
import { LifecycleDomain, ReportsDomain } from '../../domains/reports/index.ts';
import configStore from '../../lib/config-store.ts';
import { userCtx, type Actor } from '../../lib/ctx.ts';
import { startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

type User = { id: string; auth: string; actor: Actor };
type Kind = { anonymous?: boolean; role?: 'MODERATOR' | 'ADMIN'; aal?: 'aal1' | 'aal2' };
type Report = { id: string; short_code: string };

const DAY = 86_400_000;
const userIds: string[] = [];
const reportIds: string[] = [];
// A random spot and a 19th-century event: nothing here pairs with seed data or other tests.
const LJ = { lat: 46.0514 + randomInt(0, 900) / 10_000, lng: 14.5061 };
const EVENT_AT = new Date(Date.UTC(1800, 0, 1) + randomInt(0, 900) * 70 * DAY);

async function user(kind: Kind = {}): Promise<User> {
	const { anonymous = false, role = 'USER', aal = 'aal1' } = kind;
	const id = await createAuthUser({ is_anonymous: anonymous });
	userIds.push(id);
	await prisma.profiles.create({ data: { id, is_anonymous: anonymous, role } });
	const token = await signTestToken({ sub: id, is_anonymous: anonymous, aal });
	const actor: Actor = { user_id: id, role, is_anonymous: anonymous, aal, email_verified: !anonymous, locale: 'sl' };
	return { id, auth: `Bearer ${token}`, actor };
}

async function report(manager: User, type: 'lost' | 'found' | 'sighted', extra: object = {}): Promise<Report> {
	const created = await ReportsDomain.insertReport(
		{ type, species: 'dog', location: LJ, event_at: EVENT_AT, ...extra },
		userCtx(manager.actor)
	);
	reportIds.push(created.id);
	return created;
}

const set = (r: Report, data: object) => prisma.reports.update({ where: { id: r.id }, data });
const row = (r: Report) => prisma.reports.findUniqueOrThrow({ where: { id: r.id } });
const transition = (who: User | null, code: string, body: object) => {
	const req = request(app).post(`/v1/reports/${code}/transitions`).send(body);
	return who ? req.set('Authorization', who.auth) : req;
};
const code = (res: request.Response) => [res.status, res.body.error?.code];
const match = (lost: Report, other: Report) =>
	prisma.matches.create({
		data: {
			lost_report_id: lost.id,
			other_report_id: other.id,
			score: 0.9,
			strength: 'strong',
			chip_match: false,
			reasons: [],
		},
	});
const reunitedJobs = (report_id: string) =>
	prisma.$queryRaw<{ user_id: string }[]>`
		select data->>'user_id' as user_id from pgboss.job
		where name = 'notify.send' and data->>'type' = 'report_reunited' and data->'payload'->>'report_id' = ${report_id}`;

let owner: User, coOwner: User, finder: User, stranger: User, anonFinder: User, anonStranger: User;
let modAal1: User, modAal2: User, admin: User;

beforeAll(async () => {
	await startJobs();
	await prisma.rate_limits.deleteMany({ where: { name: 'reports.transition' } });
	[owner, coOwner, finder, stranger, anonFinder, anonStranger, modAal1, modAal2, admin] = await Promise.all([
		user(),
		user(),
		user(),
		user(),
		user({ anonymous: true }),
		user({ anonymous: true }),
		user({ role: 'MODERATOR' }),
		user({ role: 'MODERATOR', aal: 'aal2' }),
		user({ role: 'ADMIN', aal: 'aal2' }),
	]);
}, 60_000);

afterAll(async () => {
	await prisma.conversations.deleteMany({ where: { about_report_id: { in: reportIds } } });
	await prisma.audit_log.deleteMany({ where: { target_id: { in: reportIds } } });
	await prisma.alert_subscriptions.deleteMany({ where: { user_id: { in: userIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.pets.deleteMany({ where: { owner_id: { in: userIds } } });
	await prisma.$executeRaw`delete from pgboss.job where data->>'user_id' = any(${userIds}) or data->>'report_id' = any(${reportIds})`;
	await deleteAuthUsers(userIds);
});

describe('permissions', () => {
	it('lets any manager act, anonymous manage-link holders included, and nobody else', async () => {
		const lost = await report(owner, 'lost');
		await prisma.report_managers.create({ data: { report_id: lost.id, user_id: coOwner.id, role: 'owner' } });
		const found = await report(anonFinder, 'found');
		const extend = { action: 'extend' };

		expect(code(await transition(null, lost.short_code, extend))).toEqual([401, 'UNAUTHENTICATED']);
		for (const who of [stranger, anonStranger, finder, modAal1, modAal2, admin])
			expect(code(await transition(who, lost.short_code, extend))).toEqual([403, 'FORBIDDEN']);
		expect(code(await transition(owner, 'zzzzzzzz', extend))).toEqual([404, 'NOT_FOUND']);

		for (const who of [owner, coOwner]) {
			const res = await transition(who, lost.short_code, extend);
			expect(res.status).toBe(200);
			expect(res.headers['cache-control']).toBe('private, no-store');
			expect(() => ReportOwnerView.parse(res.body)).not.toThrow();
			expect(res.body).toMatchObject({ short_code: lost.short_code, status: 'open', manager_role: 'owner' });
		}
		// The anonymous finder manages their report through the session the manage link gave them.
		const res = await transition(anonFinder, found.short_code, { action: 'close', reason: 'returned_to_owner' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ status: 'closed', close_reason: 'returned_to_owner', manager_role: 'finder' });
	});

	it('validates the code, the action and the reason', async () => {
		const lost = await report(owner, 'lost');
		expect(code(await transition(owner, 'bad', { action: 'extend' }))).toEqual([400, 'VALIDATION']);
		expect(code(await transition(owner, lost.short_code, { action: 'expire' }))).toEqual([400, 'VALIDATION']);
		expect(code(await transition(owner, lost.short_code, {}))).toEqual([400, 'VALIDATION']);
		const noReason = await transition(owner, lost.short_code, { action: 'close' });
		expect(code(noReason)).toEqual([400, 'VALIDATION']);
		expect(noReason.body.error.issues).toEqual([{ path: 'reason', message: expect.any(String) }]);
		// expired is the job's and removed moderation's.
		for (const reason of ['expired', 'removed', 'bored'])
			expect(code(await transition(owner, lost.short_code, { action: 'close', reason }))).toEqual([
				400,
				'VALIDATION',
			]);
		for (const action of ['extend', 'reopen', 'mark_reunited'])
			expect(code(await transition(owner, lost.short_code, { action, reason: 'gave_up' }))).toEqual([
				400,
				'VALIDATION',
			]);
		expect((await row(lost)).status).toBe('open');
	});

	it('answers GONE for a removed report, whatever the action', async () => {
		const lost = await report(owner, 'lost');
		await set(lost, { moderation_state: 'removed' });
		for (const body of [
			{ action: 'extend' },
			{ action: 'close', reason: 'gave_up' },
			{ action: 'mark_reunited' },
		]) {
			const res = await transition(owner, lost.short_code, body);
			expect(code(res)).toEqual([410, 'GONE']);
			expect(res.body.error.details).toEqual({ reason: 'removed' });
		}
	});
});

describe('status machine', () => {
	it('closes open and matched reports with the reason; a closed or reunited one cannot close again', async () => {
		for (const status of ['open', 'matched'] as const) {
			const lost = await report(owner, 'lost');
			await set(lost, { status });
			const res = await transition(owner, lost.short_code, { action: 'close', reason: 'found_elsewhere' });
			expect(res.status).toBe(200);
			expect(res.body).toMatchObject({ status: 'closed', close_reason: 'found_elsewhere' });
			expect(res.body.closed_at).toEqual(expect.any(String));
			expect(code(await transition(owner, lost.short_code, { action: 'close', reason: 'other' }))).toEqual([
				409,
				'CONFLICT',
			]);
			expect(code(await transition(owner, lost.short_code, { action: 'mark_reunited' }))).toEqual([
				409,
				'CONFLICT',
			]);
		}
	});

	it('marks open and matched reports reunited; a reunited one cannot be reunited or closed', async () => {
		for (const status of ['open', 'matched'] as const) {
			const lost = await report(owner, 'lost');
			await set(lost, { status });
			const res = await transition(owner, lost.short_code, { action: 'mark_reunited' });
			expect(res.status).toBe(200);
			expect(res.body).toMatchObject({ status: 'reunited', close_reason: null });
			expect(res.body.reunited_at).toEqual(expect.any(String));
			expect(code(await transition(owner, lost.short_code, { action: 'mark_reunited' }))).toEqual([
				409,
				'CONFLICT',
			]);
			expect(code(await transition(owner, lost.short_code, { action: 'close', reason: 'other' }))).toEqual([
				409,
				'CONFLICT',
			]);
		}
	});

	it('reopens closed and reunited reports within lifecycle.reopen_days, later GONE; open ones are CONFLICT', async () => {
		for (const status of ['open', 'matched'] as const) {
			const lost = await report(owner, 'lost');
			await set(lost, { status });
			expect(code(await transition(owner, lost.short_code, { action: 'reopen' }))).toEqual([409, 'CONFLICT']);
		}
		for (const action of ['mark_reunited', 'close'] as const) {
			const lost = await report(owner, 'lost');
			await set(lost, { last_owner_update_at: new Date(Date.now() - 50 * DAY), expiry_warned_at: new Date() });
			await transition(owner, lost.short_code, { action, ...(action === 'close' && { reason: 'gave_up' }) });
			const res = await transition(owner, lost.short_code, { action: 'reopen' });
			expect(res.status).toBe(200);
			expect(res.body).toMatchObject({ status: 'open', close_reason: null, closed_at: null, reunited_at: null });
			// The idle timer starts again, so the expiry job does not close it right away.
			const reopened = await row(lost);
			expect(Date.now() - reopened.last_owner_update_at.getTime()).toBeLessThan(60_000);
			expect(reopened.expiry_warned_at).toBeNull();
		}

		const old = await report(owner, 'lost');
		await set(old, { status: 'closed', close_reason: 'gave_up', closed_at: new Date(Date.now() - 8 * DAY) });
		const gone = await transition(owner, old.short_code, { action: 'reopen' });
		expect(code(gone)).toEqual([410, 'GONE']);
		expect(gone.body.error.details).toEqual({ reason: 'closed' });
		const oldReunited = await report(owner, 'lost');
		await set(oldReunited, { status: 'reunited', reunited_at: new Date(Date.now() - 8 * DAY) });
		expect(code(await transition(owner, oldReunited.short_code, { action: 'reopen' }))).toEqual([410, 'GONE']);
		// The window is app_config lifecycle.reopen_days.
		const get = configStore.get;
		const spy = vi
			.spyOn(configStore, 'get')
			.mockImplementation(async (key) => (key === 'lifecycle.reopen_days' ? 10 : get(key)));
		try {
			expect((await transition(owner, old.short_code, { action: 'reopen' })).status).toBe(200);
		} finally {
			spy.mockRestore();
		}
	});

	it('refuses to reopen a lost report while its pet has another open lost report', async () => {
		const pet = await prisma.pets.create({ data: { owner_id: owner.id, species: 'dog', name: 'Rex' } });
		const first = await report(owner, 'lost', { pet_id: pet.id });
		await transition(owner, first.short_code, { action: 'close', reason: 'other' });
		const second = await report(owner, 'lost', { pet_id: pet.id });
		const res = await transition(owner, first.short_code, { action: 'reopen' });
		expect(code(res)).toEqual([409, 'DUPLICATE_OPEN_REPORT']);
		expect(res.body.error.details).toEqual({ report_id: second.id, short_code: second.short_code });
	});

	it('extends in any status: the status stays, the idle timer restarts', async () => {
		for (const status of ['open', 'matched', 'reunited', 'closed'] as const) {
			const lost = await report(owner, 'lost');
			const before = new Date(Date.now() - 80 * DAY);
			await set(lost, { status, last_owner_update_at: before, closed_at: new Date(), reunited_at: new Date() });
			const res = await transition(owner, lost.short_code, { action: 'extend' });
			expect(res.status).toBe(200);
			expect(res.body.status).toBe(status);
			expect(Date.parse(res.body.last_owner_update_at)).toBeGreaterThan(before.getTime());
		}
	});
});

describe('side effects', () => {
	it('mark_reunited closes matches, reunites and notifies the counterpart, stops boost and alerts, records timings', async () => {
		const subscriber = await user();
		await AlertsDomain.saveSubscription(
			{ center: LJ, radius_km: 25, species: ['dog'], paused: false },
			userCtx(subscriber.actor)
		);
		const lost = await report(owner, 'lost');
		await prisma.report_managers.create({ data: { report_id: lost.id, user_id: coOwner.id, role: 'owner' } });
		const found = await report(finder, 'found');
		const sighted = await report(stranger, 'sighted');
		const confirmed = await match(lost, found);
		const suggested = await match(lost, sighted);
		const { conversation_id } = await MatchReviewDomain.confirmMatch({ id: confirmed.id }, userCtx(owner.actor));
		const created = (await row(lost)).created_at;
		const firstMatch = new Date(created.getTime() + 3_600_000);
		await set(lost, { boosted_until: new Date(Date.now() + 5 * DAY), first_match_at: firstMatch });
		await set(found, { boosted_until: new Date(Date.now() + DAY) });
		const alert = () =>
			AlertsDomain.nearbyAlert({ user_id: subscriber.id, report_id: lost.id }, userCtx(owner.actor));
		expect(await alert()).not.toBeNull();
		expect((await row(lost)).status).toBe('matched');

		const res = await transition(owner, lost.short_code, { action: 'mark_reunited' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ status: 'reunited', boosted: false });

		const states = await prisma.matches.findMany({
			where: { id: { in: [confirmed.id, suggested.id] } },
			select: { id: true, state: true },
		});
		expect(states.map((m) => m.state)).toEqual(['closed', 'closed']);
		// The confirmed counterpart is reunited too and its managers are told; the suggested one is not.
		const other = await row(found);
		expect(other).toMatchObject({ status: 'reunited', boosted_until: null });
		expect(other.reunited_at).toEqual(expect.any(Date));
		expect((await row(sighted)).status).toBe('open');
		expect(await reunitedJobs(found.id)).toEqual([{ user_id: finder.id }]);
		expect(await reunitedJobs(lost.id)).toEqual([]);
		expect(await reunitedJobs(sighted.id)).toEqual([]);
		const vars = (user_id: string) =>
			LifecycleDomain.reunitedVars(
				{ template: 'report_reunited', report_id: found.id },
				{ user_id, locale: 'sl' },
				userCtx(finder.actor)
			);
		expect(await vars(finder.id)).toEqual({ report_code: found.short_code, species: 'dog' });
		expect(await vars(stranger.id)).toBeNull();
		// Pending nearby alerts are dropped at send time; the conversation is read-only.
		expect(await alert()).toBeNull();
		expect((await prisma.conversations.findUniqueOrThrow({ where: { id: conversation_id } })).status).toBe(
			'read_only'
		);
		// Time to reunite and to the first match, for the reunite-rate metric.
		const [entry] = await prisma.audit_log.findMany({
			where: { target_id: lost.id, action: 'report.mark_reunited' },
		});
		expect(entry).toMatchObject({ actor_id: owner.id, target_type: 'report' });
		const diff = entry!.diff as Record<string, number | string | null>;
		expect(diff).toMatchObject({ from: 'matched', time_to_first_match_s: 3600 });
		expect(diff.time_to_reunite_s).toBeGreaterThanOrEqual(0);
		expect(diff.time_to_reunite_s).toBeLessThan(600);
		const [counterpart] = await prisma.audit_log.findMany({ where: { target_id: found.id } });
		expect(counterpart!.diff).toMatchObject({ from: 'open', via_report_id: lost.id, time_to_first_match_s: null });
		// A counterpart removed by moderation is not told.
		await set(found, { moderation_state: 'removed' });
		expect(await vars(finder.id)).toBeNull();
	});

	it('with several confirmed matches mark_reunited closes nothing on the other side and only notifies it', async () => {
		const lost = await report(owner, 'lost');
		const founds = [await report(finder, 'found'), await report(stranger, 'found')];
		for (const found of founds)
			await MatchReviewDomain.confirmMatch({ id: (await match(lost, found)).id }, userCtx(owner.actor));
		expect((await transition(owner, lost.short_code, { action: 'mark_reunited' })).status).toBe(200);
		for (const found of founds) {
			expect((await row(found)).status).toBe('open');
			expect(await reunitedJobs(found.id)).toHaveLength(1);
		}
		// From the finder's side: a found report confirmed by two owners reunites neither of them.
		const found = await report(finder, 'found');
		const losts = [await report(owner, 'lost'), await report(coOwner, 'lost')];
		for (const [i, lost] of losts.entries())
			await MatchReviewDomain.confirmMatch(
				{ id: (await match(lost, found)).id },
				userCtx((i ? coOwner : owner).actor)
			);
		await transition(finder, found.short_code, { action: 'mark_reunited' });
		for (const lost of losts) expect((await row(lost)).status).toBe('matched');
	});

	it('mark_reunited ends the manage link and deletes the finder email, like close', async () => {
		const found = await report(anonFinder, 'found', { manage_token_hash: new Uint8Array(randomBytes(32)) });
		await prisma.report_contacts.create({ data: { report_id: found.id, email: `${randomUUID()}@test.invalid` } });
		expect((await transition(anonFinder, found.short_code, { action: 'mark_reunited' })).status).toBe(200);
		expect((await row(found)).manage_token_hash).toBeNull();
		expect(await prisma.report_contacts.findUnique({ where: { report_id: found.id } })).toBeNull();
	});

	it('close clears the manage token and deletes the finder email; the report stays readable for its manager', async () => {
		const found = await report(anonFinder, 'found', { manage_token_hash: new Uint8Array(randomBytes(32)) });
		await prisma.report_contacts.create({ data: { report_id: found.id, email: `${randomUUID()}@test.invalid` } });
		const res = await transition(anonFinder, found.short_code, { action: 'close', reason: 'other' });
		expect(res.status).toBe(200);
		expect((await row(found)).manage_token_hash).toBeNull();
		expect(await prisma.report_contacts.findUnique({ where: { report_id: found.id } })).toBeNull();
		expect(
			await prisma.audit_log.findMany({ where: { target_id: found.id }, select: { action: true, diff: true } })
		).toEqual([{ action: 'report.close', diff: { from: 'open', reason: 'other' } }]);
	});
});

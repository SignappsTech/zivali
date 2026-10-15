// report.lifecycle (hourly, C4, TASK-26.3): LOST reminders at 7, 14 and 30 days, report_expiring before the automatic
// close, expiry of idle LOST (90 days) and FOUND/SIGHTED (30 days, not organisation intakes) reports, once each, with
// the timings from app_config lifecycle.* and the notify.send variables the job's notifications resolve to.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { NotificationsDomain } from '../../domains/notifications/index.ts';
import { LifecycleDomain, ReportsDomain } from '../../domains/reports/index.ts';
import { handlers } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { hashKey } from '../../lib/crypto.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { jobs, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

type User = { id: string; actor: Actor };
type Report = { id: string; short_code: string };

const DAY = 86_400_000;
const userIds: string[] = [];
const reportIds: string[] = [];
const emails: string[] = [];
const LJ = { lat: 46.0514 + randomInt(0, 900) / 10_000, lng: 14.5061 };
const EVENT_AT = new Date(Date.UTC(1800, 0, 1) + randomInt(0, 900) * 70 * DAY);
const ago = (days: number) => new Date(Date.now() - days * DAY - 60_000);

async function user(anonymous = false): Promise<User> {
	const id = await createAuthUser({ is_anonymous: anonymous });
	userIds.push(id);
	await prisma.profiles.create({ data: { id, is_anonymous: anonymous, locale: anonymous ? 'en' : 'sl' } });
	const actor: Actor = {
		user_id: id,
		role: 'USER',
		is_anonymous: anonymous,
		aal: 'aal1',
		email_verified: true,
		locale: 'sl',
	};
	return { id, actor };
}

/** A report backdated to `created` days ago and idle (no owner update) for `idle` days. */
async function report(
	manager: User,
	type: 'lost' | 'found' | 'sighted',
	{ created = 0, idle = created, ...extra }: { created?: number; idle?: number } & Record<string, unknown> = {}
): Promise<Report> {
	const r = await ReportsDomain.insertReport(
		{ type, species: 'dog', location: LJ, event_at: EVENT_AT, ...(type === 'lost' && { name: 'Rex' }), ...extra },
		userCtx(manager.actor)
	);
	reportIds.push(r.id);
	await prisma.reports.update({
		where: { id: r.id },
		data: { created_at: ago(created), last_owner_update_at: ago(idle) },
	});
	return r;
}

const row = (r: Report) => prisma.reports.findUniqueOrThrow({ where: { id: r.id } });
type JobData = { user_id: string; type: string; payload: { template: string; report_id: string }; dedupe_key: string };
const queued = async (type: string, r: Report) =>
	(
		await prisma.$queryRaw<{ data: JobData }[]>`
			select data from pgboss.job where name = 'notify.send' and data->>'type' = ${type}
				and data->'payload'->>'report_id' = ${r.id}`
	).map(({ data }) => data);
const recipients = async (type: string, r: Report) => (await queued(type, r)).map((job) => job.user_id).sort();
const tick = () => LifecycleDomain.tick(undefined, systemCtx());
const stubConfig = (values: Record<string, unknown>) => {
	const get = configStore.get;
	return vi.spyOn(configStore, 'get').mockImplementation(async (key) => (key in values ? values[key] : get(key)));
};
const vars = (source: 'reminderVars' | 'expiringVars' | 'closedVars', r: Report, who: User) =>
	LifecycleDomain[source](
		{ template: 'report_reminder', report_id: r.id },
		{ user_id: who.id, locale: 'sl' },
		systemCtx()
	);

let owner: User, coOwner: User, finder: User, anonFinder: User, staff: User;

beforeAll(async () => {
	await startJobs();
	[owner, coOwner, finder, anonFinder, staff] = await Promise.all([user(), user(), user(), user(true), user()]);
}, 60_000);

afterAll(async () => {
	await prisma.audit_log.deleteMany({ where: { target_id: { in: reportIds } } });
	await prisma.notifications.deleteMany({ where: { user_id: { in: userIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.$executeRaw`delete from pgboss.job where data->>'user_id' = any(${userIds})`;
	await prisma.email_outbox.deleteMany({
		where: { to_address_hash: { in: emails.map((e) => hashKey(`email:${e}`)) } },
	});
	await deleteAuthUsers(userIds);
});

describe('LOST reminders', () => {
	it('reminds every manager once per day mark; a late run sends only the latest mark due', async () => {
		const day8 = await report(owner, 'lost', { created: 8, idle: 1 });
		await prisma.report_managers.create({ data: { report_id: day8.id, user_id: coOwner.id, role: 'owner' } });
		const day15 = await report(owner, 'lost', { created: 15, idle: 1 });
		await prisma.reports.update({ where: { id: day15.id }, data: { reminder_day: 7 } });
		const day31 = await report(owner, 'lost', { created: 31, idle: 1 });
		const day3 = await report(owner, 'lost', { created: 3 });
		const found8 = await report(finder, 'found', { created: 8, idle: 1 });
		const closed8 = await report(owner, 'lost', { created: 8, idle: 1 });
		await prisma.reports.update({ where: { id: closed8.id }, data: { status: 'closed', closed_at: new Date() } });

		await tick();
		expect(await recipients('report_reminder', day8)).toEqual([owner.id, coOwner.id].sort());
		expect((await queued('report_reminder', day8))[0]).toMatchObject({
			payload: { template: 'report_reminder', report_id: day8.id },
			dedupe_key: `reminder:${day8.id}:7`,
		});
		expect((await row(day8)).reminder_day).toBe(7);
		expect((await row(day15)).reminder_day).toBe(14);
		expect((await queued('report_reminder', day31)).map((job) => job.dedupe_key)).toEqual([
			`reminder:${day31.id}:30`,
		]);
		for (const r of [day3, found8, closed8]) expect(await queued('report_reminder', r)).toEqual([]);

		// The next hour sends nothing again.
		await tick();
		expect(await recipients('report_reminder', day8)).toHaveLength(2);
		expect(await queued('report_reminder', day31)).toHaveLength(1);

		expect(await vars('reminderVars', day8, owner)).toEqual({
			report_code: day8.short_code,
			day: 7,
			pet_name: 'Rex',
			species: 'dog',
		});
		expect(await vars('reminderVars', day8, finder)).toBeNull();
		expect(await vars('reminderVars', closed8, owner)).toBeNull();
	});

	it('delivers through notify.send with the C10 variables', async () => {
		const r = await report(owner, 'lost', { created: 7, idle: 1 });
		await tick();
		const [job] = await queued('report_reminder', r);
		await NotificationsDomain.deliver(job, systemCtx());
		const inbox = await prisma.notifications.findFirstOrThrow({
			where: { user_id: owner.id, dedupe_key: `reminder:${r.id}:7` },
		});
		expect(inbox).toMatchObject({
			type: 'report_reminder',
			payload: { report_code: r.short_code, day: 7, has_name: 'yes', pet_name: 'Rex', species: 'dog' },
		});
	});
});

describe('expiry warning', () => {
	it('warns lost and found reports expiry_warning_days ahead, once per idle period, not organisation intakes', async () => {
		const lost85 = await report(owner, 'lost', { idle: 85 });
		const lost80 = await report(owner, 'lost', { idle: 80 });
		const found25 = await report(finder, 'found', { idle: 25 });
		const intake = await report(staff, 'found', { idle: 25, source: 'organisation' });

		await tick();
		expect(await recipients('report_expiring', lost85)).toEqual([owner.id]);
		expect(await recipients('report_expiring', found25)).toEqual([finder.id]);
		for (const r of [lost80, intake]) expect(await queued('report_expiring', r)).toEqual([]);
		expect((await row(lost85)).expiry_warned_at).toEqual(expect.any(Date));
		await tick();
		expect(await queued('report_expiring', lost85)).toHaveLength(1);

		expect(await vars('expiringVars', lost85, owner)).toEqual({
			report_code: lost85.short_code,
			report_type: 'lost',
			days_left: 5,
			pet_name: 'Rex',
			species: 'dog',
		});
		expect(await vars('expiringVars', found25, finder)).toMatchObject({ report_type: 'found', days_left: 5 });
		// The one-tap extend makes the queued warning moot.
		await LifecycleDomain.transitionReport({ code: lost85.short_code, action: 'extend' }, userCtx(owner.actor));
		expect(await vars('expiringVars', lost85, owner)).toBeNull();
	});
});

describe('expiry', () => {
	it('closes idle lost (90 days) and found or sighted (30 days) reports as expired, except organisation intakes', async () => {
		const lost = await report(owner, 'lost', { idle: 91, manage_token_hash: new Uint8Array(randomBytes(32)) });
		const matched = await report(owner, 'lost', { idle: 91 });
		await prisma.reports.update({ where: { id: matched.id }, data: { status: 'matched' } });
		const email = `${randomUUID()}@test.invalid`;
		emails.push(email);
		const found = await report(anonFinder, 'found', {
			idle: 31,
			source: 'anonymous',
			manage_token_hash: new Uint8Array(randomBytes(32)),
		});
		await prisma.report_contacts.create({ data: { report_id: found.id, email } });
		const sighted29 = await report(finder, 'sighted', { idle: 29 });
		const intake = await report(staff, 'found', { idle: 31, source: 'organisation' });

		await handlers['report.lifecycle']({}, { ...systemCtx(), prisma, send: jobs.send });

		for (const r of [lost, found]) {
			const closed = await row(r);
			expect(closed).toMatchObject({ status: 'closed', close_reason: 'expired', manage_token_hash: null });
			expect(closed.closed_at).toEqual(expect.any(Date));
		}
		for (const r of [sighted29, intake]) expect((await row(r)).status).toBe('open');
		// C4: the automatic expiry starts from open only.
		expect((await row(matched)).status).toBe('matched');

		expect(await recipients('report_closed', lost)).toEqual([owner.id]);
		expect(await recipients('report_closed', found)).toEqual([anonFinder.id]);
		expect(await vars('closedVars', lost, owner)).toEqual({
			report_code: lost.short_code,
			report_type: 'lost',
			idle_days: 91,
			reopen_days: 7,
			pet_name: 'Rex',
			species: 'dog',
		});
		expect(await prisma.audit_log.findFirst({ where: { target_id: lost.id } })).toMatchObject({
			actor_id: null,
			action: 'report.expire',
		});

		// The finder email gets report_closed once (in the finder's locale), then it is deleted with the manage link.
		expect(await prisma.report_contacts.findUnique({ where: { report_id: found.id } })).toBeNull();
		const mails = (adapters.email.sent ?? []).filter((m) => m.to === email);
		expect(mails).toHaveLength(1);
		expect(mails[0]!.subject).toBe('Your report is closed');
		expect(mails[0]!.text).toContain('/en/my-reports');
		await tick();
		expect((adapters.email.sent ?? []).filter((m) => m.to === email)).toHaveLength(1);
		expect(await recipients('report_closed', lost)).toEqual([owner.id]);
	});

	it('takes every timing from app_config lifecycle.*', async () => {
		const found = await report(finder, 'found', { idle: 11 });
		const lost = await report(owner, 'lost', { created: 3, idle: 3 });
		const spy = stubConfig({
			'lifecycle.found_idle_days': 10,
			'lifecycle.reminder_days': [2],
			'lifecycle.reopen_days': 3,
		});
		try {
			await tick();
			expect((await row(found)).status).toBe('closed');
			expect((await queued('report_reminder', lost)).map((job) => job.dedupe_key)).toEqual([
				`reminder:${lost.id}:2`,
			]);
			expect(await vars('closedVars', found, finder)).toMatchObject({ idle_days: 11, reopen_days: 3 });
		} finally {
			spy.mockRestore();
		}
	});
});

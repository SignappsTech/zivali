// retention.blur_location (daily, ADR-006 CH-24, TASK-26.7) with a faked clock (ctx.now): the stored point of reports
// closed, expired or reunited more than retention.exact_point_blur_days (30) ago becomes the public centre, once;
// the public circle stays; open, recently closed and reopened reports are left alone; the job logs counts only.
import { randomInt } from 'node:crypto';

import { pino } from 'pino';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.ts';
import { LifecycleDomain, ReportsDomain } from '../../domains/reports/index.ts';
import { handlers } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { jobs, SCHEDULE_TZ, SCHEDULES } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

type Report = { id: string; short_code: string };
type Location = {
	exact_lat: number;
	exact_lng: number;
	public_lat: number;
	public_lng: number;
	public_radius_m: number;
	municipality_id: number | null;
};

const DAY = 86_400_000;
const NOW = new Date();
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const daysLater = (days: number) => new Date(NOW.getTime() + days * DAY);
const reportIds: string[] = [];
// A random spot and a 19th-century event: nothing here pairs with seed data or other tests.
const LJ = { lat: 46.0514 + randomInt(0, 900) / 10_000, lng: 14.5061 };
const EVENT_AT = new Date(Date.UTC(1800, 0, 1) + randomInt(0, 900) * 70 * DAY);

let ownerId: string, auth: string, actor: Actor;

async function report(type: 'lost' | 'found', data: object = {}): Promise<Report> {
	const r = await ReportsDomain.insertReport(
		{ type, species: 'dog', location: LJ, event_at: EVENT_AT },
		userCtx(actor)
	);
	reportIds.push(r.id);
	await prisma.reports.update({ where: { id: r.id }, data });
	return r;
}

const location = async (r: Report): Promise<Location> =>
	(
		await prisma.$queryRaw<Location[]>`
			select extensions.st_y(exact_point::extensions.geometry) as exact_lat,
				extensions.st_x(exact_point::extensions.geometry) as exact_lng,
				extensions.st_y(public_point::extensions.geometry) as public_lat,
				extensions.st_x(public_point::extensions.geometry) as public_lng,
				public_radius_m, municipality_id
			from app.reports where id = ${r.id}::uuid`
	)[0]!;
/** The stored location after a blur: the stored point is the public centre, everything public as it was. */
const blurredFrom = (before: Location): Location => ({
	...before,
	exact_lat: before.public_lat,
	exact_lng: before.public_lng,
});
const blur = (now: Date) => LifecycleDomain.blurEndedLocations(undefined, systemCtx({ now }));
const stubConfig = (values: Record<string, unknown>) => {
	const get = configStore.get;
	vi.spyOn(configStore, 'get').mockImplementation(async (key) => (key in values ? values[key] : get(key)));
};

beforeAll(async () => {
	ownerId = await createAuthUser();
	await prisma.profiles.create({ data: { id: ownerId } });
	auth = `Bearer ${await signTestToken({ sub: ownerId })}`;
	actor = { user_id: ownerId, role: 'USER', is_anonymous: false, aal: 'aal1', email_verified: true, locale: 'sl' };
});

afterEach(() => vi.restoreAllMocks());

afterAll(async () => {
	await prisma.audit_log.deleteMany({ where: { target_id: { in: reportIds } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await deleteAuthUsers([ownerId]);
});

describe('retention.blur_location', () => {
	it('is a registered queue with a daily schedule', () => {
		expect(handlers['retention.blur_location']).toBeTypeOf('function');
		expect([SCHEDULES['retention.blur_location'], SCHEDULE_TZ]).toEqual(['45 3 * * *', 'Europe/Ljubljana']);
	});

	it('blurs closed, expired and reunited reports N days after they ended, not before, once; the circle stays', async () => {
		const closed = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(20) });
		const expired = await report('lost', { status: 'closed', close_reason: 'expired', closed_at: daysAgo(20) });
		const reunited = await report('found', { status: 'reunited', reunited_at: daysAgo(20) });
		const recent = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(5) });
		const open = await report('lost', { created_at: daysAgo(400), last_owner_update_at: daysAgo(400) });
		const ended = [closed, expired, reunited];
		const before = new Map<string, Location>();
		for (const r of [...ended, recent, open]) before.set(r.id, await location(r));
		for (const r of ended) expect(before.get(r.id)!.exact_lat).not.toBe(before.get(r.id)!.public_lat);

		// 29 days after they ended: nothing yet.
		await blur(daysLater(9));
		for (const r of [...ended, recent, open]) expect(await location(r)).toEqual(before.get(r.id));

		// 30 days after: the stored point is the public centre; radius and municipality stay.
		const at = new Date(daysLater(10).getTime() + 60_000);
		expect(await blur(at)).toBeGreaterThanOrEqual(ended.length);
		for (const r of ended) expect(await location(r)).toEqual(blurredFrom(before.get(r.id)!));
		for (const r of [recent, open]) expect(await location(r)).toEqual(before.get(r.id));

		// Idempotent: a second run finds nothing and changes nothing.
		expect(await blur(at)).toBe(0);
		for (const r of ended) expect(await location(r)).toEqual(blurredFrom(before.get(r.id)!));

		// The owner now sees the blurred point, inside the same public circle.
		const res = await request(app).get(`/v1/reports/${closed.short_code}`).set('Authorization', auth);
		expect(res.status).toBe(200);
		const b = before.get(closed.id)!;
		expect(res.body.location).toEqual({ lat: b.public_lat, lng: b.public_lng });
		expect(res.body.area).toEqual({ lat: b.public_lat, lng: b.public_lng, radius_m: b.public_radius_m });
	});

	it('leaves a report reopened in time alone; one reopened after the blur keeps the blurred point', async () => {
		const reopened = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(3) });
		const kept = await location(reopened);
		await LifecycleDomain.transitionReport({ code: reopened.short_code, action: 'reopen' }, userCtx(actor));
		await blur(daysLater(60));
		expect(await location(reopened)).toEqual(kept);

		// N comes from app_config: with 2 days a report closed 3 days ago is blurred and can still be reopened.
		stubConfig({ 'retention.exact_point_blur_days': 2 });
		const late = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(3) });
		const original = await location(late);
		await blur(NOW);
		expect(await location(late)).toEqual(blurredFrom(original));
		const view = await LifecycleDomain.transitionReport({ code: late.short_code, action: 'reopen' }, userCtx(actor));
		expect(view.report.status).toBe('open');
		expect(view.exact).toEqual({ lat: original.public_lat, lng: original.public_lng });
		await blur(daysLater(60));
		expect(await location(late)).toEqual(blurredFrom(original));
	});

	it('logs the count only, never a coordinate', async () => {
		await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(40) });
		const lines: string[] = [];
		const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
		await handlers['retention.blur_location'](undefined, {
			...systemCtx({ logger, now: NOW }),
			prisma,
			send: jobs.send,
		});
		expect(lines).toHaveLength(1);
		const line = JSON.parse(lines[0]!) as Record<string, unknown>;
		expect(line).toMatchObject({ msg: 'retention.blur_location done' });
		expect(line.blurred).toBeGreaterThanOrEqual(1);
		expect(lines[0]).not.toMatch(/\d\.\d{4}|"lat"|"lng"/);
	});
});

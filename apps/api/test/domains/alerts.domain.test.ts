// Nearby-alert fan-out (C10) against the local database: who gets a nearby_lost alert, matching on public_point only
// (CH-148), one alert per report per user, the daily cap, the notify.send gate, and 1000 recipients in under 60 s.
// Assertions only look at this file's users: other worktrees may share the database.
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import AlertsDao from '../../domains/alerts/alerts.dao.ts';
import { AlertsDomain } from '../../domains/alerts/index.ts';
import { Prisma } from '../../generated/client.ts';
import type { JobCtx } from '../../jobs/index.ts';
import { handle as fanoutJob } from '../../jobs/alerts.fanout.job.ts';
import { handle as notifySendJob } from '../../jobs/notify.send.job.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { geoLookup } from '../../lib/geo.ts';
import { jobs, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';

type Point = { lat: number; lng: number };
type QueuedAlert = { user_id: string; type: string; payload: Record<string, unknown>; dedupe_key: string };

// Novo mesto: far from the 20-collab fixture subscriptions (Ljubljana, Maribor).
const P: Point = { lat: 45.804, lng: 15.169 };
const at = (from: Point, north_m: number, east_m: number): Point => ({
	lat: from.lat + north_m / 111_320,
	lng: from.lng + east_m / (111_320 * Math.cos((from.lat * Math.PI) / 180)),
});
const geography = ({ lat, lng }: Point) =>
	Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;

const reports: string[] = [];
const users = new Set<string>();
const jobCtx = (): JobCtx => ({ ...systemCtx(), prisma, send: jobs.send });

async function profiles(count: number): Promise<string[]> {
	const ids = Array.from({ length: count }, () => randomUUID());
	await prisma.profiles.createMany({ data: ids.map((id) => ({ id })) });
	for (const id of ids) users.add(id);
	return ids;
}

async function subscribe(
	center: Point,
	fields: Partial<{ radius_km: number; species: string[]; paused: boolean }> = {}
) {
	const [id] = await profiles(1);
	await AlertsDao.upsertSubscription(id!, {
		center,
		radius_km: 1,
		species: ['dog', 'cat'],
		paused: false,
		...fields,
	});
	return id!;
}

type ReportFields = {
	exact: Point;
	pub: Point;
	type: string;
	species: string;
	status: string;
	moderation: string;
	municipality_id: number | null;
};
async function report(fields: Partial<ReportFields> = {}): Promise<string> {
	const { exact = P, pub = P, type = 'lost', species = 'dog', status = 'open', moderation = 'visible' } = fields;
	const id = randomUUID();
	reports.push(id);
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, municipality_id, in_slovenia)
		values (${id}::uuid, ${id.slice(0, 8)}, ${type}::app."REPORT_TYPE", ${species}::app."SPECIES",
			${status}::app."REPORT_STATUS", ${moderation}::app."MODERATION_STATE", now(), ${geography(exact)},
			${geography(pub)}, 500, ${fields.municipality_id ?? null}::smallint, true)`;
	return id;
}

/** `count` earlier alerts for `user_id`, `hours` ago (real reports: alert_deliveries.report_id gets its FK in TASK-6.16). */
async function pastAlerts(user_id: string, count: number, hours: number): Promise<void> {
	for (let i = 0; i < count; i++) {
		const report_id = await report({ type: 'found' });
		await prisma.$executeRaw`
			insert into app.alert_deliveries (report_id, user_id, sent_at, channel)
			values (${report_id}::uuid, ${user_id}::uuid, now() - make_interval(hours => ${hours}), 'push')`;
	}
}

async function queued(report_id: string): Promise<QueuedAlert[]> {
	const rows = await prisma.$queryRaw<{ data: QueuedAlert }[]>`
		select data from pgboss.job where name = 'notify.send' and data->>'dedupe_key' = ${`nearby:${report_id}`}`;
	return rows.map((row) => row.data).filter((data) => users.has(data.user_id));
}
const recipients = async (report_id: string) => (await queued(report_id)).map((data) => data.user_id).sort();

beforeAll(async () => {
	await startJobs();
	await seedGeo();
}, 120_000);

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	const keys = reports.map((id) => `nearby:${id}`);
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'dedupe_key' = any(${keys})`;
	await prisma.$executeRaw`delete from app.alert_deliveries where report_id = any(${reports}::uuid[])`;
	await prisma.$executeRaw`delete from app.reports where id = any(${reports}::uuid[])`;
	await prisma.profiles.deleteMany({ where: { id: { in: [...users] } } });
});

describe('AlertsDomain.fanout', () => {
	it('queues nearby_lost for subscribers covering the public point, with the public area and a distance band only', async () => {
		const near = await subscribe(at(P, 300, 0));
		const far = await subscribe(at(P, 0, 4_000), { radius_km: 5 });
		const outside = await subscribe(at(P, 0, 6_000), { radius_km: 5 });
		const paused = await subscribe(P, { paused: true });
		const catsOnly = await subscribe(P, { species: ['cat'] });
		const manager = await subscribe(P);
		const geo = await geoLookup(P.lat, P.lng);
		expect(geo.in_slovenia).toBe(true);
		const area = await prisma.municipalities.findUniqueOrThrow({ where: { id: geo.municipality_id! } });
		const id = await report({ municipality_id: area.id });
		await prisma.report_managers.create({ data: { report_id: id, user_id: manager, role: 'owner' } });

		expect(await AlertsDomain.fanout({ report_id: id }, systemCtx())).toBeGreaterThanOrEqual(2);
		const [{ short_code, created_at }] = await prisma.$queryRaw<{ short_code: string; created_at: Date }[]>`
			select short_code, created_at from app.reports where id = ${id}::uuid`;
		const alert = (user_id: string, distance_band: string): QueuedAlert => ({
			user_id,
			type: 'nearby_lost',
			payload: {
				report_code: short_code,
				species: 'dog',
				distance_band,
				has_area: true,
				area_name: area.name_sl,
				reported_at: created_at.toISOString(),
			},
			dedupe_key: `nearby:${id}`,
		});
		const sorted = (list: QueuedAlert[]) => list.sort((a, b) => a.user_id.localeCompare(b.user_id));
		expect(sorted(await queued(id))).toEqual(sorted([alert(near, 'lt1'), alert(far, '3to10')]));
		for (const skipped of [outside, paused, catsOnly, manager]) expect(await recipients(id)).not.toContain(skipped);
		expect(
			await prisma.alert_deliveries.findMany({
				where: { report_id: id },
				select: { user_id: true, channel: true },
			})
		).toEqual(expect.arrayContaining([{ user_id: near, channel: 'push' }]));
	});

	it('sends one alert per report per user: a second run queues nothing new', async () => {
		const user = await subscribe(P);
		const id = await report({ species: 'cat' });
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		expect(await recipients(id)).toEqual([user]);
		expect(await prisma.alert_deliveries.count({ where: { report_id: id, user_id: user } })).toBe(1);
	});

	it('skips users with 5 alerts in the last 24 h (daily cap), not those whose alerts are older', async () => {
		const capped = await subscribe(P);
		const yesterday = await subscribe(P);
		await pastAlerts(capped, 5, 1);
		await pastAlerts(yesterday, 5, 25);
		const id = await report();
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		expect(await recipients(id)).toEqual([yesterday]);
	});

	it('queues nothing for found reports, hidden or held reports, and closed or reunited ones', async () => {
		const user = await subscribe(P);
		for (const fields of [
			{ type: 'found' },
			{ type: 'sighted' },
			{ moderation: 'held' },
			{ moderation: 'hidden' },
			{ status: 'closed' },
			{ status: 'reunited' },
		]) {
			const id = await report(fields);
			expect(await AlertsDomain.fanout({ report_id: id }, systemCtx()), JSON.stringify(fields)).toBe(0);
			expect(await recipients(id)).toEqual([]);
		}
		expect(await AlertsDomain.fanout({ report_id: randomUUID() }, systemCtx())).toBe(0);
		expect(await prisma.alert_deliveries.count({ where: { user_id: user } })).toBe(0);
	});

	it('matches on the public point only: probing with many centres cannot locate the stored point (CH-148)', async () => {
		// Two reports with one public circle and stored points 700 m apart, probed by 1 km subscriptions every 250 m.
		const grid: string[] = [];
		for (let north = -4; north <= 4; north++)
			for (let east = -4; east <= 4; east++) grid.push(await subscribe(at(P, north * 250, east * 250)));
		const first = await report({ exact: at(P, 400, 0) });
		const second = await report({ exact: at(P, -300, 0) });
		const reached = async (sql: Prisma.Sql) =>
			(await prisma.$queryRaw<{ user_id: string }[]>(sql))
				.map((row) => row.user_id)
				.filter((id) => grid.includes(id))
				.sort();
		const within = (report_id: string, column: 'public_point' | 'exact_point') =>
			reached(Prisma.sql`
				select s.user_id::text as user_id from app.alert_subscriptions s join app.reports r on r.id = ${report_id}::uuid
				where extensions.st_dwithin(s.center_point, r.${Prisma.raw(column)}, s.radius_km * 1000)`);

		const firstAlerts = (await AlertsDao.findRecipients(first, 10_000)).map((row) => row.user_id);
		const secondAlerts = (await AlertsDao.findRecipients(second, 10_000)).map((row) => row.user_id);
		const firstReached = grid.filter((id) => firstAlerts.includes(id)).sort();
		expect(firstReached).toEqual(grid.filter((id) => secondAlerts.includes(id)).sort());
		expect(firstReached).toEqual(await within(first, 'public_point'));
		// The probe is meaningful: matching on the stored point would have reached a different set.
		expect(await within(first, 'exact_point')).not.toEqual(firstReached);
		expect(await within(second, 'exact_point')).not.toEqual(firstReached);
	});

	it('fans out to 1000 subscribers in chunks of 500 in under 60 s (AC#4)', async () => {
		const ids = await profiles(1_000);
		await prisma.$executeRaw`
			insert into app.alert_subscriptions (id, user_id, center_point, radius_km, updated_at)
			select gen_random_uuid(), u, extensions.st_project(${geography(P)}, random() * 2000, radians(random() * 360)), 5,
				now()
			from unnest(${ids}::uuid[]) as u`;
		const id = await report();
		const find = vi.spyOn(AlertsDao, 'findRecipients');

		const started = performance.now();
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		const seconds = (performance.now() - started) / 1000;

		expect(seconds).toBeLessThan(60);
		expect((await recipients(id)).filter((user) => ids.includes(user))).toHaveLength(1_000);
		expect(await prisma.alert_deliveries.count({ where: { report_id: id, user_id: { in: ids } } })).toBe(1_000);
		expect(find.mock.calls.every(([, limit]) => limit === 500)).toBe(true);
		expect(find.mock.calls.length).toBeGreaterThanOrEqual(3);
	}, 120_000);
});

describe('jobs', () => {
	it('alerts.fanout completes a malformed payload without retrying and fans out a valid one', async () => {
		const user = await subscribe(P);
		await expect(fanoutJob({ marker: 'x' }, jobCtx())).resolves.toBeUndefined();
		const id = await report();
		await fanoutJob({ report_id: id }, jobCtx());
		expect(await recipients(id)).toContain(user);
	});

	it('notify.send drops a queued alert once the report is closed or reunited, or the subscription paused or deleted', async () => {
		const user = await subscribe(P);
		const id = await report();
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		const [input] = (await queued(id)).filter((data) => data.user_id === user);
		const deliverable = () => AlertsDomain.shouldDeliver(input!, systemCtx());
		const setReport = (status: string) =>
			prisma.$executeRaw`update app.reports set status = ${status}::app."REPORT_STATUS" where id = ${id}::uuid`;

		expect(await deliverable()).toBe(true);
		await setReport('closed');
		expect(await deliverable()).toBe(false);
		const ctx = jobCtx();
		const info = vi.spyOn(ctx.logger, 'info');
		await notifySendJob(input, ctx);
		expect(info).toHaveBeenCalledWith('alert dropped');
		await setReport('reunited');
		expect(await deliverable()).toBe(false);
		await setReport('matched');
		expect(await deliverable()).toBe(true);
		await AlertsDao.upsertSubscription(user, { center: P, radius_km: 1, species: ['dog'], paused: true });
		expect(await deliverable()).toBe(false);
		await prisma.alert_subscriptions.deleteMany({ where: { user_id: user } });
		expect(await deliverable()).toBe(false);
		expect(await AlertsDomain.shouldDeliver({ ...input!, type: 'match_chip' }, systemCtx())).toBe(true);
	});
});

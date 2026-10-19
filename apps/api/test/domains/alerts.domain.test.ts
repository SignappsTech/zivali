// Nearby-alert fan-out (C10) against the local database: who gets a nearby_lost alert, matching on public_point only
// (CH-148), one alert per report per user, the daily cap, ids-only jobs resolved (or dropped) by nearbyAlert in
// notify.send, and 1000 recipients in under 60 s. Assertions only look at this file's users: other worktrees may share
// the database.
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import AlertsDao from '../../domains/alerts/alerts.dao.ts';
import { AlertsDomain } from '../../domains/alerts/index.ts';
import { adapters } from '../../adapters/index.ts';
import { mockPush } from '../../adapters/push/mock.ts';
import { Prisma } from '../../generated/client.ts';
import type { JobCtx } from '../../jobs/index.ts';
import { handle as fanoutJob } from '../../jobs/alerts.fanout.job.ts';
import { handle as notifySendJob } from '../../jobs/notify.send.job.ts';
import { NotificationsDomain } from '../../domains/notifications/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { geoLookup } from '../../lib/geo.ts';
import { jobs, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';

type Point = { lat: number; lng: number };
type QueuedAlert = {
	user_id: string;
	type: 'nearby_lost';
	payload: { template: 'nearby_lost'; report_id: string };
	dedupe_key: string;
};

// TASK-110: the test point is picked per run (pickPoint), so alert subscriptions left by earlier runs cannot cover it.
let P: Point;
const at = (from: Point, north_m: number, east_m: number): Point => ({
	lat: from.lat + north_m / 111_320,
	lng: from.lng + east_m / (111_320 * Math.cos((from.lat * Math.PI) / 180)),
});
/** A spot 60 km north of P per step, out of reach (max radius 25 km) of the other tests' subscribers. */
const away = (step: number) => at(P, step * 60_000, 0);
const geography = ({ lat, lng }: Point) =>
	Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;

const reports: string[] = [];
const users = new Set<string>();

const OLD_P: Point = { lat: 45.804, lng: 15.169 }; // the former fixed point: residue of earlier runs sits here
// Fixture subscriptions of the collab seeder (radius up to 25 km): Ljubljana and Maribor.
const FIXTURES: Point[] = [
	{ lat: 46.056, lng: 14.505 },
	{ lat: 46.554, lng: 15.646 },
];
const km = (a: Point, b: Point) => {
	const rad = Math.PI / 180;
	const h =
		Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
	return 12_742 * Math.asin(Math.sqrt(h));
};

/** A random municipality's inner point: inside Slovenia, 20 km from the old P, 45 km from the fixtures (also 60 and 120 km north). */
async function pickPoint(): Promise<Point> {
	const rows = await prisma.$queryRaw<Point[]>`
		select extensions.st_y(extensions.st_pointonsurface(geom::extensions.geometry)) as lat,
			extensions.st_x(extensions.st_pointonsurface(geom::extensions.geometry)) as lng
		from app.municipalities order by random()`;
	for (const point of rows) {
		const spots = [0, 1, 2].map((step) => at(point, step * 60_000, 0));
		if (km(point, OLD_P) < 20 || spots.some((spot) => FIXTURES.some((fixture) => km(spot, fixture) < 45))) continue;
		if ((await geoLookup(point.lat, point.lng)).in_slovenia) return point;
	}
	throw new Error('no usable municipality point for the alerts test');
}

/** Set-based cleanup in FK order: queued jobs, deliveries, subscriptions, reports, profiles. Safe to repeat. */
async function purge(reportIds: string[], userIds: string[]): Promise<void> {
	const keys = reportIds.map((id) => `nearby:${id}`);
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'dedupe_key' = any(${keys})`;
	await prisma.$executeRaw`delete from app.alert_deliveries where report_id = any(${reportIds}::uuid[]) or user_id = any(${userIds}::uuid[])`;
	await prisma.$executeRaw`delete from app.alert_subscriptions where user_id = any(${userIds}::uuid[])`;
	await prisma.$executeRaw`delete from app.reports where id = any(${reportIds}::uuid[])`;
	await prisma.$executeRaw`delete from app.profiles where id = any(${userIds}::uuid[])`;
}
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

/** Photos of a report: `status` and the public thumb URL per position (C5 public path or null). */
async function photos(
	report_id: string,
	list: { status: 'accepted' | 'published' | 'unpublished'; thumb: string | null }[]
) {
	const [owner] = await profiles(1);
	await prisma.photos.createMany({
		data: list.map(({ status, thumb }, position) => ({
			owner_id: owner!,
			report_id,
			position,
			sha256: randomUUID(),
			width: 800,
			height: 600,
			bytes: 50_000,
			status,
			public_thumb_url: thumb,
		})),
	});
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
	P = await pickPoint();
}, 120_000);

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(() => purge(reports, [...users]), 120_000);

describe('AlertsDomain.fanout', () => {
	it('queues ids-only nearby_lost jobs for subscribers covering the public point; nearbyAlert adds area and band', async () => {
		const near = await subscribe(at(P, 300, 0));
		const far = await subscribe(at(P, 0, 4_000), { radius_km: 5 });
		const outside = await subscribe(at(P, 0, 6_000), { radius_km: 5 });
		const paused = await subscribe(P, { paused: true });
		const catsOnly = await subscribe(P, { species: ['cat'] });
		// No animal chosen means no alerts, not every animal (TASK-114.14).
		const noAnimals = await subscribe(P, { species: [] });
		const manager = await subscribe(P);
		const geo = await geoLookup(P.lat, P.lng);
		expect(geo.in_slovenia).toBe(true);
		const area = await prisma.municipalities.findUniqueOrThrow({ where: { id: geo.municipality_id! } });
		const id = await report({ municipality_id: area.id });
		await prisma.report_managers.create({ data: { report_id: id, user_id: manager, role: 'owner' } });

		expect(await AlertsDomain.fanout({ report_id: id }, systemCtx())).toBeGreaterThanOrEqual(2);
		const [{ short_code, created_at }] = await prisma.$queryRaw<{ short_code: string; created_at: Date }[]>`
			select short_code, created_at from app.reports where id = ${id}::uuid`;
		const job = (user_id: string): QueuedAlert => ({
			user_id,
			type: 'nearby_lost',
			payload: { template: 'nearby_lost', report_id: id },
			dedupe_key: `nearby:${id}`,
		});
		const sorted = (list: QueuedAlert[]) => list.sort((a, b) => a.user_id.localeCompare(b.user_id));
		expect(sorted(await queued(id))).toEqual(sorted([job(near), job(far)]));
		for (const skipped of [outside, paused, catsOnly, noAnimals, manager])
			expect(await recipients(id)).not.toContain(skipped);
		const variables = (distance_band: string) => ({
			report_code: short_code,
			species: 'dog',
			distance_band,
			has_area: true,
			area_name: area.name_sl,
			reported_at: created_at.toISOString(),
			thumb_url: null, // no photo (TASK-22.8)
		});
		expect(await AlertsDomain.nearbyAlert({ user_id: near, report_id: id }, systemCtx())).toEqual(variables('lt1'));
		expect(await AlertsDomain.nearbyAlert({ user_id: far, report_id: id }, systemCtx())).toEqual(
			variables('3to10')
		);
		expect(
			await prisma.alert_deliveries.findMany({
				where: { report_id: id },
				select: { user_id: true, channel: true },
			})
		).toEqual(expect.arrayContaining([{ user_id: near, channel: 'push' }]));
	});

	it('sends one alert per report per user: a second run queues nothing new', async () => {
		const here = away(1);
		const user = await subscribe(here);
		const id = await report({ exact: here, pub: here, species: 'cat' });
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		expect(await recipients(id)).toEqual([user]);
		expect(await prisma.alert_deliveries.count({ where: { report_id: id, user_id: user } })).toBe(1);
	});

	it('skips users with 5 alerts in the last 24 h (daily cap), not those whose alerts are older', async () => {
		const here = away(2);
		const capped = await subscribe(here);
		const yesterday = await subscribe(here);
		await pastAlerts(capped, 5, 1);
		await pastAlerts(yesterday, 5, 25);
		const id = await report({ exact: here, pub: here });
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

		const firstAlerts = await AlertsDao.findRecipients(first, 10_000);
		const secondAlerts = await AlertsDao.findRecipients(second, 10_000);
		const firstReached = grid.filter((id) => firstAlerts.includes(id)).sort();
		expect(firstReached).toEqual(grid.filter((id) => secondAlerts.includes(id)).sort());
		expect(firstReached).toEqual(await within(first, 'public_point'));
		// The probe is meaningful: matching on the stored point would have reached a different set.
		expect(await within(first, 'exact_point')).not.toEqual(firstReached);
		expect(await within(second, 'exact_point')).not.toEqual(firstReached);
	});

	it('fans out to 1000 subscribers in chunks of 500 in under 60 s (AC#4)', async () => {
		const ids = await profiles(1_000);
		let id = '';
		try {
			await prisma.$executeRaw`
				insert into app.alert_subscriptions (id, user_id, center_point, radius_km, updated_at)
				select gen_random_uuid(), u, extensions.st_project(${geography(P)}, random() * 2000, radians(random() * 360)), 5,
					now()
				from unnest(${ids}::uuid[]) as u`;
			id = await report();
			const find = vi.spyOn(AlertsDao, 'findRecipients');

			const started = performance.now();
			await AlertsDomain.fanout({ report_id: id }, systemCtx());
			const seconds = (performance.now() - started) / 1000;

			expect(seconds).toBeLessThan(60);
			expect((await recipients(id)).filter((user) => ids.includes(user))).toHaveLength(1_000);
			expect(await prisma.alert_deliveries.count({ where: { report_id: id, user_id: { in: ids } } })).toBe(1_000);
			expect(find.mock.calls.every(([, limit]) => limit === 500)).toBe(true);
			expect(find.mock.calls.length).toBeGreaterThanOrEqual(3);
		} finally {
			// Its own cleanup: a timeout elsewhere must not leave 1000 users behind.
			await purge(id ? [id] : [], ids);
			for (const user of ids) users.delete(user);
		}
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

	it('notify.send drops a queued alert once the report is closed or reunited, or the subscription paused, emptied or deleted', async () => {
		const user = await subscribe(P);
		const id = await report();
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		const [input] = (await queued(id)).filter((data) => data.user_id === user);
		const deliverable = async () =>
			(await AlertsDomain.nearbyAlert({ user_id: user, ...input!.payload }, systemCtx())) !== null;
		const setReport = (status: string) =>
			prisma.$executeRaw`update app.reports set status = ${status}::app."REPORT_STATUS" where id = ${id}::uuid`;
		const send = async () => {
			const ctx = jobCtx();
			const info = vi.spyOn(ctx.logger, 'info');
			await notifySendJob(input, ctx);
			const messages = info.mock.calls.map(([first, second]) => (typeof first === 'string' ? first : second));
			info.mockRestore();
			return messages;
		};

		expect(await deliverable()).toBe(true);
		expect(await send()).not.toContain('alert dropped');
		await setReport('closed');
		expect(await deliverable()).toBe(false);
		expect(await send()).toContain('notify.send: no longer relevant, dropped');
		await setReport('reunited');
		expect(await deliverable()).toBe(false);
		await setReport('matched');
		expect(await deliverable()).toBe(true);
		await AlertsDao.upsertSubscription(user, { center: P, radius_km: 1, species: ['cat'], paused: false });
		expect(await deliverable()).toBe(false);
		await AlertsDao.upsertSubscription(user, { center: P, radius_km: 1, species: [], paused: false });
		expect(await deliverable()).toBe(false);
		await AlertsDao.upsertSubscription(user, { center: P, radius_km: 1, species: ['dog'], paused: true });
		expect(await deliverable()).toBe(false);
		await prisma.alert_subscriptions.deleteMany({ where: { user_id: user } });
		expect(await deliverable()).toBe(false);
	});

	it('notify.send delivers the fan-out alert in the recipient locale and keeps the single alert_deliveries row', async () => {
		const user = await subscribe(at(P, 300, 0));
		await prisma.profiles.update({ where: { id: user }, data: { locale: 'en' } });
		await prisma.push_tokens.create({
			data: { user_id: user, token: `ExponentPushToken[${randomUUID()}]`, platform: 'ios' },
		});
		const id = await report({ species: 'cat' });
		// TASK-22.8: the first published photo's public thumb; a stale URL on an unpublished photo never leaks.
		const thumb = `https://media.test/r/${id}/${randomUUID()}/thumb.webp`;
		await photos(id, [
			{ status: 'unpublished', thumb: `https://media.test/r/${id}/stale/thumb.webp` },
			{ status: 'accepted', thumb: null },
			{ status: 'published', thumb },
			{ status: 'published', thumb: `https://media.test/r/${id}/later/thumb.webp` },
		]);
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		const [input] = (await queued(id)).filter((data) => data.user_id === user);
		const push = mockPush();
		const ctx = { ...jobCtx(), adapters: { ...adapters, push } };
		await notifySendJob(input, ctx);
		await notifySendJob(input, ctx);

		const rows = await prisma.notifications.findMany({ where: { user_id: user } });
		expect(rows).toHaveLength(1);
		expect(Object.keys(rows[0]!.payload as object).sort()).toEqual(
			[
				'distance_band',
				'has_area',
				'report_code',
				'reported_at',
				'species',
				'thumb_url',
				...((rows[0]!.payload as { area_name?: string }).area_name ? ['area_name'] : []),
			].sort()
		);
		expect((rows[0]!.payload as { thumb_url: string }).thumb_url).toBe(thumb);
		const actor: Actor = {
			user_id: user,
			role: 'USER',
			is_anonymous: false,
			aal: 'aal1',
			email_verified: true,
			locale: 'en',
		};
		const listed = await NotificationsDomain.listNotifications({}, userCtx(actor));
		expect(listed.items.map((item) => item.payload)).toEqual([expect.objectContaining({ thumb_url: thumb })]);
		expect(push.sent).toHaveLength(1);
		expect(push.sent![0]!.title).toBe('Lost cat near you');
		expect(push.sent![0]!.body).toContain('Have you seen it?');
		expect(await prisma.alert_deliveries.findMany({ where: { user_id: user } })).toEqual([
			expect.objectContaining({ report_id: id, channel: 'push' }),
		]);
	});

	it('stores thumb_url null for a report without a published photo (TASK-22.8)', async () => {
		const user = await subscribe(at(P, 300, 0));
		const id = await report();
		await photos(id, [{ status: 'accepted', thumb: null }]);
		await AlertsDomain.fanout({ report_id: id }, systemCtx());
		const [input] = (await queued(id)).filter((data) => data.user_id === user);
		await notifySendJob(input, jobCtx());
		const rows = await prisma.notifications.findMany({ where: { user_id: user } });
		expect(rows.map((row) => row.payload)).toEqual([expect.objectContaining({ thumb_url: null })]);
	});
});

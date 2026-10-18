// Matching engine v1 (C8) against the local database: chip pairs, candidate rules, score threshold and top N,
// idempotent suggestions, first_match_at and the managers' notifications. Each test's reports sit in their own 70-day
// slot in the 19th century and carry random chips, so seed data, other tests and other runs never become candidates.
import { randomInt, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { scoreMatch } from '@zivali/validation/matching';

import { adapters } from '../../adapters/index.ts';
import { mockEmail } from '../../adapters/email/mock.ts';
import { mockPush } from '../../adapters/push/mock.ts';
import { MatchingDomain } from '../../domains/matching/index.ts';
import { NotificationsDomain } from '../../domains/notifications/index.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import { runJob } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { drain, jobs, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

const actor = (): Actor => ({
	user_id: randomUUID(),
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
});
const owner = actor();
const coOwner = actor();
const finder = actor();
const users = [owner, coOwner, finder];

// Prešernov trg, Ljubljana; 0.009° of latitude ≈ 1 km.
const LJ = { lat: 46.0514, lng: 14.5061 };
const north = (km: number) => ({ lat: LJ.lat + km * 0.009, lng: LJ.lng });
const HOUR = 3600_000;
// Wider than the 30-day window plus the 60-day chip case; consecutive per file, random per run.
let slot = randomInt(0, 900);
const month = () => new Date(Date.UTC(1800, 0, 1) + slot++ * 70 * 24 * HOUR);
const chip = () => `941${String(randomInt(0, 1e12)).padStart(12, '0')}`;

const lostReport = (at: Date, overrides: Partial<NewReport> = {}) =>
	ReportsDomain.insertReport(
		{
			type: 'lost',
			species: 'dog',
			name: 'Piki',
			sex: 'female',
			size: 'm',
			colours: ['black', 'white'],
			pattern: 'bicolour',
			location: LJ,
			event_at: at,
			...overrides,
		},
		userCtx(owner)
	);
const foundReport = (at: Date, overrides: Partial<NewReport> = {}) =>
	ReportsDomain.insertReport(
		{
			type: 'found',
			species: 'dog',
			sex: 'female',
			size: 'm',
			colours: ['black', 'white'],
			pattern: 'bicolour',
			location: north(1),
			event_at: new Date(at.getTime() + 6 * HOUR),
			...overrides,
		},
		userCtx(finder)
	);

const run = (report_id: string) => MatchingDomain.matchReport({ report_id }, systemCtx());
const matchesOf = (lost_report_id: string) =>
	prisma.matches.findMany({ where: { lost_report_id }, orderBy: { score: 'desc' } });
type Job = { user_id: string; type: string; payload: Record<string, unknown>; dedupe_key: string };
const notifications = async (match_id: string) =>
	(
		await prisma.$queryRaw<{ data: Job }[]>`
			select data from pgboss.job where name = 'notify.send' and data->'payload'->>'match_id' = ${match_id}`
	).map((row) => row.data);
const setConfig = async (key: string, value: number) => {
	await prisma.app_config.upsert({ where: { key }, create: { key, value }, update: { value } });
	configStore.invalidate();
};

beforeAll(async () => {
	await startJobs();
	await prisma.profiles.createMany({ data: users.map(({ user_id }) => ({ id: user_id })) });
});

afterAll(async () => {
	const reports = await prisma.reports.findMany({
		where: { created_by: { in: users.map((user) => user.user_id) } },
		select: { id: true },
	});
	const ids = reports.map((report) => report.id);
	await prisma.matches.deleteMany({ where: { lost_report_id: { in: ids } } });
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'user_id' = any(${users.map((user) => user.user_id)})`;
	await prisma.reports.deleteMany({ where: { id: { in: ids } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users.map((user) => user.user_id) } } });
});

describe('chip (AC#2)', () => {
	it('pairs equal chips anywhere and any time as 1.000 strong, notifies match_chip at once, records first_match_at', async () => {
		const at = month();
		const number = chip();
		const lost = await lostReport(at, { chip: number });
		await prisma.report_managers.create({ data: { report_id: lost.id, user_id: coOwner.user_id, role: 'owner' } });
		// 120 km away, 60 days later, another sex: only the chip matches.
		const found = await foundReport(new Date(at.getTime() + 60 * 24 * HOUR), {
			chip: number.replace(/(\d{3})/g, '$1 '),
			location: north(120),
			sex: 'male',
		});

		expect(await run(found.id)).toEqual({ stored: 1 });
		const [match] = await matchesOf(lost.id);
		expect(match).toMatchObject({
			other_report_id: found.id,
			strength: 'strong',
			chip_match: true,
			state: 'suggested',
		});
		expect(match!.score.toNumber()).toBe(1);
		expect(match!.reasons).toContainEqual({ code: 'chip' });
		expect(match!.notified_at).not.toBeNull();

		const sent = await notifications(match!.id);
		expect(sent.map((job) => job.user_id).sort()).toEqual([owner.user_id, coOwner.user_id].sort());
		for (const job of sent) {
			expect(job).toMatchObject({ type: 'match_chip', dedupe_key: `match:${match!.id}` });
			// Ids only: no contact data, chip number or location of either side.
			expect(job.payload).toEqual({ template: 'match_chip', match_id: match!.id, report_id: lost.id });
		}

		const reports = await prisma.reports.findMany({
			where: { id: { in: [lost.id, found.id] } },
			select: { id: true, first_match_at: true },
		});
		expect(reports.find((report) => report.id === lost.id)!.first_match_at).not.toBeNull();
		// The finder must not learn that a suggestion exists before the owner confirms it.
		expect(reports.find((report) => report.id === found.id)!.first_match_at).toBeNull();
	});

	it('gives a chip on a sighting the chip_sighting reason', async () => {
		const at = month();
		const number = chip();
		const lost = await lostReport(at, { chip: number });
		await foundReport(at, { type: 'sighted', chip: number });
		await run(lost.id);
		const [match] = await matchesOf(lost.id);
		expect(match).toMatchObject({ chip_match: true, strength: 'strong' });
		expect(match!.reasons).toContainEqual({ code: 'chip_sighting' });
	});

	it('ignores invalid chips', async () => {
		const at = month();
		const lost = await lostReport(at, { chip: '12345678', location: north(200) });
		await foundReport(at, { chip: '12345678', location: north(-200) });
		expect(await run(lost.id)).toEqual({ stored: 0 });
	});
});

describe('candidates without a chip (AC#3)', () => {
	it('keeps the same species within 30 km and the time window, without a sex conflict', async () => {
		const at = month();
		const lost = await lostReport(at);
		const later = (hours: number) => new Date(at.getTime() + hours * HOUR);
		const keep = await Promise.all([
			foundReport(at),
			foundReport(at, { sex: 'unknown' }),
			foundReport(at, { sex: null }),
			foundReport(at, { type: 'sighted', event_at: later(-11) }),
			foundReport(at, { event_at: later(29 * 24) }),
		]);
		const drop = await Promise.all([
			foundReport(at, { species: 'cat' }),
			foundReport(at, { sex: 'male' }),
			foundReport(at, { location: north(31) }),
			foundReport(at, { event_at: later(-13) }),
			foundReport(at, { event_at: later(31 * 24) }),
			lostReport(at, { location: north(1) }),
		]);
		const config = await MatchingDomain.matchingConfig();

		await run(lost.id);
		const stored = await matchesOf(lost.id);
		const ids = stored.map((match) => match.other_report_id);
		for (const { id } of drop) expect(ids).not.toContain(id);
		for (const { id } of keep) expect(ids).toContain(id);
		for (const match of stored) {
			expect(match.score.toNumber()).toBeGreaterThanOrEqual(config.threshold);
			expect(match.chip_match).toBe(false);
			// Bands only: no exact distance or time anywhere in the reasons.
			const reasons = match.reasons as Record<string, unknown>[];
			expect(reasons).toContainEqual({ code: 'distance', band: expect.stringMatching(/^(lt1|1to3)$/) });
			expect(Object.keys(reasons.find((reason) => reason.code === 'time')!)).toEqual(['code', 'hours_band']);
			for (const reason of reasons) expect(Object.keys(reason)).not.toContain('distance_km');
		}
	});

	it('leaves out held, hidden and closed reports but keeps one held for an organisation', async () => {
		const at = month();
		const lost = await lostReport(at);
		const [held, hidden, closed, orgHeld] = await Promise.all([
			foundReport(at),
			foundReport(at),
			foundReport(at),
			foundReport(at, { source: 'organisation' }),
		]);
		await prisma.reports.update({ where: { id: held.id }, data: { moderation_state: 'held' } });
		await prisma.reports.update({ where: { id: hidden.id }, data: { moderation_state: 'hidden' } });
		await prisma.reports.update({ where: { id: closed.id }, data: { status: 'closed' } });
		await prisma.reports.update({ where: { id: orgHeld.id }, data: { moderation_state: 'held' } });
		await run(lost.id);
		expect((await matchesOf(lost.id)).map((match) => match.other_report_id)).toEqual([orgHeld.id]);
	});

	it('stores the scoreMatch result of the pair, below the threshold nothing', async () => {
		const at = month();
		const lost = await lostReport(at);
		// The same animal the same day 2 km away, and 25 km away 25 days later (about 0.43, below the 0.5 threshold).
		const near = await foundReport(at, { location: north(2) });
		await foundReport(at, { location: north(25), event_at: new Date(at.getTime() + 25 * 24 * HOUR) });
		await run(lost.id);
		const stored = await matchesOf(lost.id);
		expect(stored.map((match) => match.other_report_id)).toEqual([near.id]);
		const [{ distance_km }] = await prisma.$queryRaw<{ distance_km: number }[]>`
			select extensions.st_distance(l.exact_point, o.public_point) / 1000 as distance_km
			from app.reports l, app.reports o where l.id = ${lost.id}::uuid and o.id = ${near.id}::uuid`;
		const same = { size: 'm', sex: 'female', colours: ['black', 'white'], pattern: 'bicolour' } as const;
		const expected = scoreMatch(
			{
				chip_match: false,
				other_type: 'found',
				distance_km,
				delta_hours: 6,
				lost: { ...same, colours: [...same.colours] },
				other: { ...same, colours: [...same.colours] },
			},
			await MatchingDomain.matchingConfig()
		)!;
		expect(stored[0]!.score.toNumber()).toBe(expected.score);
		expect(stored[0]).toMatchObject({ strength: expected.strength, reasons: expected.reasons });
	});

	it('measures distance from the found report public point, never its exact point', async () => {
		const at = month();
		const lost = await lostReport(at);
		const [far, beyond] = await Promise.all([
			foundReport(at, { location: north(0.2) }),
			foundReport(at, { location: north(0.2) }),
		]);
		// Exact points stay ~200 m away; only the public points are moved.
		const movePublic = (id: string, km: number) => prisma.$executeRaw`
			update app.reports set public_point = extensions.st_setsrid(extensions.st_makepoint(${LJ.lng}, ${north(km).lat}), 4326)
			where id = ${id}::uuid`;
		await movePublic(far.id, 12);
		await movePublic(beyond.id, 45);
		await run(lost.id);
		const stored = await matchesOf(lost.id);
		// 45 km public point is past matching.max_distance_km (30) although the exact point is close.
		expect(stored.map((match) => match.other_report_id)).toEqual([far.id]);
		const reasons = stored[0]!.reasons as Record<string, unknown>[];
		expect(reasons).toContainEqual({ code: 'distance', band: 'gt10' });
		expect(reasons).not.toContainEqual({ code: 'distance', band: 'lt1' });
	});

	it('keeps the top N per lost report, counting the suggestions it already has', async () => {
		await setConfig('matching.top_n', 2);
		try {
			const at = month();
			const lost = await lostReport(at);
			const [a, b] = await Promise.all([1, 3, 6].map((km) => foundReport(at, { location: north(km) })));
			await run(lost.id);
			expect((await matchesOf(lost.id)).map((match) => match.other_report_id)).toEqual([a!.id, b!.id]);

			// A new found report from the other direction: worse than both → left out; better than one → added.
			const worse = await foundReport(at, { location: north(8) });
			expect(await run(worse.id)).toEqual({ stored: 0 });
			const better = await foundReport(at, { location: north(0.2) });
			expect(await run(better.id)).toEqual({ stored: 1 });
			expect((await matchesOf(lost.id))[0]!.other_report_id).toBe(better.id);
		} finally {
			await setConfig('matching.top_n', 10);
		}
	});
});

describe('evidence and the re-score of old suggestions (TASK-114.22)', () => {
	const nothing = { sex: null, size: null, colours: [], pattern: null } satisfies Partial<NewReport>;
	// Both points exactly km north of LJ, so the scores below are exact (the public circle centre is fuzzed).
	const pin = (id: string, km: number) => prisma.$executeRaw`
		update app.reports set exact_point = extensions.st_setsrid(extensions.st_makepoint(${LJ.lng}, ${north(km).lat}), 4326),
			public_point = extensions.st_setsrid(extensions.st_makepoint(${LJ.lng}, ${north(km).lat}), 4326)
		where id = ${id}::uuid`;

	it('suggests nothing without an attribute known on both sides or with a contradiction; a chip still matches (AC#1, AC#2)', async () => {
		const at = month();
		const number = chip();
		// The owner's screenshot: a lost grey large male cat, a cat sighted about 4 km away with nothing known.
		const cat = {
			species: 'cat',
			sex: 'male',
			size: 'l',
			colours: ['grey'],
			pattern: null,
		} satisfies Partial<NewReport>;
		const lost = await lostReport(at, { ...cat, chip: number });
		await foundReport(at, { type: 'sighted', species: 'cat', location: north(4), ...nothing });
		await foundReport(at, { ...cat, size: 's' }); // two sizes apart
		await foundReport(at, { ...cat, colours: ['black', 'white'] }); // no shared colour
		const chipped = await foundReport(at, { ...cat, chip: number, size: 'xs', colours: ['golden'] });
		expect(await run(lost.id)).toEqual({ stored: 1 });
		expect(await matchesOf(lost.id)).toEqual([
			expect.objectContaining({ other_report_id: chipped.id, chip_match: true, strength: 'strong' }),
		]);
	});

	it('drops a suggestion once an edit adds a contradiction or takes the evidence away, without notifying', async () => {
		const at = month();
		const lost = await lostReport(at);
		// Both possible, so neither is notified: the same look 10 km away (about 0.61), the colour only (about 0.58).
		const lookalike = await foundReport(at, { location: north(10) });
		const colourOnly = await foundReport(at, { ...nothing, colours: ['black', 'white'] });
		await run(lost.id);
		const matches = await matchesOf(lost.id);
		expect(matches.map((match) => [match.other_report_id, match.strength]).sort()).toEqual(
			[
				[lookalike.id, 'possible'],
				[colourOnly.id, 'possible'],
			].sort()
		);

		// The finders correct their reports; match.report runs for the edited report, as after PATCH /v1/reports.
		await prisma.reports.update({ where: { id: lookalike.id }, data: { colours: ['golden'] } });
		await run(lookalike.id);
		await prisma.reports.update({ where: { id: colourOnly.id }, data: { colours: [] } });
		await run(colourOnly.id);
		expect(await matchesOf(lost.id)).toEqual([]);
		for (const match of matches) expect(await notifications(match.id)).toEqual([]);
	});

	it('re-scores the rows of older algorithm versions once: drops the failing ones, inserts and notifies nothing (AC#4)', async () => {
		const at = month();
		const lost = await lostReport(at);
		const others = {
			nothingKnown: await foundReport(at, nothing),
			colourOnly: await foundReport(at, { ...nothing, colours: ['black', 'white'] }),
			twoSizesApart: await foundReport(at, { size: 'xl' }),
			sexNotGiven: await foundReport(at, { sex: null }),
			same: await foundReport(at),
			current: await foundReport(at),
			rejected: await foundReport(at, nothing),
			chip: await foundReport(at, nothing),
		};
		const km = { colourOnly: 3, nothingKnown: 3, chip: 2 } as Record<string, number>;
		await pin(lost.id, 0);
		for (const [name, report] of Object.entries(others)) await pin(report.id, km[name] ?? 1);
		// Rows as the v1 engine stored them, when every unknown attribute counted 0.5 (algo_version defaults to v1), and
		// one of today's version with a score the engine would not give now: the one-off leaves it alone.
		const old = (
			name: keyof typeof others,
			data: {
				score: number;
				strength: string;
				state?: 'rejected';
				chip_match?: boolean;
				notified_at?: Date;
				algo_version?: string;
			}
		) =>
			prisma.matches.create({
				data: {
					lost_report_id: lost.id,
					other_report_id: others[name].id,
					chip_match: false,
					reasons: [{ code: 'distance', band: '1to3' }],
					...data,
				},
			});
		const before = {
			nothingKnown: await old('nothingKnown', { score: 0.545, strength: 'possible' }),
			colourOnly: await old('colourOnly', { score: 0.595, strength: 'possible' }),
			twoSizesApart: await old('twoSizesApart', { score: 0.785, strength: 'good', notified_at: at }),
			sexNotGiven: await old('sexNotGiven', { score: 0.835, strength: 'strong', notified_at: at }),
			same: await old('same', { score: 0.885, strength: 'strong', notified_at: at }),
			current: await old('current', { score: 0.5, strength: 'possible', algo_version: 'v2', notified_at: at }),
			rejected: await old('rejected', { score: 0.685, strength: 'good', state: 'rejected' }),
			chip: await old('chip', { score: 1, strength: 'strong', chip_match: true, notified_at: at }),
		};

		const rescoreOlder = () => MatchingDomain.rescoreSuggestions({}, systemCtx());
		await rescoreOlder();
		// sexNotGiven: 0.4·e^(−1/3) + 0.2·(1 − 6/720) + 0.4·3/4, sex not known on both sides
		const rows = await matchesOf(lost.id);
		expect(rows.map((row) => [row.id, row.state, row.strength, row.score.toNumber(), row.algo_version])).toEqual([
			[before.chip.id, 'suggested', 'strong', 1, 'v1'],
			[before.same.id, 'suggested', 'strong', 0.885, 'v2'],
			[before.sexNotGiven.id, 'suggested', 'good', 0.785, 'v2'],
			[before.rejected.id, 'rejected', 'good', 0.685, 'v1'],
			[before.current.id, 'suggested', 'possible', 0.5, 'v2'],
		]);
		const sexNotGiven = rows.find((row) => row.id === before.sexNotGiven.id)!;
		expect(sexNotGiven.notified_at).toEqual(at);
		expect(sexNotGiven.reasons).toContainEqual({ code: 'size', match: 'equal' });
		// One-off: nothing older is left, so a rerun (the next deploy) changes nothing.
		expect(await rescoreOlder()).toEqual({ rescored: 0, removed: 0 });
		// The engine does not bring the removed pairs back.
		await run(lost.id);
		expect((await matchesOf(lost.id)).map((row) => row.id).sort()).toEqual(rows.map((row) => row.id).sort());
		for (const match of Object.values(before)) expect(await notifications(match.id)).toEqual([]);
	});
});

describe('idempotent suggestions and notifications (AC#1, AC#5)', () => {
	it('stores a pair once, notifies once, and never resurrects a rejected pair', async () => {
		const at = month();
		const lost = await lostReport(at);
		await foundReport(at);
		await run(lost.id);
		await run(lost.id);
		const [match, ...rest] = await matchesOf(lost.id);
		expect(rest).toEqual([]);
		expect(['good', 'strong']).toContain(match!.strength);

		const sent = await notifications(match!.id);
		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({
			user_id: owner.user_id,
			type: 'match_suggested',
			dedupe_key: `match:${match!.id}`,
		});
		expect(sent[0]!.payload).toEqual({ template: 'match_suggested', match_id: match!.id, report_id: lost.id });

		await prisma.matches.update({ where: { id: match!.id }, data: { state: 'rejected', score: 0.123 } });
		expect(await run(lost.id)).toEqual({ stored: 0 });
		const [after] = await matchesOf(lost.id);
		expect(after).toMatchObject({ id: match!.id, state: 'rejected' });
		expect(after!.score.toNumber()).toBe(0.123);
		expect(await notifications(match!.id)).toHaveLength(1);
	});

	it('does not notify a possible suggestion', async () => {
		const at = month();
		const lost = await lostReport(at);
		// The same animal 10 km away: about 0.61, above the threshold and below good (0.65).
		await foundReport(at, { location: north(10) });
		await run(lost.id);
		const [match] = await matchesOf(lost.id);
		expect(match).toMatchObject({ strength: 'possible', notified_at: null });
		expect(await notifications(match!.id)).toEqual([]);
	});

	it('runs from a queued match.report job well within 2 minutes; drops a malformed payload', async () => {
		const at = month();
		const lost = await lostReport(at);
		const found = await foundReport(at);
		const started = Date.now();
		await jobs.send('match.report', { report_id: found.id });
		await jobs.send('match.report', { report: 'nope' });
		await drain(runJob);
		expect(Date.now() - started).toBeLessThan(120_000);
		expect((await matchesOf(lost.id)).map((match) => match.other_report_id)).toEqual([found.id]);
		const failed = await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from pgboss.job where name = 'match.report' and state = 'failed'
				and data->>'report' = 'nope'`;
		expect(failed[0]!.count).toBe(0);
	});
});

describe('match notifications delivered (TASK-104)', () => {
	it('match.report -> notify.send gives each lost-report manager one inbox row and one push in their locale, the finder nothing', async () => {
		const at = month();
		const number = chip();
		const lost = await lostReport(at, { chip: number });
		await prisma.report_managers.create({ data: { report_id: lost.id, user_id: coOwner.user_id, role: 'owner' } });
		const found = await foundReport(new Date(at.getTime() + HOUR), { chip: number });
		await prisma.profiles.update({ where: { id: coOwner.user_id }, data: { locale: 'en' } });
		const tokens = [owner, coOwner, finder].map(({ user_id }) => ({
			user_id,
			token: `ExponentPushToken[${randomUUID()}]`,
			platform: 'ios',
		}));
		await prisma.push_tokens.createMany({ data: tokens });

		await run(found.id);
		const [match] = await matchesOf(lost.id);
		const push = mockPush();
		const ctx = systemCtx({ adapters: { ...adapters, push, email: mockEmail() } });
		for (const job of await notifications(match!.id)) await NotificationsDomain.deliver(job as never, ctx);

		for (const user of [owner, coOwner]) {
			const rows = await prisma.notifications.findMany({ where: { user_id: user.user_id } });
			expect(rows.filter((row) => (row.payload as { match_id?: string }).match_id === match!.id)).toHaveLength(1);
		}
		expect(await prisma.notifications.count({ where: { user_id: finder.user_id, type: 'match_chip' } })).toBe(0);
		const to = (user_id: string) => tokens.find((t) => t.user_id === user_id)!.token;
		expect(push.sent!.map((m) => m.to).sort()).toEqual([to(owner.user_id), to(coOwner.user_id)].sort());
		expect(push.sent!.find((m) => m.to === to(owner.user_id))!.title).toBe('Številka čipa se ujema · Piki');
		expect(push.sent!.find((m) => m.to === to(coOwner.user_id))!.title).toBe('Chip number matches · Piki');
		expect(JSON.stringify(push.sent)).not.toContain(number);

		// A rejected match is moot: dropped, nothing more delivered.
		await prisma.matches.update({ where: { id: match!.id }, data: { state: 'rejected' } });
		const again = mockPush();
		await NotificationsDomain.deliver(
			{
				user_id: owner.user_id,
				type: 'match_chip',
				payload: { template: 'match_chip', match_id: match!.id, report_id: lost.id },
				dedupe_key: randomUUID(),
			} as never,
			systemCtx({ adapters: { ...adapters, push: again, email: mockEmail() } })
		);
		expect(again.sent).toEqual([]);
	});
});

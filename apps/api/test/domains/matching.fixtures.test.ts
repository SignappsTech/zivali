// Matching fixture suite (TASK-19.2, R-010; evidence rule TASK-114.22): 42 synthetic lost ↔ found/sighted pairs, labelled by hand with the
// inclusion, rank and strength the C8 defaults must give, run through the real engine on the local database (no
// cloud services). It prints a table of every pair, so a threshold or weight change shows its effect at once: change
// app_config `matching.*`, rerun, relabel. Points are pinned after insert, so distances are exact and runs repeat.
// Each group has its own 70-day slot before 1800 and chips of its own (705098100… test range), and each run its own
// meridian, so seed data, other test files, other groups and leftovers of a killed run never become candidates.
import { randomInt, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { MatchStrength } from '@zivali/types';

import { MatchingDomain, MatchReviewDomain } from '../../domains/matching/index.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { startJobs } from '../../lib/jobs.ts';
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
const finder = actor();
const users = [owner, finder];

const HOUR = 3600_000;
const DAY = 24;
// Ljubljana's latitude (one degree is 111.15 km here, WGS84) on a meridian per run, 0.5° (39 km) apart: beyond
// matching.max_distance_km, and every fixture lies due north of the origin.
const ORIGIN = { lat: 46.0514, lng: 14.5061 + randomInt(0, 50) / 2 };
const north = (km: number) => ({ lat: ORIGIN.lat + km / 111.15, lng: ORIGIN.lng });
const chipBase = randomInt(100_000, 999_000);
const CHIP_A = `705098100${chipBase}`;
const CHIP_B = `705098100${chipBase + 1}`;
const CHIP_C = `705098100${chipBase + 2}`;

type Other = Partial<NewReport> & { km: number; hours: number };
/** expect: the strength the pair must get, or null when it must not be suggested. */
type Fixture = { name: string; other: Other; expect: MatchStrength | null };
/** Included fixtures are listed in their expected rank order (best first), excluded ones after them. */
type Group = { name: string; lost?: Partial<NewReport>; fixtures: Fixture[] };

// The lost dog every group starts from (overridden per group); the other side defaults to the same animal, found
// 6 h later. Scores in the comments are the C8 defaults: 0.4·exp(−km/3) + 0.2·(1 − Δh/720) + 0.4·A, A the summed
// similarity of the attributes known on both sides / 4; without a chip a contradiction or no evidence is no suggestion.
const LOST: Partial<NewReport> = { sex: 'female', size: 'm', colours: ['black', 'white'], pattern: 'bicolour' };
const NONE = { sex: null, size: null, colours: [], pattern: null } satisfies Partial<NewReport>;
const SIGHTED_CAT = { type: 'sighted', species: 'cat', ...NONE } satisfies Partial<NewReport>;
const fx = (name: string, other: Partial<Other>, strength: MatchStrength | null): Fixture => ({
	name,
	other: { km: 1, hours: 6, ...other },
	expect: strength,
});

const GROUPS: Group[] = [
	{
		name: 'chip',
		lost: { chip: CHIP_A },
		fixtures: [
			// The chip wins over everything: 120 km, 60 days and a sex conflict.
			fx('chip-far-late-male', { chip: CHIP_A, km: 120, hours: 60 * DAY, sex: 'male' }, 'strong'), // 1.000
			fx('no-chip-near', { km: 0.5 }, 'strong'), // 0.937
			fx('invalid-chip', { chip: '1234-5678', km: 3 }, 'good'), // 0.745, scored without the chip
		],
	},
	{
		name: 'chip-sighting',
		lost: { chip: CHIP_B },
		fixtures: [
			fx('sighted-chip-far', { type: 'sighted', chip: CHIP_B, km: 45, hours: 2 * DAY }, 'strong'), // 1.000
			fx('other-lost-near', { type: 'lost', km: 0.5 }, null), // same side never pairs
		],
	},
	{
		name: 'distance',
		fixtures: [
			fx('0.2km', { km: 0.2 }, 'strong'), // 0.973
			fx('1km', { km: 1 }, 'strong'), // 0.885
			fx('3km', { km: 3 }, 'good'), // 0.745
			fx('5km', { km: 5 }, 'good'), // 0.674
			fx('10km', { km: 10 }, 'possible'), // 0.613
			fx('29km', { km: 29 }, 'possible'), // 0.598
			fx('31km', { km: 31 }, null), // beyond matching.max_distance_km
		],
	},
	{
		name: 'time',
		fixtures: [
			fx('seen-11h-before', { hours: -11 }, 'strong'), // 0.887, inside the 12 h grace
			fx('3d-later', { hours: 3 * DAY }, 'strong'), // 0.867
			fx('20d-later', { hours: 20 * DAY }, 'good'), // 0.753
			fx('29d-later', { hours: 29 * DAY }, 'good'), // 0.693
			fx('seen-13h-before', { hours: -13 }, null), // before the window
			fx('31d-later', { hours: 31 * DAY }, null), // beyond matching.max_days
		],
	},
	{
		name: 'species-sex',
		fixtures: [
			fx('sex-not-given', { km: 0.5, sex: null }, 'strong'), // 0.837
			fx('sex-unknown', { sex: 'unknown' }, 'good'), // 0.785
			fx('same-sex-3km', { km: 3 }, 'good'), // 0.745
			fx('cat', { species: 'cat' }, null), // species mismatch
			fx('male', { sex: 'male' }, null), // sex conflict
		],
	},
	{
		name: 'colour',
		fixtures: [
			fx('same-colours', {}, 'strong'), // 0.885, overlap 1
			fx('one-extra-colour', { colours: ['black', 'white', 'tan'] }, 'strong'), // 0.852, overlap 0.67
			fx('one-of-two', { colours: ['black'] }, 'strong'), // 0.835, overlap 0.5
			fx('one-shared-of-three', { colours: ['white', 'grey'] }, 'strong'), // 0.818, overlap 0.33
			fx('no-shared-colour', { colours: ['grey', 'brown'] }, null), // contradiction
			fx('other-colour-and-pattern', { colours: ['golden'], pattern: 'solid' }, null), // contradiction
		],
	},
	{
		name: 'size',
		fixtures: [
			fx('adjacent-size', { size: 'l' }, 'strong'), // 0.835
			fx('two-sizes-apart', { size: 'xl' }, null), // contradiction
			fx('nothing-known', NONE, null), // no evidence (0.685 good while unknowns counted 0.5)
			fx('nothing-shared', { size: 'xs', colours: ['golden'], pattern: 'solid' }, null), // contradiction
			fx('nothing-shared-3km', { km: 3, size: 'xs', colours: ['golden'], pattern: 'solid' }, null), // contradiction
		],
	},
	{
		// The owner's screenshot (TASK-114.22): a lost grey large male cat against cat sightings that know little.
		name: 'evidence',
		lost: { species: 'cat', sex: 'male', size: 'l', colours: ['grey'], pattern: null, chip: CHIP_C },
		fixtures: [
			fx('chip-nothing-known-25km', { ...SIGHTED_CAT, chip: CHIP_C, km: 25 }, 'strong'), // 1.000
			fx('colour-size-3km', { ...SIGHTED_CAT, colours: ['grey'], size: 'l', km: 3 }, 'possible'), // 0.545
			fx('colour-only-2km', { ...SIGHTED_CAT, colours: ['grey'], km: 2 }, 'possible'), // 0.504
			fx('colour-only-3km', { ...SIGHTED_CAT, colours: ['grey'], km: 3 }, null), // 0.445
			fx('other-colour-1km', { ...SIGHTED_CAT, sex: 'male', size: 'l', colours: ['black'], km: 1 }, null), // contradiction
			fx('nothing-known-4km', { ...SIGHTED_CAT, km: 4 }, null), // no evidence (0.51 while unknowns counted 0.5)
		],
	},
	{
		name: 'rejected',
		fixtures: [
			fx('rejected-near', { km: 0.5 }, 'strong'), // 0.937, rejected by the owner after the first run
			fx('kept-3km', { km: 3 }, 'good'), // 0.745
		],
	},
];
const REJECTED = 'rejected-near';

type Created = { group: Group; lostId: string; others: Map<string, Fixture> };
const created: Created[] = [];
// About 45 inserts and as many engine runs: well under 30 s alone, more when many worktrees share the database.
const SLOW = 180_000;

// Both points pinned to the requested place: the engine measures lost.exact_point → other.public_point.
const pin = (id: string, km: number) => {
	const { lat, lng } = north(km);
	return prisma.$executeRaw`
		update app.reports set exact_point = extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326),
			public_point = extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)
		where id = ${id}::uuid`;
};

async function createGroup(group: Group, slot: number): Promise<Created> {
	const at = new Date(Date.UTC(1600, 0, 1) + slot * 70 * DAY * HOUR);
	const lost = await ReportsDomain.insertReport(
		{ type: 'lost', species: 'dog', name: 'Testni', location: ORIGIN, event_at: at, ...LOST, ...group.lost },
		userCtx(owner)
	);
	await pin(lost.id, 0);
	const others = new Map<string, Fixture>();
	for (const fixture of group.fixtures) {
		const { km, hours, ...report } = fixture.other;
		const other = await ReportsDomain.insertReport(
			{
				type: 'found',
				species: 'dog',
				...LOST,
				location: north(km),
				event_at: new Date(at.getTime() + hours * HOUR),
				...report,
			},
			userCtx(report.type === 'lost' ? owner : finder)
		);
		await pin(other.id, km);
		others.set(other.id, fixture);
	}
	return { group, lostId: lost.id, others };
}

/** match.report for each lost report, or with `both` for every report of the suite (the reverse direction too). */
async function runAll(both = false): Promise<void> {
	for (const { lostId, others } of created) {
		for (const report_id of [lostId, ...(both ? others.keys() : [])])
			await MatchingDomain.matchReport({ report_id }, systemCtx());
	}
}

const suggested = (lost_report_id: string) =>
	prisma.matches.findMany({
		where: { lost_report_id, state: 'suggested' },
		orderBy: [{ score: 'desc' }, { created_at: 'asc' }],
	});

/** The group's stored suggestions, best first, by fixture name (an id outside the group would show as unknown). */
async function ranked({ lostId, others }: Created) {
	return (await suggested(lostId)).map((match) => ({
		name: others.get(match.other_report_id)?.name ?? `unknown:${match.other_report_id}`,
		strength: match.strength,
		score: match.score.toNumber(),
	}));
}

const labelled = ({ group }: Created, skip: string[] = []) =>
	group.fixtures
		.filter((fixture) => fixture.expect && !skip.includes(fixture.name))
		.map((fixture) => ({ name: fixture.name, strength: fixture.expect, score: expect.any(Number) }));

async function printTable(): Promise<void> {
	const config = await MatchingDomain.matchingConfig();
	const w = config.weights;
	const head = ['group', 'fixture', 'km', 'Δh', 'expected', 'got', 'score', 'rank'];
	const rows: string[][] = [];
	for (const entry of created) {
		const stored = await ranked(entry);
		for (const fixture of entry.group.fixtures) {
			const rank = stored.findIndex((match) => match.name === fixture.name);
			const match = stored[rank];
			rows.push([
				entry.group.name,
				fixture.name,
				String(fixture.other.km),
				String(fixture.other.hours),
				fixture.expect ?? '-',
				match?.strength ?? '-',
				match ? match.score.toFixed(3) : '-',
				match ? String(rank + 1) : '-',
			]);
		}
	}
	const widths = head.map((title, i) => Math.max(title.length, ...rows.map((row) => row[i]!.length)));
	const line = (cells: string[]) =>
		cells
			.map((cell, i) => cell.padEnd(widths[i]!))
			.join('  ')
			.trimEnd();
	const settings =
		`threshold ${config.threshold} · weights D ${w.distance} T ${w.time} A ${w.attributes} · ` +
		`distance_scale ${config.distance_scale_km} km · max ${config.max_distance_km} km / ${config.max_days} d · ` +
		`top_n ${config.top_n}`;
	const table = [`Matching fixtures: ${rows.length} pairs; ${settings}`, line(head), ...rows.map(line)];
	process.stdout.write(`\n${table.join('\n')}\n\n`);
}

beforeAll(async () => {
	await startJobs();
	await prisma.profiles.createMany({ data: users.map(({ user_id }) => ({ id: user_id })) });
	// One group at a time: the Prisma pool is small and the local database is shared with other worktrees.
	// 1,000 slots of 70 days from 1600 stay before the 1800s the engine test uses.
	const first = randomInt(0, 1000);
	for (const [i, group] of GROUPS.entries()) created.push(await createGroup(group, first + i));
	await runAll();
	await printTable();
}, SLOW);

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

describe('matching fixtures (C8 defaults)', () => {
	it('has at least 30 labelled pairs', () => {
		expect(GROUPS.flatMap((group) => group.fixtures).length).toBeGreaterThanOrEqual(30);
	});

	it.each(GROUPS.map((group) => group.name))('%s: inclusion, order and strength as labelled', async (name) => {
		const entry = created.find((group) => group.group.name === name)!;
		expect(await ranked(entry)).toEqual(labelled(entry));
	});

	it('scores a chip pair 1.000 with chip_match, whatever the distance, time or sex', async () => {
		for (const [name, code] of [
			['chip', 'chip'],
			['chip-sighting', 'chip_sighting'],
		]) {
			const entry = created.find((group) => group.group.name === name)!;
			const [best] = await suggested(entry.lostId);
			expect(best).toMatchObject({ chip_match: true, strength: 'strong' });
			expect(best!.score.toNumber()).toBe(1);
			expect(best!.reasons).toContainEqual({ code });
		}
	});

	it(
		'never brings back a rejected pair after a rerun from either side',
		async () => {
			const entry = created.find((group) => group.group.name === 'rejected')!;
			const otherId = [...entry.others].find(([, fixture]) => fixture.name === REJECTED)![0];
			const match = await prisma.matches.findUniqueOrThrow({
				where: { lost_report_id_other_report_id: { lost_report_id: entry.lostId, other_report_id: otherId } },
			});
			await MatchReviewDomain.rejectMatch({ id: match.id, reason: 'not my dog' }, userCtx(owner));

			await runAll(true);
			const after = await prisma.matches.findUniqueOrThrow({ where: { id: match.id } });
			expect(after.state).toBe('rejected');
			expect(after.score.toNumber()).toBe(match.score.toNumber());
			for (const other of created)
				expect(await ranked(other), other.group.name).toEqual(labelled(other, [REJECTED]));
		},
		SLOW
	);
});

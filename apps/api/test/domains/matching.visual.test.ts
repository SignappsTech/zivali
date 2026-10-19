// Matching engine v3 against the local database (C8 §Visual similarity, TASK-43.2): V from one similarity call per run
// in both directions, the v2 fallback (no vectors, embedder off, query error, 2 s timeout), the deploy re-score of v2
// rows (identical without vectors, never notifying), photo.embed re-running match.report after a new vector, and the v3
// config keys. Each test's reports sit in their own 70-day slot in the 18th century, so nothing else is a candidate.
// The defaults pair: colour only, exactly 2 km and 6 h apart, v2 0.504 possible; with V = 1 0.665 good (geo-time fit).
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MATCH_ALGO_VERSION } from '@zivali/validation/matching';

import { EMBED_DIM, type EmbedderAdapter } from '../../adapters/embedder/index.ts';
import { adapters } from '../../adapters/index.ts';
import { offAdapter } from '../../adapters/select.ts';
import EmbeddingsDao from '../../domains/embeddings/embeddings.dao.ts';
import { MatchingDomain } from '../../domains/matching/index.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import { runJob } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { drain, jobs, startJobs } from '../../lib/jobs.ts';
import { logger } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';
import rescoreMatches from '../../prisma/seeders/40-matching-rescore.seeder.ts';

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
const shas: string[] = [];

// Prešernov trg, Ljubljana; 0.009° of latitude ≈ 1 km.
const LJ = { lat: 46.0514, lng: 14.5061 };
const HOUR = 3600_000;
let slot = randomInt(0, 900);
const month = () => new Date(Date.UTC(1700, 0, 1) + slot++ * 70 * 24 * HOUR);
const colourOnly = { sex: null, size: null, colours: ['black', 'white'], pattern: null } satisfies Partial<NewReport>;
const allFour = {
	sex: 'female',
	size: 'm',
	colours: ['black', 'white'],
	pattern: 'bicolour',
} satisfies Partial<NewReport>;

// Both points exactly km north of LJ, so the scores are exact (the stored point is coarsened, the public one fuzzed).
const pin = (id: string, km: number) => prisma.$executeRaw`
	update app.reports set exact_point = extensions.st_setsrid(extensions.st_makepoint(${LJ.lng}, ${LJ.lat + km * 0.009}), 4326),
		public_point = extensions.st_setsrid(extensions.st_makepoint(${LJ.lng}, ${LJ.lat + km * 0.009}), 4326)
	where id = ${id}::uuid`;

async function lostReport(at: Date) {
	const lost = await ReportsDomain.insertReport(
		{ type: 'lost', species: 'dog', name: 'Piki', ...allFour, location: LJ, event_at: at },
		userCtx(owner)
	);
	await pin(lost.id, 0);
	return lost;
}
/** A found report km north of LJ, 6 h after at; colour only by default. */
async function foundReport(at: Date, km = 2, attributes: Partial<NewReport> = colourOnly) {
	const found = await ReportsDomain.insertReport(
		{ type: 'found', species: 'dog', location: LJ, event_at: new Date(at.getTime() + 6 * HOUR), ...attributes },
		userCtx(finder)
	);
	await pin(found.id, km);
	return found;
}
async function pair() {
	const at = month();
	return { at, lost: await lostReport(at), found: await foundReport(at) };
}

let MODEL: string;
/** A unit vector at deg degrees in one plane: cos(unit(a), unit(b)) = cos(a − b). */
function unit(deg: number): number[] {
	const v = new Array<number>(EMBED_DIM).fill(0);
	v[0] = Math.cos((deg * Math.PI) / 180);
	v[1] = Math.sin((deg * Math.PI) / 180);
	return v;
}
/** A photo with a vector for embedding.model at deg (none for null). */
async function photo(
	report_id: string | null,
	who: Actor,
	deg: number | null,
	options: { sha256?: string; status?: 'accepted' | 'published' } = {}
): Promise<string> {
	const { sha256 = randomBytes(32).toString('hex'), status = 'published' } = options;
	const { id } = await prisma.photos.create({
		data: { owner_id: who.user_id, report_id, sha256, width: 1, height: 1, bytes: 1, status },
	});
	if (deg !== null) await EmbeddingsDao.insertVector(id, MODEL, unit(deg));
	return id;
}

const run = (report_id: string, ctx = systemCtx()) => MatchingDomain.matchReport({ report_id }, ctx);
const embedderOff = () =>
	systemCtx({ adapters: { ...adapters, embedder: offAdapter<EmbedderAdapter>('EMBEDDER_PROVIDER') } });
const rowsOf = async (lost_report_id: string) =>
	(await prisma.matches.findMany({ where: { lost_report_id }, orderBy: { score: 'desc' } })).map((row) => ({
		...row,
		score: row.score.toNumber(),
	}));
const visualReason = (reasons: unknown) => (reasons as { code: string }[]).find((reason) => reason.code === 'visual');
const notifications = async (match_id: string) =>
	prisma.$queryRaw<{ id: string }[]>`
		select id from pgboss.job where name = 'notify.send' and data->'payload'->>'match_id' = ${match_id}`;
// The v2 engine's rows of the defaults pair (C8 §Engine 3: score, strength and reasons of v2).
const V2_COLOUR_ONLY = {
	score: 0.504,
	strength: 'possible',
	reasons: [
		{ code: 'distance', band: '1to3' },
		{ code: 'time', hours_band: 'lt24' },
		{ code: 'colour', overlap: 1 },
	],
};

beforeAll(async () => {
	await startJobs();
	await prisma.profiles.createMany({ data: users.map(({ user_id }) => ({ id: user_id })) });
	MODEL = String(await configStore.get('embedding.model'));
	// AI switched on for photos from 2026-10-19 (TASK-40.11; the cutoff itself: ai.cutoff.test.ts).
	await prisma.$executeRaw`update app.app_config set value = '"2026-10-19T00:00:00Z"' where key = 'ai.photos_since'`;
	configStore.invalidate();
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	const ids = (
		await prisma.reports.findMany({
			where: { created_by: { in: users.map((user) => user.user_id) } },
			select: { id: true },
		})
	).map((report) => report.id);
	await prisma.matches.deleteMany({ where: { lost_report_id: { in: ids } } });
	await prisma.$executeRaw`delete from pgboss.job where name = 'notify.send' and data->>'user_id' = any(${users.map((user) => user.user_id)})`;
	await prisma.$executeRaw`delete from pgboss.job where name = 'match.report' and data->>'report_id' = any(${ids})`;
	await prisma.reports.deleteMany({ where: { id: { in: ids } } });
	await prisma.ai_results.deleteMany({ where: { sha256: { in: shas } } });
	// Photos and their vectors go with the profiles (on delete cascade).
	await prisma.profiles.deleteMany({ where: { id: { in: users.map((user) => user.user_id) } } });
});

describe('visual similarity per candidate (AC#1)', () => {
	it('gets V for every candidate from one similarity call, from either side, with the best photo pair', async () => {
		const { at, lost, found } = await pair();
		const bare = await foundReport(at); // no photos: v2
		await photo(lost.id, owner, 90);
		const lostBest = await photo(lost.id, owner, 0);
		await photo(found.id, finder, 180);
		const foundBest = await photo(found.id, finder, 3);
		const similarity = vi.spyOn(EmbeddingsDao, 'similarity');

		expect(await run(lost.id)).toEqual({ stored: 2 });
		// The re-score of the report's suggestions reuses the candidates' V: no second call.
		expect(similarity).toHaveBeenCalledTimes(1);
		expect(similarity).toHaveBeenCalledWith(lost.id, expect.any(Array), MODEL);
		expect((similarity.mock.calls[0]![1] as string[]).sort()).toEqual([found.id, bare.id].sort());
		const visual = { code: 'visual', band: 'very_similar', lost_photo_id: lostBest, other_photo_id: foundBest };
		const [withV, withoutV] = await rowsOf(lost.id);
		expect(withV).toMatchObject({ other_report_id: found.id, score: 0.665, strength: 'good' });
		expect(withV!.reasons).toEqual([...V2_COLOUR_ONLY.reasons, visual]);
		expect(withoutV).toMatchObject({ other_report_id: bare.id, ...V2_COLOUR_ONLY });
		expect([withV!.algo_version, withoutV!.algo_version]).toEqual([MATCH_ALGO_VERSION, MATCH_ALGO_VERSION]);

		// Reverse search: the found report asks with its own photos first; the pair comes back the right way round.
		await prisma.matches.deleteMany({ where: { lost_report_id: lost.id } });
		similarity.mockClear();
		expect(await run(found.id)).toEqual({ stored: 1 });
		expect(similarity).toHaveBeenCalledTimes(1);
		expect(similarity).toHaveBeenCalledWith(found.id, [lost.id], MODEL);
		const [reverse] = await rowsOf(lost.id);
		expect(reverse).toMatchObject({ other_report_id: found.id, score: 0.665, strength: 'good' });
		expect(visualReason(reverse!.reasons)).toEqual(visual);
	});

	it('the re-score queries V only for suggestions that are no longer candidates', async () => {
		const { lost, found } = await pair();
		await photo(lost.id, owner, 0);
		await photo(found.id, finder, 0);
		await run(lost.id);
		// Now beyond the 30 km limit: no candidate, but still a suggestion. With V it stays (0.511, possible without a
		// geo-time fit); as v2 (0.298) it would be removed.
		await pin(found.id, 40);
		const similarity = vi.spyOn(EmbeddingsDao, 'similarity');
		expect(await run(lost.id)).toEqual({ stored: 0 });
		expect(similarity).toHaveBeenCalledTimes(1);
		expect(similarity).toHaveBeenCalledWith(lost.id, [found.id], MODEL);
		const [kept] = await rowsOf(lost.id);
		expect(kept).toMatchObject({ other_report_id: found.id, score: 0.511, strength: 'possible' });
		expect(visualReason(kept!.reasons)).toMatchObject({ code: 'visual', band: 'very_similar' });
	});

	it('scores as v2 when either side has no vector, and runs no query with the embedder off', async () => {
		const oneSided = await pair();
		await photo(oneSided.lost.id, owner, 0);
		await photo(oneSided.found.id, finder, null);
		await run(oneSided.lost.id);
		expect(await rowsOf(oneSided.lost.id)).toEqual([expect.objectContaining(V2_COLOUR_ONLY)]);

		const off = await pair();
		await photo(off.lost.id, owner, 0);
		await photo(off.found.id, finder, 0);
		const similarity = vi.spyOn(EmbeddingsDao, 'similarity');
		await run(off.lost.id, embedderOff());
		expect(similarity).not.toHaveBeenCalled();
		expect(await rowsOf(off.lost.id)).toEqual([
			expect.objectContaining({ ...V2_COLOUR_ONLY, algo_version: MATCH_ALGO_VERSION }),
		]);
	});

	it('a query error logs matching.visual_unavailable, scores as v2 and the job succeeds', async () => {
		const { lost, found } = await pair();
		await photo(lost.id, owner, 0);
		await photo(found.id, finder, 0);
		vi.spyOn(EmbeddingsDao, 'similarity').mockRejectedValue(new Error('connection lost'));
		const warn = vi.spyOn(logger, 'warn');
		await jobs.send('match.report', { report_id: lost.id });
		await drain(runJob);
		expect(await rowsOf(lost.id)).toEqual([expect.objectContaining(V2_COLOUR_ONLY)]);
		expect(warn).toHaveBeenCalledWith(
			expect.objectContaining({ report_id: lost.id }),
			'matching.visual_unavailable'
		);
		const failed = await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from pgboss.job
			where name = 'match.report' and state in ('retry', 'failed') and data->>'report_id' = ${lost.id}`;
		expect(failed[0]!.count).toBe(0);
	});

	it('the 2 s statement timeout (vectors locked) logs matching.visual_unavailable and scores as v2', async () => {
		const { lost, found } = await pair();
		await photo(lost.id, owner, 0);
		await photo(found.id, finder, 0);
		const warn = vi.spyOn(logger, 'warn');
		const similarity = vi.spyOn(EmbeddingsDao, 'similarity');
		let locked!: () => void;
		let release!: () => void;
		const isLocked = new Promise<void>((resolve) => (locked = resolve));
		const released = new Promise<void>((resolve) => (release = resolve));
		const holder = prisma.$transaction(
			async (tx) => {
				await tx.$executeRaw`lock table app.photo_embeddings in access exclusive mode`;
				locked();
				await released;
			},
			{ timeout: 60_000 }
		);
		await isLocked;
		try {
			// The one similarity call waits for the lock until its 2 s timeout; the re-score reuses the fallback.
			expect(await run(lost.id)).toEqual({ stored: 1 });
		} finally {
			release();
			await holder;
		}
		expect(similarity).toHaveBeenCalledTimes(1);
		expect(await rowsOf(lost.id)).toEqual([expect.objectContaining(V2_COLOUR_ONLY)]);
		expect(warn).toHaveBeenCalledWith(
			expect.objectContaining({ report_id: lost.id }),
			'matching.visual_unavailable'
		);
	});
});

describe('deploy re-score of v2 rows (seeder 40-matching-rescore, AC#3)', () => {
	/** Rows as the v2 engine stored them: all four the same at 1 km (strong, notified), the defaults pair (possible). */
	async function v2Rows(withVectors: boolean) {
		const at = month();
		const lost = await lostReport(at);
		const strong = await foundReport(at, 1, allFour);
		const possible = await foundReport(at);
		// With vectors, both pairs have V = 1.
		if (withVectors) for (const id of [lost.id, strong.id, possible.id]) await photo(id, finder, 0);
		const row = (
			other_report_id: string,
			data: { score: number; strength: string; reasons: object[]; notified_at?: Date }
		) =>
			prisma.matches.create({
				data: { lost_report_id: lost.id, other_report_id, chip_match: false, algo_version: 'v2', ...data },
			});
		const strongRow = await row(strong.id, {
			score: 0.885,
			strength: 'strong',
			notified_at: at,
			reasons: [
				{ code: 'distance', band: '1to3' },
				{ code: 'time', hours_band: 'lt24' },
				{ code: 'size', match: 'equal' },
				{ code: 'colour', overlap: 1 },
				{ code: 'sex', match: 'equal' },
				{ code: 'pattern', match: 'equal' },
			],
		});
		const possibleRow = await row(possible.id, V2_COLOUR_ONLY);
		return { lost, strongRow, possibleRow };
	}
	const view = (row: { score: unknown; strength: string; reasons: unknown; notified_at: Date | null }) => ({
		score: Number(row.score),
		strength: row.strength,
		reasons: row.reasons,
		notified_at: row.notified_at,
	});

	it.each([
		{ name: 'no vectors (the seeder, embedder on)', withVectors: false, ctx: () => systemCtx() },
		{ name: 'the embedder off (production) and vectors stored', withVectors: true, ctx: embedderOff },
	])(
		'with $name: v3 rows with the same score, strength and reasons, nobody notified',
		async ({ withVectors, ctx }) => {
			const { lost, strongRow, possibleRow } = await v2Rows(withVectors);
			await (withVectors ? MatchingDomain.rescoreSuggestions({}, ctx()) : rescoreMatches());
			const after = await rowsOf(lost.id);
			expect(after.map((row) => [row.id, row.algo_version])).toEqual([
				[strongRow.id, MATCH_ALGO_VERSION],
				[possibleRow.id, MATCH_ALGO_VERSION],
			]);
			expect(after.map(view)).toEqual([view(strongRow), view(possibleRow)]);
			// The engine run after the deploy gives the same rows and notifies nobody either.
			await run(lost.id, ctx());
			expect((await rowsOf(lost.id)).map(view)).toEqual([view(strongRow), view(possibleRow)]);
			expect([...(await notifications(strongRow.id)), ...(await notifications(possibleRow.id))]).toEqual([]);
		}
	);

	it('with vectors (staging) re-scores with V, a row lifted to good is not notified by the re-score', async () => {
		const { lost, possibleRow } = await v2Rows(true);
		await rescoreMatches();
		const lifted = (await rowsOf(lost.id)).find((row) => row.id === possibleRow.id)!;
		expect(lifted).toMatchObject({ score: 0.665, strength: 'good', notified_at: null, algo_version: 'v3' });
		expect(visualReason(lifted.reasons)).toMatchObject({ code: 'visual', band: 'very_similar' });
		expect(await notifications(possibleRow.id)).toEqual([]);
	});
});

describe('a new vector re-runs matching (photo.embed → match.report, AC#2)', () => {
	it('re-scores the pair with V once the found photo is embedded and notifies its managers once', async () => {
		const { lost, found } = await pair();
		const lostPhoto = await photo(lost.id, owner, 0);
		// The found photo has a clean safety check and no vector yet; another photo of the same image has one (hash
		// reuse), so photo.embed stores it without calling the embedder.
		const sha256 = randomBytes(32).toString('hex');
		shas.push(sha256);
		await prisma.ai_results.create({
			data: {
				sha256,
				model: 'test',
				prompt_version: 'test',
				result: { animal: 'dog' },
				moderation: { person_prominent: false, nsfw: false },
			},
		});
		const foundPhoto = await photo(found.id, finder, null, { sha256, status: 'accepted' });
		await photo(null, owner, 2, { sha256 }); // one image per owner
		await run(found.id);
		const [before] = await rowsOf(lost.id);
		expect(before).toMatchObject({ ...V2_COLOUR_ONLY, notified_at: null });

		await jobs.send('photo.embed', { photo_id: foundPhoto });
		await drain(runJob);
		const rematch = () => prisma.$queryRaw<{ id: string }[]>`
			select id from pgboss.job where name = 'match.report' and singleton_key = ${found.id}`;
		expect(await rematch()).toHaveLength(1);
		const [after] = await rowsOf(lost.id);
		expect(after).toMatchObject({ id: before!.id, score: 0.665, strength: 'good' });
		expect(visualReason(after!.reasons)).toEqual({
			code: 'visual',
			band: 'very_similar',
			lost_photo_id: lostPhoto,
			other_photo_id: foundPhoto,
		});
		expect(after!.notified_at).not.toBeNull();
		expect(await notifications(after!.id)).toHaveLength(1);

		// No new vector, no new run; further runs never notify again.
		await jobs.send('photo.embed', { photo_id: foundPhoto });
		await drain(runJob);
		expect(await rematch()).toHaveLength(1);
		await run(found.id);
		await run(lost.id);
		expect(await notifications(after!.id)).toHaveLength(1);
	});

	it('sends nothing for a photo on a closed report', async () => {
		const { found } = await pair();
		await prisma.reports.update({ where: { id: found.id }, data: { status: 'closed' } });
		const id = await photo(found.id, finder, 0);
		expect(await MatchingDomain.embeddedReport({ photo_id: id }, systemCtx())).toBeNull();
	});
});

describe('v3 config keys (AC#3)', () => {
	it('the migration inserts the C8 start values, which matchingConfig reads', async () => {
		const keys = ['matching.weights_visual', 'matching.visual_floor', 'matching.visual_ceiling'];
		const rows = await prisma.app_config.findMany({ where: { key: { in: keys } }, orderBy: { key: 'asc' } });
		expect(rows.map((row) => [row.key, row.value])).toEqual([
			['matching.visual_ceiling', 0.95],
			['matching.visual_floor', 0.7],
			['matching.weights_visual', { distance: 0.3, time: 0.15, attributes: 0.25, visual: 0.3 }],
		]);
		expect(await MatchingDomain.matchingConfig()).toMatchObject({
			weights_visual: { distance: 0.3, time: 0.15, attributes: 0.25, visual: 0.3 },
			visual_floor: 0.7,
			visual_ceiling: 0.95,
		});
	});
});

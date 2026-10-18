// Vector queries (C20 §Queries) against the local database with seeded vectors: similarity (exact best pair per
// report, one model, live photos, 2 s timeout) and nearest (best photo per open, visible report of the species and
// types within the radius, HNSW settings). The 50k timing check is test/perf/embeddings.perf.ts (on demand).
import { randomBytes, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { EMBED_DIM } from '../../adapters/embedder/index.ts';
import EmbeddingsDao, {
	hnswSettings,
	nearestSql,
	pgvectorVersion,
	type NearestInput,
} from '../../domains/embeddings/embeddings.dao.ts';
import { Prisma } from '../../generated/client.ts';
import type { PHOTO_STATUS } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

// Models of this run only (one per block), so vectors other tests leave in the database never show up.
const SIMILARITY = `test-${randomUUID()}`;
const MODEL = `test-${randomUUID()}`;
const OTHER = `other-${randomUUID()}`;
const owner = randomUUID();
const reportIds: string[] = [];
const LJUBLJANA = { lat: 46.05, lng: 14.5 };
const MARIBOR = { lat: 46.55, lng: 15.65 }; // about 100 km away

/** A unit vector at `deg` degrees from unit(0) in one plane: cos(unit(a), unit(b)) = cos(a − b). */
function unit(deg: number): number[] {
	const v = new Array<number>(EMBED_DIM).fill(0);
	v[0] = Math.cos((deg * Math.PI) / 180);
	v[1] = Math.sin((deg * Math.PI) / 180);
	return v;
}
const cosDeg = (deg: number) => Math.cos((deg * Math.PI) / 180);

type ReportFields = { type?: string; species?: string; status?: string; moderation?: string; at?: typeof LJUBLJANA };
async function report({
	type = 'lost',
	species = 'dog',
	status = 'open',
	moderation = 'visible',
	at = LJUBLJANA,
}: ReportFields = {}): Promise<string> {
	const id = randomUUID();
	reportIds.push(id);
	const point = Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${at.lng}, ${at.lat}), 4326)::extensions.geography`;
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia)
		values (${id}::uuid, ${id.slice(0, 8)}, ${type}::app."REPORT_TYPE", ${species}::app."SPECIES",
			${status}::app."REPORT_STATUS", ${moderation}::app."MODERATION_STATE", now(), ${point}, ${point}, 500, true)`;
	return id;
}

/** A photo of the report with a vector at `deg` for each given model. */
async function photo(
	report_id: string | null,
	vectors: Record<string, number>,
	status: PHOTO_STATUS = 'published'
): Promise<string> {
	const { id } = await prisma.photos.create({
		data: {
			owner_id: owner,
			report_id,
			sha256: randomBytes(32).toString('hex'),
			width: 1,
			height: 1,
			bytes: 1,
			status,
		},
	});
	for (const [model, deg] of Object.entries(vectors)) await EmbeddingsDao.insertVector(id, model, unit(deg));
	return id;
}

const settings = (tx: Prisma.TransactionClient) =>
	tx.$queryRaw<{ timeout: string; ef: string; iterative: string }[]>`
		select current_setting('statement_timeout') as timeout, current_setting('hnsw.ef_search', true) as ef,
			current_setting('hnsw.iterative_scan', true) as iterative`.then(([row]) => row!);

beforeAll(async () => {
	await prisma.profiles.create({ data: { id: owner } });
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.profiles.deleteMany({ where: { id: owner } }); // photos and vectors cascade
});

describe('similarity(lostReportId, otherReportIds, model)', () => {
	let lost: string, o1: string, o2: string, o3: string, o4: string;
	let l1: string, l2: string, o1a: string, o2a: string, o4a: string;

	beforeAll(async () => {
		lost = await report();
		l1 = await photo(lost, { [SIMILARITY]: 0, [OTHER]: 0 });
		l2 = await photo(lost, { [SIMILARITY]: 90 });
		await photo(lost, { [SIMILARITY]: 30 }, 'rejected'); // would pair with o2a at cos 1
		o1 = await report({ type: 'found' });
		o1a = await photo(o1, { [SIMILARITY]: 80 });
		await photo(o1, { [SIMILARITY]: 175 });
		o2 = await report({ type: 'found' });
		o2a = await photo(o2, { [SIMILARITY]: 30, [OTHER]: 0 });
		await photo(o2, { [SIMILARITY]: 0 }, 'unpublished'); // would pair with l1 at cos 1
		o3 = await report({ type: 'found' }); // no photo
		o4 = await report({ type: 'sighted' });
		o4a = await photo(o4, { [OTHER]: 0 }); // another model only
	});

	it('returns the best photo pair per other report with both photo ids, live photos and one model only', async () => {
		const rows = await EmbeddingsDao.similarity(lost, [o1, o2, o3, o4], SIMILARITY);
		const expected = [
			{ other_report_id: o1, cos: cosDeg(10), lost_photo_id: l2, other_photo_id: o1a },
			{ other_report_id: o2, cos: cosDeg(30), lost_photo_id: l1, other_photo_id: o2a },
		].sort((a, b) => a.other_report_id.localeCompare(b.other_report_id));
		expect(rows.map((r) => ({ ...r, cos: Number(r.cos.toFixed(6)) }))).toEqual(
			expected.map((r) => ({ ...r, cos: Number(r.cos.toFixed(6)) }))
		);
	});

	it('scores with the vectors of the given model', async () => {
		const rows = await EmbeddingsDao.similarity(lost, [o1, o2, o4], OTHER);
		expect(rows.map((r) => [r.other_report_id, r.lost_photo_id, r.other_photo_id])).toEqual(
			[
				[o2, l1, o2a],
				[o4, l1, o4a],
			].sort((a, b) => a[0]!.localeCompare(b[0]!))
		);
		for (const row of rows) expect(row.cos).toBeCloseTo(1, 6);
	});

	it('runs under a 2 s statement timeout, local to its transaction', async () => {
		const inside = await prisma.$transaction(async (tx) => {
			await EmbeddingsDao.similarity(lost, [o1], SIMILARITY, tx);
			return settings(tx);
		});
		expect(inside.timeout).toBe('2s');
		await EmbeddingsDao.similarity(lost, [o1], SIMILARITY);
		const after = await prisma.$queryRaw<{ t: string }[]>`select current_setting('statement_timeout') as t`;
		expect(after[0]!.t).not.toBe('2s');
	});

	it('returns nothing for no candidates', async () => {
		expect(await EmbeddingsDao.similarity(lost, [], SIMILARITY)).toEqual([]);
	});
});

describe('nearest({ photoId, species, point, radiusKm, types, k }, model)', () => {
	let query: string, a: string, a1: string, b: string, b1: string, d: string, d1: string, h: string, h1: string;
	const input = (over: Partial<NearestInput> = {}): NearestInput => ({
		photoId: query,
		species: 'dog',
		point: LJUBLJANA,
		radiusKm: 20,
		types: ['lost'],
		k: 10,
		...over,
	});

	beforeAll(async () => {
		const own = await report(); // the query photo's own report: left out
		query = await photo(own, { [MODEL]: 0 });
		await photo(own, { [MODEL]: 1 });
		a = await report();
		a1 = await photo(a, { [MODEL]: 10 });
		await photo(a, { [MODEL]: 40 });
		b = await report({ status: 'matched' });
		b1 = await photo(b, { [MODEL]: 20 });
		d = await report({ type: 'found' });
		d1 = await photo(d, { [MODEL]: 2 });
		h = await report({ at: MARIBOR });
		h1 = await photo(h, { [MODEL]: 5 });
		await photo(await report({ species: 'cat' }), { [MODEL]: 1 });
		await photo(await report({ status: 'closed' }), { [MODEL]: 3 });
		await photo(await report({ status: 'reunited' }), { [MODEL]: 3 });
		await photo(await report({ moderation: 'hidden' }), { [MODEL]: 4 });
		await photo(await report({ moderation: 'held' }), { [MODEL]: 4 });
		await photo(await report(), { [OTHER]: 0 });
		await photo(await report(), { [MODEL]: 6 }, 'rejected');
		await photo(null, { [MODEL]: 0 }); // not on a report
	});

	it('returns the best photo per open or matched, visible report of the species and types within the radius', async () => {
		const rows = await EmbeddingsDao.nearest(input(), MODEL);
		expect(rows.map((r) => [r.report_id, r.photo_id])).toEqual([
			[a, a1],
			[b, b1],
		]);
		expect(rows[0]!.cos).toBeCloseTo(cosDeg(10), 6);
		expect(rows[1]!.cos).toBeCloseTo(cosDeg(20), 6);
	});

	it('widens with the types and the radius, and stops at k', async () => {
		const wide = await EmbeddingsDao.nearest(input({ types: ['lost', 'found'], radiusKm: 200 }), MODEL);
		expect(wide.map((r) => [r.report_id, r.photo_id])).toEqual([
			[d, d1],
			[h, h1],
			[a, a1],
			[b, b1],
		]);
		const one = await EmbeddingsDao.nearest(input({ k: 1 }), MODEL);
		expect(one.map((r) => r.report_id)).toEqual([a]);
	});

	it('returns nothing without a vector of the model for the photo or without types', async () => {
		expect(await EmbeddingsDao.nearest(input(), OTHER)).toEqual([]);
		expect(await EmbeddingsDao.nearest(input({ photoId: randomUUID() }), MODEL)).toEqual([]);
		expect(await EmbeddingsDao.nearest(input({ types: [] }), MODEL)).toEqual([]);
	});

	it('rejects k outside 1..50 and a radius that is not positive', async () => {
		for (const k of [0, 51, 2.5])
			await expect(EmbeddingsDao.nearest(input({ k }), MODEL)).rejects.toThrow(RangeError);
		for (const radiusKm of [0, -1, Number.NaN])
			await expect(EmbeddingsDao.nearest(input({ radiusKm }), MODEL)).rejects.toThrow(RangeError);
	});

	it('scans with hnsw.ef_search 100 and relaxed iterative scans on pgvector >= 0.8 (the local stack)', async () => {
		expect(Number((await pgvectorVersion()).split('.')[1])).toBeGreaterThanOrEqual(8);
		const inside = await prisma.$transaction(async (tx) => {
			await EmbeddingsDao.nearest(input(), MODEL, tx);
			return settings(tx);
		});
		expect(inside).toMatchObject({ ef: '100', iterative: 'relaxed_order' });
	});

	it('falls back to ef_search 200 without iterative scans before pgvector 0.8', () => {
		const sql = (version: string) => hnswSettings(version).map((s) => s.sql);
		expect(sql('0.7.4')).toEqual(['set local hnsw.ef_search = 200']);
		for (const v of ['0.8.0', '0.8.2', '0.10.1', '1.0.0'])
			expect(sql(v)).toEqual(['set local hnsw.ef_search = 100', 'set local hnsw.iterative_scan = relaxed_order']);
	});

	const wide: Partial<NearestInput> = { types: ['lost', 'found'], radiusKm: 200 };
	/** nearestSql with the given exact-ranking limit, in a transaction with the HNSW settings. */
	const rank = (exactMax: number) =>
		prisma.$transaction(async (tx) => {
			for (const setting of hnswSettings(await pgvectorVersion(tx))) await tx.$executeRaw(setting);
			return tx.$queryRaw<{ report_id: string; photo_id: string }[]>(nearestSql(input(wide), MODEL, exactMax));
		});
	/** The EXPLAIN ANALYZE line of the HNSW scan. Few rows here, so the planner would rather sort them: with sorts and
	 * sequential scans priced out, the remaining ordered path is the index (the 50k perf test shows it unaided). */
	const hnswLine = (exactMax: number) =>
		prisma.$transaction(async (tx) => {
			for (const setting of hnswSettings(await pgvectorVersion(tx))) await tx.$executeRaw(setting);
			await tx.$executeRaw`set local enable_seqscan = off`;
			await tx.$executeRaw`set local enable_sort = off`;
			const rows = await tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
				Prisma.sql`explain analyze ${nearestSql(input(wide), MODEL, exactMax)}`
			);
			return rows.map((r) => r['QUERY PLAN']).find((line) => line.includes('photo_embeddings_hnsw')) ?? '';
		});

	it('walks the HNSW index above the exact-ranking limit, with the same results', async () => {
		const exact = await rank(2000);
		expect(exact.map((r) => r.report_id)).toEqual([d, h, a, b]);
		expect(await rank(0)).toEqual(exact);
		expect(await hnswLine(0)).toMatch(/Index Scan using photo_embeddings_hnsw .*\(actual time/);
		expect(await hnswLine(2000)).toContain('never executed');
	});
});

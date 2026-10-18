// Prisma access for photo vectors (C20 §Model, §Queries) and the Voyage rows of the ai_calls ledger. Vectors are read
// and written only through parameterised raw SQL, passed as a '[…]' text literal cast to extensions.vector.
import { Prisma } from '../../generated/client.ts';
import type { REPORT_TYPE, SPECIES } from '../../generated/enums.ts';
import type { Point } from '../../lib/fuzz.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

/** A report photo still eligible for matching: the states photo.embed embeds (C20 §Jobs 1). */
const LIVE_PHOTO = Prisma.sql`p.status in ('accepted', 'published')`;
const NEAREST_MAX_K = 50;
// A report has at most 5 photos (positions 0–4), so k × 5 nearest photos hold at least k reports when there are k.
const PHOTOS_PER_REPORT = 5;

export async function findPhoto(id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.photos.findUnique({ where: { id }, select: { id: true, sha256: true, status: true } });
}

/** The stored safety check of an image (C19 ai_results), or null when there is none. */
export async function findAiResult(sha256: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.ai_results.findUnique({ where: { sha256 }, select: { result: true, moderation: true } });
}

/** Models the photo already has a vector for. */
export async function modelsOf(photo_id: string, tx?: Tx): Promise<string[]> {
	const db = tx ?? prisma;
	const rows = await db.$queryRaw<{ model: string }[]>`
		select model from app.photo_embeddings where photo_id = ${photo_id}::uuid`;
	return rows.map((r) => r.model);
}

/** Hash reuse: copies the model's vector of another photo of the same image. Returns whether a row was written. */
export async function copyFromSameImage(photo: { id: string; sha256: string }, model: string, tx?: Tx) {
	const db = tx ?? prisma;
	const count = await db.$executeRaw`
		insert into app.photo_embeddings (photo_id, model, embedding)
		select ${photo.id}::uuid, e.model, e.embedding
		from app.photo_embeddings e join app.photos p on p.id = e.photo_id
		where p.sha256 = ${photo.sha256} and e.model = ${model} and e.photo_id <> ${photo.id}::uuid
		limit 1
		on conflict do nothing`;
	return count > 0;
}

/** Voyage spend (ai_calls provider voyage) since the given instant, in USD. */
export async function voyageSpendSince(since: Date, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const { _sum } = await db.ai_calls.aggregate({
		where: { provider: 'voyage', created_at: { gte: since } },
		_sum: { cost_usd: true },
	});
	return Number(_sum.cost_usd ?? 0);
}

export async function insertVector(photo_id: string, model: string, vector: number[], tx?: Tx) {
	const db = tx ?? prisma;
	return db.$executeRaw`
		insert into app.photo_embeddings (photo_id, model, embedding)
		values (${photo_id}::uuid, ${model}, ${`[${vector.join(',')}]`}::extensions.vector)
		on conflict do nothing`;
}

/** One ledger row per embedding call (unique per photo, provider and model; a repeat is not counted twice). */
export async function recordCall(
	data: { photo_id: string; model: string; pixels: number; cost_usd: string; latency_ms: number },
	tx?: Tx
) {
	const db = tx ?? prisma;
	return db.ai_calls.createMany({
		data: [
			{
				...data,
				provider: 'voyage',
				outcome: 'ok',
				input_tokens: 0,
				output_tokens: 0,
				pixels: BigInt(data.pixels),
			},
		],
		skipDuplicates: true,
	});
}

/** Runs fn in the caller's transaction, else in its own: `set local` needs one (it then lasts until that one ends). */
const inTx = <T>(tx: Tx | undefined, fn: (db: Tx) => Promise<T>): Promise<T> => (tx ? fn(tx) : prisma.$transaction(fn));

export type SimilarityRow = { other_report_id: string; cos: number; lost_photo_id: string; other_photo_id: string };

/**
 * Exact best photo pair (highest cosine) between the lost report and each other report, for vectors of `model` only;
 * one query for all candidates, at most 25 pairs each (no index), 2 s statement timeout (C20 §Queries, C8). Reports
 * without a vector for the model are left out.
 */
export async function similarity(
	lostReportId: string,
	otherReportIds: string[],
	model: string,
	tx?: Tx
): Promise<SimilarityRow[]> {
	if (otherReportIds.length === 0) return [];
	return inTx(tx, async (db) => {
		await db.$executeRaw`set local statement_timeout = '2s'`;
		return db.$queryRaw<SimilarityRow[]>`
			select distinct on (o.report_id) o.report_id as other_report_id,
				1 - (l.embedding operator(extensions.<=>) o.embedding) as cos,
				l.photo_id as lost_photo_id, o.photo_id as other_photo_id
			from (
				select e.photo_id, e.embedding from app.photo_embeddings e join app.photos p on p.id = e.photo_id
				where p.report_id = ${lostReportId}::uuid and e.model = ${model} and ${LIVE_PHOTO}
			) l
			cross join (
				select p.report_id, e.photo_id, e.embedding from app.photo_embeddings e join app.photos p on p.id = e.photo_id
				where p.report_id = any(${otherReportIds}::uuid[]) and e.model = ${model} and ${LIVE_PHOTO}
			) o
			order by o.report_id, l.embedding operator(extensions.<=>) o.embedding, l.photo_id, o.photo_id`;
	});
}

/** `set local` settings of the HNSW scan: iterative scans need pgvector 0.8, older versions widen ef_search instead. */
export function hnswSettings(pgvectorVersion: string): Prisma.Sql[] {
	const [major = 0, minor = 0] = pgvectorVersion.split('.').map(Number);
	return major > 0 || minor >= 8
		? [Prisma.sql`set local hnsw.ef_search = 100`, Prisma.sql`set local hnsw.iterative_scan = relaxed_order`]
		: [Prisma.sql`set local hnsw.ef_search = 200`];
}

let version: Promise<string> | undefined;
/** The installed pgvector version, read once per process. */
export const pgvectorVersion = (db: Tx = prisma) =>
	(version ??= db.$queryRaw<{ v: string }[]>`select extversion as v from pg_extension where extname = 'vector'`
		.then(([row]) => row?.v ?? '0')
		.catch((err: unknown) => {
			version = undefined; // retried by the next call
			throw err;
		}));

export type NearestInput = {
	photoId: string;
	species: SPECIES;
	point: Point;
	radiusKm: number;
	types: REPORT_TYPE[];
	k: number;
};
export type NearestRow = { report_id: string; photo_id: string; cos: number };

/** The statement of `nearest` (exported for the EXPLAIN checks); run it after hnswSettings. */
export function nearestSql({ photoId, species, point, radiusKm, types, k }: NearestInput, model: string): Prisma.Sql {
	const query = Prisma.sql`(select embedding from app.photo_embeddings where photo_id = ${photoId}::uuid and model = ${model})`;
	// The inner scan orders by distance alone with a limit, so the planner can walk the HNSW index; relaxed_order may
	// return it slightly out of order, which the outer sort by the exact distance fixes.
	return Prisma.sql`
		select report_id, photo_id, 1 - dist as cos from (
			select distinct on (report_id) report_id, photo_id, dist from (
				select p.report_id, e.photo_id, e.embedding operator(extensions.<=>) ${query} as dist
				from app.photo_embeddings e
				join app.photos p on p.id = e.photo_id
				join app.reports r on r.id = p.report_id
				where ${query} is not null and e.model = ${model} and ${LIVE_PHOTO}
					and r.id is distinct from (select report_id from app.photos where id = ${photoId}::uuid)
					and r.species = ${species}::app."SPECIES" and r.type = any(${types}::app."REPORT_TYPE"[])
					and r.status in ('open', 'matched') and r.moderation_state = 'visible'
					and extensions.st_dwithin(r.public_point,
						extensions.st_setsrid(extensions.st_makepoint(${point.lng}, ${point.lat}), 4326)::extensions.geography,
						${radiusKm * 1000}::float8)
				order by e.embedding operator(extensions.<=>) ${query}
				limit ${k * PHOTOS_PER_REPORT}
			) ann
			order by report_id, dist, photo_id
		) best
		order by dist, report_id
		limit ${k}`;
}

/**
 * The k reports whose best photo is nearest (cosine) to the photo's `model` vector, best first: ANN over the HNSW
 * index, filtered to the species and types, status open/matched, moderation visible and public_point within radiusKm
 * of the point (C20 §Queries, C6). The photo's own report is left out. No vector for the photo = no results.
 */
export async function nearest(input: NearestInput, model: string, tx?: Tx): Promise<NearestRow[]> {
	const { radiusKm, types, k } = input;
	if (!Number.isInteger(k) || k < 1 || k > NEAREST_MAX_K) throw new RangeError(`k must be 1..${NEAREST_MAX_K}`);
	if (!Number.isFinite(radiusKm) || radiusKm <= 0) throw new RangeError('radiusKm must be a positive number');
	if (types.length === 0) return [];
	return inTx(tx, async (db) => {
		for (const setting of hnswSettings(await pgvectorVersion(db))) await db.$executeRaw(setting);
		return db.$queryRaw<NearestRow[]>(nearestSql(input, model));
	});
}

export default {
	findPhoto,
	findAiResult,
	modelsOf,
	copyFromSameImage,
	voyageSpendSince,
	insertVector,
	recordCall,
	similarity,
	nearest,
};

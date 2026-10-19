// Prisma access for photo vectors (C20 §Model, §Queries) and the Voyage rows of the ai_calls ledger. Vectors are read
// and written only through parameterised raw SQL, passed as a '[…]' text literal cast to extensions.vector.
import { EMBED_DIM } from '../../adapters/embedder/index.ts';
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
// nearest ranks up to this many candidate photos exactly (about 30 ms) and walks the HNSW index above it, where an
// iterative scan needs few tuples (measured at 50k photos, test/perf/embeddings.perf.ts).
const EXACT_MAX_PHOTOS = 2000;
/**
 * The stored vector as an in-memory copy. A 1024-d vector is stored out of line (TOAST), and a plain column reference
 * stays a pointer that every distance call reads again: 25k similarity pairs took 1.1 s that way, 0.18 s with the copy.
 * subvector(v, 1, EMBED_DIM) is the whole vector of the vector(1024) column (C20 §Model). It only pays where the value
 * is produced once and compared many times (behind `offset 0` or in an InitPlan).
 */
const loaded = (column: Prisma.Sql) => Prisma.sql`extensions.subvector(${column}, 1, ${EMBED_DIM}::int)`;

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

/** `set local` setting of similarity (exported for the settings check). */
export const SIMILARITY_TIMEOUT = Prisma.sql`set local statement_timeout = '2s'`;

export type SimilarityRow = { other_report_id: string; cos: number; lost_photo_id: string; other_photo_id: string };

/**
 * Exact best photo pair (highest cosine) between the lost report and each other report, for vectors of `model` only;
 * one query for all candidates, at most 25 pairs each (no index), 2 s statement timeout (C20 §Queries, C8). Reports
 * without a vector for the model are left out. It runs in its own transaction, so neither the `set local` nor a timeout
 * (57014) can reach a caller's.
 */
export async function similarity(
	lostReportId: string,
	otherReportIds: string[],
	model: string
): Promise<SimilarityRow[]> {
	if (otherReportIds.length === 0) return [];
	return prisma.$transaction(async (db) => {
		await db.$executeRaw(SIMILARITY_TIMEOUT);
		return db.$queryRaw<SimilarityRow[]>`
			select distinct on (o.report_id) o.report_id as other_report_id,
				1 - (l.embedding operator(extensions.<=>) o.embedding) as cos,
				l.photo_id as lost_photo_id, o.photo_id as other_photo_id
			from (
				select e.photo_id, ${loaded(Prisma.sql`e.embedding`)} as embedding
				from app.photo_embeddings e join app.photos p on p.id = e.photo_id
				where p.report_id = ${lostReportId}::uuid and e.model = ${model} and ${LIVE_PHOTO}
				offset 0
			) l
			cross join (
				select p.report_id, e.photo_id, ${loaded(Prisma.sql`e.embedding`)} as embedding
				from app.photo_embeddings e join app.photos p on p.id = e.photo_id
				where p.report_id = any(${otherReportIds}::uuid[]) and e.model = ${model} and ${LIVE_PHOTO}
				offset 0
			) o
			order by o.report_id, l.embedding operator(extensions.<=>) o.embedding, l.photo_id, o.photo_id`;
	});
}

// The planner prices a distance at one operator call, not knowing that each one reads a 4 KB vector out of TOAST, so it
// may rank every candidate with a full scan and sort (0.7 s nationwide at 50k) instead of walking the HNSW index (40 ms).
// With sorts priced out, the index is the only ordered path left; the other sorts of nearest are needed by every plan.
const NO_SORT_SCAN = Prisma.sql`set local enable_sort = off`;

/** `set local` settings of the HNSW scan: iterative scans need pgvector 0.8, older versions widen ef_search instead. */
export function hnswSettings(pgvectorVersion: string): Prisma.Sql[] {
	const [major = 0, minor = 0] = pgvectorVersion.split('.').map(Number);
	return major > 0 || minor >= 8
		? [
				Prisma.sql`set local hnsw.ef_search = 100`,
				Prisma.sql`set local hnsw.iterative_scan = relaxed_order`,
				NO_SORT_SCAN,
			]
		: [Prisma.sql`set local hnsw.ef_search = 200`, NO_SORT_SCAN];
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

/**
 * The statement of `nearest` (exported for the plan checks); run it after hnswSettings. It first collects the candidate
 * photos (live photos with a vector of the model, of open or matched, visible reports of the species and types within
 * the radius, not the query photo's own report). Up to `exactMax` of them are ranked exactly; more go through the HNSW
 * index. PostGIS estimates
 * ST_DWithin at about one row whatever the radius, so the planner cannot make that choice itself: left to it, a
 * nationwide search joined every report to every photo (34 s at 50k photos).
 */
export function nearestSql(
	{ photoId, species, point, radiusKm, types, k }: NearestInput,
	model: string,
	exactMax = EXACT_MAX_PHOTOS
): Prisma.Sql {
	const query = Prisma.sql`(select ${loaded(Prisma.sql`embedding`)} from app.photo_embeddings
		where photo_id = ${photoId}::uuid and model = ${model})`;
	const count = Prisma.sql`(select count(*) from cand)`;
	// The report ids go in as an array so the photos are looked up through their report_id index. In the index branch
	// `(… in cand) is true` stays a hashed filter on the HNSW scan (a plain `in` becomes a join the planner reorders);
	// the scan orders by distance alone with a limit, and relaxed_order's slight disorder is fixed by the outer sorts.
	return Prisma.sql`
		with cand as materialized (
			select p.id, p.report_id from app.photos p
			where ${query} is not null and ${LIVE_PHOTO}
				and exists (select from app.photo_embeddings v where v.photo_id = p.id and v.model = ${model})
				and p.report_id = any(array(
				select r.id from app.reports r
				where r.species = ${species}::app."SPECIES" and r.type = any(${types}::app."REPORT_TYPE"[])
					and r.status in ('open', 'matched') and r.moderation_state = 'visible'
					and r.id is distinct from (select report_id from app.photos where id = ${photoId}::uuid)
					and extensions.st_dwithin(r.public_point,
						extensions.st_setsrid(extensions.st_makepoint(${point.lng}, ${point.lat}), 4326)::extensions.geography,
						${radiusKm * 1000}::float8)))
		)
		select report_id, photo_id, 1 - dist as cos from (
			select distinct on (report_id) report_id, photo_id, dist from (
				select c.report_id, c.id as photo_id, e.embedding operator(extensions.<=>) ${query} as dist
				from cand c join app.photo_embeddings e on e.photo_id = c.id and e.model = ${model}
				where ${count} <= ${exactMax}
				union all
				select p.report_id, ann.photo_id, ann.dist
				from (
					select e.photo_id, e.embedding operator(extensions.<=>) ${query} as dist
					from app.photo_embeddings e
					where ${count} > ${exactMax} and e.model = ${model} and (e.photo_id in (select id from cand)) is true
					order by e.embedding operator(extensions.<=>) ${query}
					limit ${k * PHOTOS_PER_REPORT}
				) ann join app.photos p on p.id = ann.photo_id
			) scored
			order by report_id, dist, photo_id
		) best
		order by dist, report_id
		limit ${k}`;
}

/**
 * The k reports whose best photo is nearest (cosine) to the photo's `model` vector, best first, among open or matched,
 * visible reports of the species and types whose public_point is within radiusKm of the point (C20 §Queries, C6):
 * ANN over the HNSW index, or exact for few candidates (nearestSql). The photo's own report is left out; no vector
 * for the photo = no results. It runs in its own transaction, so the `set local` settings never reach a caller's.
 */
export async function nearest(input: NearestInput, model: string): Promise<NearestRow[]> {
	const { radiusKm, types, k } = input;
	if (!Number.isInteger(k) || k < 1 || k > NEAREST_MAX_K) throw new RangeError(`k must be 1..${NEAREST_MAX_K}`);
	if (!Number.isFinite(radiusKm) || radiusKm <= 0) throw new RangeError('radiusKm must be a positive number');
	if (types.length === 0) return [];
	return prisma.$transaction(async (db) => {
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

// Prisma access for photo vectors (C20 §Model) and the Voyage rows of the ai_calls ledger. Vectors are read and
// written only through parameterised raw SQL, passed as a '[…]' text literal cast to extensions.vector.
import { prisma, type Prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

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

export default { findPhoto, findAiResult, modelsOf, copyFromSameImage, voyageSpendSince, insertVector, recordCall };

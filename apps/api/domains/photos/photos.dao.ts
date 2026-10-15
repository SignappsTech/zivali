// Prisma access for photos (C5). Every function takes an optional transaction client (ADR-020).
import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

/** The report fields that decide whether its photos are public (photo.publish, DELETE /v1/photos/:id). */
const reportState = {
	id: true,
	moderation_state: true,
	status: true,
	close_reason: true,
	closed_at: true,
	reunited_at: true,
} satisfies Prisma.reportsSelect;

/**
 * POST /v1/photos: a new `pending` row, or the owner's row for the same hash with its purge clock (updated_at)
 * restarted. One INSERT … ON CONFLICT, so two concurrent posts of one photo get the same row.
 */
export async function upsertByHash(
	data: { owner_id: string; sha256: string; width: number; height: number; bytes: number },
	now: Date,
	tx?: Tx
) {
	const db = tx ?? prisma;
	return db.photos.upsert({
		where: { owner_id_sha256: { owner_id: data.owner_id, sha256: data.sha256 } },
		create: data,
		update: { updated_at: now },
	});
}

export async function findById(id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.photos.findUnique({ where: { id }, include: { report: { select: reportState } } });
}

export type PhotoRow = NonNullable<Awaited<ReturnType<typeof findById>>>;

export async function update(id: string, data: Prisma.photosUncheckedUpdateInput, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.photos.update({ where: { id }, data, select: { id: true } });
}

/** pending → uploaded; false when another /complete got there first. */
export async function markUploaded(id: string, tx?: Tx): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.photos.updateMany({ where: { id, status: 'pending' }, data: { status: 'uploaded' } });
	return count === 1;
}

export async function remove(id: string, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.photos.delete({ where: { id }, select: { id: true } });
}

/** A report with its processed photos, in order (photo.publish). */
export async function findReportPhotos(report_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.reports.findUnique({
		where: { id: report_id },
		select: {
			...reportState,
			photos: {
				where: { status: { in: ['accepted', 'published', 'unpublished'] } },
				orderBy: { position: 'asc' },
				select: { id: true, status: true },
			},
		},
	});
}

/**
 * retention.purge: photos not attached to a pet or report for 24 h (pet photos of a deleted pet are detached by the
 * foreign key, so they qualify too) and photos of reports closed or reunited before `endedBefore`.
 */
export async function listPurgeable(cutoffs: { unattachedBefore: Date; endedBefore: Date }, take: number, tx?: Tx) {
	const db = tx ?? prisma;
	const ended = { lt: cutoffs.endedBefore };
	return db.photos.findMany({
		where: {
			OR: [
				{ pet_id: null, report_id: null, updated_at: { lt: cutoffs.unattachedBefore } },
				{
					report: {
						OR: [
							{ status: 'closed', closed_at: ended },
							{ status: 'reunited', reunited_at: ended },
						],
					},
				},
			],
		},
		select: { id: true, owner_id: true, report_id: true },
		take,
	});
}

export async function removeMany(ids: string[], tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	return (await db.photos.deleteMany({ where: { id: { in: ids } } })).count;
}

export default { upsertByHash, findById, update, markUploaded, remove, findReportPhotos, listPurgeable, removeMany };

// Prisma access for pet profiles (C4) and their photos (C5). Every function takes an optional transaction client.
import type { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

/** Attached photos that have an upload (pending ones have none) and were not rejected, in order. */
const photos = {
	where: { status: { notIn: ['pending', 'rejected'] } },
	orderBy: { position: 'asc' },
	select: { id: true },
} satisfies Prisma.pets$photosArgs;

export async function findById(id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.pets.findUnique({ where: { id }, include: { photos } });
}

export type PetRow = NonNullable<Awaited<ReturnType<typeof findById>>>;

export async function listByOwner(owner_id: string, tx?: Tx): Promise<PetRow[]> {
	const db = tx ?? prisma;
	return db.pets.findMany({
		where: { owner_id },
		orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
		include: { photos },
	});
}

/** Locks the owner's profile row until the transaction ends, so concurrent creates cannot pass the limit together. */
export async function countActiveLocked(owner_id: string, tx: Tx): Promise<number> {
	await tx.$queryRaw`select 1 from app.profiles where id = ${owner_id}::uuid for update`;
	return tx.pets.count({ where: { owner_id, archived_at: null } });
}

export async function create(data: Prisma.petsUncheckedCreateInput, tx?: Tx): Promise<{ id: string }> {
	const db = tx ?? prisma;
	return db.pets.create({ data, select: { id: true } });
}

export async function update(id: string, data: Prisma.petsUncheckedUpdateInput, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.pets.update({ where: { id }, data, select: { id: true } });
}

/** Sets archived_at once; archiving again keeps the first time. */
export async function archive(id: string, now: Date, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.pets.updateMany({ where: { id, archived_at: null }, data: { archived_at: now } });
}

/** Ids of pets of other owners with this chip number (moderators see them; the owners never do). */
export async function findOtherOwnersChip(chip_number: string, owner_id: string, tx?: Tx): Promise<string[]> {
	const db = tx ?? prisma;
	const rows = await db.pets.findMany({
		where: { chip_number, owner_id: { not: owner_id } },
		select: { id: true },
		orderBy: { created_at: 'asc' },
	});
	return rows.map((r) => r.id);
}

/** A `duplicate_chip` moderation flag (C11) on the pet that just got the chip. */
export async function flagDuplicateChip(pet_id: string, other_pet_ids: string[], tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	await db.moderation_flags.create({
		data: { kind: 'duplicate_chip', target_type: 'pet', target_id: pet_id, details: { other_pet_ids } },
	});
}

/**
 * PUT /v1/pets/:id/photos: sets the pet's photos in order (position = index), from the owner's photos on no other pet
 * (unattached, or on the owner's report, TASK-114.5) or photos already on this pet; photos left out are detached
 * (retention.purge removes them after 24 h unless a report has them). Returns how many of `photo_ids` were attached.
 * A photo on both shares one position, so the pet and the report keep its order relative to their shared photos.
 */
export async function setPhotos(input: { pet_id: string; owner_id: string; photo_ids: string[] }, tx: Tx) {
	const { pet_id, owner_id, photo_ids } = input;
	await tx.photos.updateMany({ where: { pet_id, id: { notIn: photo_ids } }, data: { pet_id: null } });
	let attached = 0;
	for (const [position, id] of photo_ids.entries()) {
		const { count } = await tx.photos.updateMany({
			where: { id, OR: [{ pet_id }, { owner_id, pet_id: null }] },
			data: { pet_id, position },
		});
		attached += count;
	}
	return attached;
}

/**
 * Deletes the pet and its photo rows, except those a report shows (the foreign key only unlinks them from the pet);
 * returns the deleted photos, whose objects the caller queues for deletion.
 */
export async function remove(id: string, tx: Tx) {
	const removed = await tx.photos.findMany({
		where: { pet_id: id, report_id: null },
		select: { id: true, owner_id: true, report_id: true, public_display_url: true, public_thumb_url: true },
	});
	await tx.photos.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } });
	await tx.pets.delete({ where: { id }, select: { id: true } });
	return removed;
}

export default {
	findById,
	listByOwner,
	countActiveLocked,
	create,
	update,
	archive,
	findOtherOwnersChip,
	flagDuplicateChip,
	setPhotos,
	remove,
};

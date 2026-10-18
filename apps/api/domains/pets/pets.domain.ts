// Pet profiles (C4, FR-002): owner-only CRUD, chip normalisation, the duplicate-chip flag for moderators, the free
// limit of active pets and the pet's photos (C5). Lost reports never count against the limit: they carry their own
// pet details (createReport only reads a pet when given a pet_id).
import { z } from 'zod';

import type { Species } from '@zivali/types';
import { isBreedOf, normalizeChip, type PetInput, type UpdatePetInput } from '@zivali/validation';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { photoObjects, variantRef } from '../photos/photo-objects.ts';
import PetsDao, { type PetRow } from './pets.dao.ts';

/** app_config `pets.free_limit` when unset or malformed (C4). */
export const DEFAULT_FREE_LIMIT = 2;
const FreeLimit = z.number().int().nonnegative();
const THUMB_TTL_S = 600;
const CAT_ONLY = ['ear_tip', 'lifestyle'] as const;

export type PetView = { pet: PetRow; photos: { id: string; thumb_url: string }[] };
type CreateInput = z.infer<typeof PetInput>;
type UpdateInput = z.infer<typeof UpdatePetInput>;

function invalid(path: string, message: string): AppError {
	return new AppError('VALIDATION', message, undefined, [{ path, message }]);
}

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

/** Pets need a real account (the route guard rejects anonymous finders too). */
function ownerId(ctx: Ctx): string {
	if (!ctx.actor || ctx.actor.is_anonymous) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor.user_id;
}

/** Owners only: staff included, nobody else reads or changes a pet (the chip number never leaves its owner). */
async function getOwned(id: string, owner_id: string, tx?: Prisma.TransactionClient): Promise<PetRow> {
	const pet = await PetsDao.findById(id, tx);
	if (!pet) throw new AppError('NOT_FOUND', 'Pet not found');
	if (pet.owner_id !== owner_id) throw new AppError('FORBIDDEN', 'Not your pet');
	return pet;
}

/** The pet as it will be stored: breeds of its species, the cat fields only on cats. */
function checkTraits(pet: {
	species: Species;
	breed_codes: string[];
	ear_tip: boolean | null;
	lifestyle: string | null;
}) {
	pet.breed_codes.forEach((code, i) => {
		if (!isBreedOf(code, pet.species)) throw invalid(`breed_codes.${i}`, 'Breed of another species');
	});
	if (pet.species !== 'cat') for (const key of CAT_ONLY) if (pet[key] !== null) throw invalid(key, 'Cats only');
}

/** The raw `chip` becomes chip_number and chip_status (an invalid chip is stored as null, never blocked). */
function columns<T extends { chip?: string | null }>({ chip, ...rest }: T) {
	const normalized = chip === undefined ? undefined : normalizeChip(chip);
	return { ...rest, chip_number: normalized?.chip, chip_status: normalized?.status };
}

/** The same chip on another owner's pet goes to moderators (C11); neither owner learns of the other. */
async function flagDuplicateChip(
	pet: { id: string; owner_id: string; chip_number: string },
	tx: Prisma.TransactionClient
) {
	const others = await PetsDao.findOtherOwnersChip(pet.chip_number, pet.owner_id, tx);
	if (others.length) await PetsDao.flagDuplicateChip(pet.id, others, tx);
}

async function freeLimit(): Promise<number> {
	return FreeLimit.catch(DEFAULT_FREE_LIMIT).parse(await configStore.get('pets.free_limit'));
}

/** Pet photos are private: their thumbs are 10-minute presigned GETs (they resolve once photo.process accepts them). */
async function toView(pet: PetRow, ctx: Ctx): Promise<PetView> {
	const photos = await Promise.all(
		pet.photos.map(async ({ id }) => ({
			id,
			thumb_url: await ctx.adapters.storage.presignGet(variantRef(id, 'thumb.webp'), { expiresInS: THUMB_TTL_S }),
		}))
	);
	return { pet, photos };
}

async function view(id: string, ctx: Ctx): Promise<PetView> {
	return toView((await PetsDao.findById(id, ctx.tx))!, ctx);
}

/** GET /v1/pets: the caller's pets, archived ones included (archived_at set), oldest first. */
export async function listPets(_input: void, ctx: Ctx): Promise<PetView[]> {
	const pets = await PetsDao.listByOwner(ownerId(ctx), ctx.tx);
	return Promise.all(pets.map((pet) => toView(pet, ctx)));
}

export async function getPet(input: { id: string }, ctx: Ctx): Promise<PetView> {
	return toView(await getOwned(input.id, ownerId(ctx), ctx.tx), ctx);
}

/**
 * POST /v1/pets. Free accounts keep at most `pets.free_limit` active pets (CONFLICT, details.code PET_LIMIT); every
 * account is free until Premium entitlements exist (M4). The owner's profile row is locked while counting.
 */
export async function createPet(input: CreateInput, ctx: Ctx): Promise<PetView> {
	const owner_id = ownerId(ctx);
	const data = columns(input);
	checkTraits({
		species: input.species,
		breed_codes: input.breed_codes ?? [],
		ear_tip: input.ear_tip ?? null,
		lifestyle: input.lifestyle ?? null,
	});
	const limit = await freeLimit();
	const id = await inTransaction(ctx, async (tx) => {
		if ((await PetsDao.countActiveLocked(owner_id, tx)) >= limit)
			throw new AppError('CONFLICT', 'Pet limit reached', { code: 'PET_LIMIT', limit });
		const { id } = await PetsDao.create({ ...data, owner_id }, tx);
		if (data.chip_number) await flagDuplicateChip({ id, owner_id, chip_number: data.chip_number }, tx);
		return id;
	});
	return view(id, ctx);
}

/** PATCH /v1/pets/:id: the merged pet must pass checkTraits; a new chip number is checked for duplicates. */
export async function updatePet({ id, ...input }: UpdateInput & { id: string }, ctx: Ctx): Promise<PetView> {
	const owner_id = ownerId(ctx);
	await inTransaction(ctx, async (tx) => {
		const pet = await getOwned(id, owner_id, tx);
		checkTraits({
			species: input.species ?? pet.species,
			breed_codes: input.breed_codes ?? pet.breed_codes,
			ear_tip: input.ear_tip === undefined ? pet.ear_tip : input.ear_tip,
			lifestyle: input.lifestyle === undefined ? pet.lifestyle : input.lifestyle,
		});
		const data = columns(input);
		await PetsDao.update(id, data, tx);
		if (data.chip_number && data.chip_number !== pet.chip_number)
			await flagDuplicateChip({ id, owner_id, chip_number: data.chip_number }, tx);
	});
	return view(id, ctx);
}

/** POST /v1/pets/:id/archive: frees a place under the limit; archiving again keeps the first archived_at. */
export async function archivePet(input: { id: string }, ctx: Ctx): Promise<PetView> {
	const pet = await getOwned(input.id, ownerId(ctx), ctx.tx);
	await PetsDao.archive(pet.id, ctx.now, ctx.tx);
	return view(pet.id, ctx);
}

/**
 * DELETE /v1/pets/:id: the pet and its photo rows go now, their objects through retention.purge (same transaction);
 * photos a report shows stay on it.
 */
export async function deletePet(input: { id: string }, ctx: Ctx): Promise<void> {
	const owner_id = ownerId(ctx);
	await inTransaction(ctx, async (tx) => {
		await getOwned(input.id, owner_id, tx);
		const photos = await PetsDao.remove(input.id, tx);
		if (photos.length) await ctx.jobs.send('retention.purge', { objects: photos.flatMap(photoObjects) }, { tx });
	});
}

/** PUT /v1/pets/:id/photos (C5): the owner's photos on no other pet (on a report too) or the pet's own, in order. */
export async function setPetPhotos(input: { id: string; photo_ids: string[] }, ctx: Ctx): Promise<PetView> {
	const owner_id = ownerId(ctx);
	await inTransaction(ctx, async (tx) => {
		await getOwned(input.id, owner_id, tx);
		const attached = await PetsDao.setPhotos({ pet_id: input.id, owner_id, photo_ids: input.photo_ids }, tx);
		if (attached !== input.photo_ids.length) throw invalid('photo_ids', 'Unknown or foreign photo');
	});
	return view(input.id, ctx);
}

export default { listPets, getPet, createPet, updatePet, archivePet, deletePet, setPetPhotos };

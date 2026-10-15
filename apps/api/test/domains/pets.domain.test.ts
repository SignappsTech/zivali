// Pets domain (C4, FR-002) against the local database: chip normalisation, the duplicate-chip flag (C11) that never
// reveals the other owner, the free limit (never applied to lost reports), cat-only fields and deletion with photos.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import type { ObjectRef } from '../../adapters/storage/index.ts';
import { DEFAULT_FREE_LIMIT, PetsDomain, PetsMapper } from '../../domains/pets/index.ts';
import { PhotosDomain } from '../../domains/photos/index.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
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
const other = actor();
const users = [owner, other];
const ctx = (a: Actor) => userCtx(a);
/** A fresh valid 15-digit chip (ISO 11784), unique per call. */
const chip = () => `985${randomInt(100_000_000_000, 999_999_999_999)}`;
const pet = (a: Actor, input: Record<string, unknown> = {}) =>
	PetsDomain.createPet({ species: 'dog', name: 'Piki', ...input } as never, ctx(a));
const flags = (target_id: string) =>
	prisma.moderation_flags.findMany({ where: { kind: 'duplicate_chip', target_type: 'pet', target_id } });
async function rejects(promise: Promise<unknown>): Promise<AppError> {
	const err = await promise.then(
		() => undefined,
		(e: unknown) => e
	);
	expect(err).toBeInstanceOf(AppError);
	return err as AppError;
}
const clearPets = (a: Actor) => prisma.pets.deleteMany({ where: { owner_id: a.user_id } });

beforeAll(async () => {
	await prisma.profiles.createMany({ data: users.map((u) => ({ id: u.user_id })) });
});

afterAll(async () => {
	const ids = users.map((u) => u.user_id);
	const pets = await prisma.pets.findMany({ where: { owner_id: { in: ids } }, select: { id: true } });
	await prisma.moderation_flags.deleteMany({ where: { target_id: { in: pets.map((p) => p.id) } } });
	await prisma.reports.deleteMany({ where: { created_by: { in: ids } } });
	await prisma.profiles.deleteMany({ where: { id: { in: ids } } });
});

describe('chip numbers', () => {
	it('normalises the chip (spaces, dashes, dots) and keeps an invalid one as null with chip_status invalid', async () => {
		const raw = chip();
		const spaced = `${raw.slice(0, 3)} ${raw.slice(3, 6)}-${raw.slice(6, 9)}.${raw.slice(9)}`;
		const valid = await pet(owner, { chip: spaced, chip_registered_crhz: 'yes' });
		expect(valid.pet).toMatchObject({ chip_number: raw, chip_status: 'valid', chip_registered_crhz: 'yes' });

		const invalid = await pet(owner, { chip: '12-AB', chip_registered_crhz: 'unknown' });
		expect(invalid.pet).toMatchObject({
			chip_number: null,
			chip_status: 'invalid',
			chip_registered_crhz: 'unknown',
		});
		await clearPets(owner);

		const none = await pet(owner);
		expect(none.pet).toMatchObject({ chip_number: null, chip_status: 'none', chip_registered_crhz: null });

		// PATCH: a new chip is normalised, an omitted chip stays, null clears it.
		await PetsDomain.updatePet({ id: none.pet.id, chip: spaced }, ctx(owner));
		const kept = await PetsDomain.updatePet({ id: none.pet.id, name: 'Piki II' }, ctx(owner));
		expect(kept.pet).toMatchObject({ name: 'Piki II', chip_number: raw, chip_status: 'valid' });
		const cleared = await PetsDomain.updatePet({ id: none.pet.id, chip: null }, ctx(owner));
		expect(cleared.pet).toMatchObject({ chip_number: null, chip_status: 'none' });
		await clearPets(owner);
	});
});

describe('duplicate chips', () => {
	it('flags a chip already on another owner’s pet for moderators, revealing nothing to either owner', async () => {
		const shared = chip();
		const first = await pet(owner, { chip: shared });
		expect(await flags(first.pet.id)).toEqual([]);

		const second = await pet(other, { chip: shared, species: 'cat', name: 'Muri' });
		const [flag, ...more] = await flags(second.pet.id);
		expect(more).toEqual([]);
		expect(flag).toMatchObject({ details: { other_pet_ids: [first.pet.id] }, resolved_at: null });

		// Each owner sees only their own pet; no field points at the other pet or owner.
		for (const [a, mine, theirs] of [
			[other, second, first],
			[owner, first, second],
		] as const) {
			const dto = JSON.stringify((await PetsDomain.listPets(undefined, ctx(a))).map(PetsMapper.toPetDto));
			expect(dto).toContain(mine.pet.id);
			expect(dto).not.toContain(theirs.pet.id);
			expect(dto).not.toContain(theirs.pet.owner_id);
		}
		await clearPets(owner);
		await clearPets(other);
	});

	it('flags on PATCH only when the chip changes, and never for the same owner’s pets', async () => {
		const shared = chip();
		const theirs = await pet(other, { chip: shared });
		const twin = await pet(other, { chip: shared, name: 'Twin' });
		expect(await flags(twin.pet.id)).toEqual([]);

		const mine = await pet(owner, { chip: chip() });
		expect(await flags(mine.pet.id)).toEqual([]);
		await PetsDomain.updatePet({ id: mine.pet.id, chip: shared }, ctx(owner));
		await PetsDomain.updatePet({ id: mine.pet.id, chip: shared, name: 'Again' }, ctx(owner));
		const list = await flags(mine.pet.id);
		expect(list).toHaveLength(1);
		expect((list[0]!.details as { other_pet_ids: string[] }).other_pet_ids.sort()).toEqual(
			[theirs.pet.id, twin.pet.id].sort()
		);
		await clearPets(owner);
		await clearPets(other);
	});
});

describe('free limit', () => {
	it(`keeps ${DEFAULT_FREE_LIMIT} active pets (CONFLICT PET_LIMIT); archived pets do not count`, async () => {
		const pets = [await pet(owner), await pet(owner)];
		const err = await rejects(pet(owner));
		expect(err.code).toBe('CONFLICT');
		expect(err.details).toEqual({ code: 'PET_LIMIT', limit: DEFAULT_FREE_LIMIT });
		expect(await prisma.pets.count({ where: { owner_id: owner.user_id } })).toBe(2);

		const archived = await PetsDomain.archivePet({ id: pets[0]!.pet.id }, ctx(owner));
		expect(archived.pet.archived_at).toBeInstanceOf(Date);
		const again = await PetsDomain.archivePet({ id: pets[0]!.pet.id }, systemCtx({ actor: owner }));
		expect(again.pet.archived_at).toEqual(archived.pet.archived_at);
		await pet(owner);
		expect((await rejects(pet(owner))).details).toMatchObject({ code: 'PET_LIMIT' });
		await clearPets(owner);
	});

	it('lets only one of two concurrent creates take the last place', async () => {
		await pet(owner);
		const results = await Promise.allSettled([pet(owner), pet(owner)]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(await prisma.pets.count({ where: { owner_id: owner.user_id, archived_at: null } })).toBe(2);
		await clearPets(owner);
	});

	it('never applies to lost reports: an owner at the limit still reports a lost pet', async () => {
		await pet(owner);
		await pet(owner);
		const photo = await prisma.photos.create({
			data: {
				owner_id: owner.user_id,
				sha256: randomBytes(32).toString('hex'),
				width: 800,
				height: 600,
				bytes: 50_000,
			},
		});
		const created = await ReportsDomain.createReport(
			{
				type: 'lost',
				species: 'cat',
				name: 'Inline',
				location: { lat: 46.0514, lng: 14.506 },
				event_at: new Date(Date.now() - 3600_000).toISOString(),
				photo_ids: [photo.id],
			} as never,
			ctx(owner)
		);
		expect(created.short_code).toHaveLength(8);
		expect(await prisma.pets.count({ where: { owner_id: owner.user_id } })).toBe(2);
		await clearPets(owner);
	});
});

describe('cat fields and breeds', () => {
	it('accepts ear_tip and lifestyle on cats only, also for the pet as stored after a PATCH', async () => {
		const cat = await pet(owner, { species: 'cat', name: 'Muri', ear_tip: true, lifestyle: 'outdoor' });
		expect(cat.pet).toMatchObject({ species: 'cat', ear_tip: true, lifestyle: 'outdoor' });

		expect((await rejects(pet(owner, { ear_tip: false }))).issues).toEqual([
			{ path: 'ear_tip', message: 'Cats only' },
		]);
		expect((await rejects(pet(owner, { lifestyle: 'indoor' }))).code).toBe('VALIDATION');

		// Turning the cat into a dog keeps its cat fields unless they are cleared too.
		const toDog = await rejects(PetsDomain.updatePet({ id: cat.pet.id, species: 'dog' }, ctx(owner)));
		expect(toDog.issues?.[0]?.path).toBe('ear_tip');
		const dog = await PetsDomain.updatePet(
			{ id: cat.pet.id, species: 'dog', ear_tip: null, lifestyle: null },
			ctx(owner)
		);
		expect(dog.pet).toMatchObject({ species: 'dog', ear_tip: null, lifestyle: null });

		// Breeds must match the species the pet ends up with.
		await PetsDomain.updatePet({ id: cat.pet.id, breed_codes: ['dog.mixed'] }, ctx(owner));
		const breed = await rejects(PetsDomain.updatePet({ id: cat.pet.id, species: 'cat' }, ctx(owner)));
		expect(breed.issues).toEqual([{ path: 'breed_codes.0', message: 'Breed of another species' }]);
		await clearPets(owner);
	});
});

describe('ownership', () => {
	it('answers NOT_FOUND for an unknown pet and FORBIDDEN for another owner’s, staff included', async () => {
		const mine = await pet(owner);
		const id = mine.pet.id;
		expect((await rejects(PetsDomain.getPet({ id: randomUUID() }, ctx(owner)))).code).toBe('NOT_FOUND');
		for (const a of [other, { ...other, role: 'ADMIN', aal: 'aal2' } as Actor]) {
			for (const call of [
				() => PetsDomain.getPet({ id }, ctx(a)),
				() => PetsDomain.updatePet({ id, name: 'Mine now' }, ctx(a)),
				() => PetsDomain.archivePet({ id }, ctx(a)),
				() => PetsDomain.deletePet({ id }, ctx(a)),
				() => PetsDomain.setPetPhotos({ id, photo_ids: [] }, ctx(a)),
			])
				expect((await rejects(call())).code).toBe('FORBIDDEN');
		}
		expect((await rejects(PetsDomain.listPets(undefined, systemCtx()))).code).toBe('UNAUTHENTICATED');
		expect((await rejects(pet({ ...owner, is_anonymous: true }))).code).toBe('UNAUTHENTICATED');
		expect(await prisma.pets.findUnique({ where: { id } })).toMatchObject({ name: 'Piki', archived_at: null });
		await clearPets(owner);
	});
});

describe('photos', () => {
	const storage = adapters.storage;
	const newPhoto = async (a: Actor, data: Record<string, unknown> = {}) => {
		const photo = await prisma.photos.create({
			data: {
				owner_id: a.user_id,
				sha256: randomBytes(32).toString('hex'),
				width: 800,
				height: 600,
				bytes: 50_000,
				status: 'accepted',
				...data,
			},
		});
		const refs: ObjectRef[] = ['display.webp', 'display.jpg', 'thumb.webp'].map((v) => ({
			bucket: 'private',
			key: `variants/${photo.id}/${v}`,
		}));
		for (const ref of refs) await storage.put(ref, Buffer.from('x'), 'image/webp');
		return { id: photo.id, refs };
	};

	it('sets the photos in order with private thumbs, refusing foreign ones', async () => {
		const mine = await pet(owner);
		const [a, b, c] = [await newPhoto(owner), await newPhoto(owner), await newPhoto(owner)];
		const set = await PetsDomain.setPetPhotos({ id: mine.pet.id, photo_ids: [b.id, a.id] }, ctx(owner));
		expect(set.photos.map((p) => p.id)).toEqual([b.id, a.id]);
		expect(set.photos[0]!.thumb_url).toContain(`variants/${b.id}/thumb.webp`);

		const foreign = await newPhoto(other);
		const err = await rejects(
			PetsDomain.setPetPhotos({ id: mine.pet.id, photo_ids: [a.id, foreign.id] }, ctx(owner))
		);
		expect(err.issues?.[0]?.path).toBe('photo_ids');
		expect((await PetsDomain.getPet({ id: mine.pet.id }, ctx(owner))).photos.map((p) => p.id)).toEqual([
			b.id,
			a.id,
		]);

		// Reordering keeps the pet's own photos; the one left out is detached (purged after 24 h).
		const reordered = await PetsDomain.setPetPhotos({ id: mine.pet.id, photo_ids: [c.id, a.id] }, ctx(owner));
		expect(reordered.photos.map((p) => p.id)).toEqual([c.id, a.id]);
		expect(await prisma.photos.findUnique({ where: { id: b.id } })).toMatchObject({ pet_id: null });

		// Rejected photos never show.
		await prisma.photos.update({ where: { id: c.id }, data: { status: 'rejected' } });
		expect((await PetsDomain.getPet({ id: mine.pet.id }, ctx(owner))).photos.map((p) => p.id)).toEqual([a.id]);
		await prisma.photos.deleteMany({ where: { id: { in: [b.id, foreign.id] } } });
		await clearPets(owner);
		await prisma.photos.deleteMany({ where: { owner_id: owner.user_id } });
	});

	it('deletes the pet with its photo rows and queues retention.purge for their objects', async () => {
		const mine = await pet(owner);
		const photos = [await newPhoto(owner), await newPhoto(owner)];
		await PetsDomain.setPetPhotos({ id: mine.pet.id, photo_ids: photos.map((p) => p.id) }, ctx(owner));

		await PetsDomain.deletePet({ id: mine.pet.id }, ctx(owner));
		expect(await prisma.pets.findUnique({ where: { id: mine.pet.id } })).toBeNull();
		expect(await prisma.photos.count({ where: { id: { in: photos.map((p) => p.id) } } })).toBe(0);

		const jobs = await prisma.$queryRaw<{ data: { objects: ObjectRef[] } }[]>`
			delete from pgboss.job where name = 'retention.purge' and data::text like ${`%${photos[0]!.id}%`}
			returning data`;
		expect(jobs).toHaveLength(1);
		const keys = jobs[0]!.data.objects.map((o) => o.key);
		for (const p of photos) for (const ref of p.refs) expect(keys).toContain(ref.key);
		// What the worker does with the job: the objects are gone.
		await PhotosDomain.deleteObjects(jobs[0]!.data.objects, systemCtx());
		for (const p of photos) for (const ref of p.refs) expect(await storage.head(ref)).toBeNull();
	});
});

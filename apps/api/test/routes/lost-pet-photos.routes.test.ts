// TASK-114.5: a saved pet with photos reported lost with more photos added. POST /v1/photos answers a re-picked
// image with the pet photo's id (dedupe by owner and hash), so the report and the pet share photo rows (C5).
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CreateReportResponse } from '@zivali/validation';

import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const owner = randomUUID();
const other = randomUUID();
const tokens: Record<string, string> = {};
const LJ = { lat: 46.0514263, lng: 14.5060547 };

const as = (req: request.Test, user = owner) =>
	req.set('Authorization', `Bearer ${tokens[user]}`).set('x-forwarded-for', ip());
const ip = () => `198.51.100.${randomInt(1, 255)}`;
/** An uploaded, accepted photo (what /complete and photo.process leave behind), of the owner unless told. */
const photo = async (owner_id = owner) =>
	prisma.photos.create({
		data: {
			owner_id,
			sha256: randomBytes(32).toString('hex'),
			width: 1600,
			height: 1200,
			bytes: 50_000,
			status: 'accepted',
		},
	});
/** A lost report: of the pet, or with the attributes inline (no pet_id). */
const report = (pet_id: string | undefined, photo_ids: string[], user = owner) =>
	as(request(app).post('/v1/reports').set('Idempotency-Key', randomUUID()), user).send({
		type: 'lost',
		species: 'cat',
		pet_id,
		location: LJ,
		event_at: new Date(Date.now() - 3600_000).toISOString(),
		photo_ids,
	});
const newPet = async (name: string, user = owner) =>
	(await as(request(app).post('/v1/pets'), user).send({ species: 'cat', name })).body.id as string;
const setPetPhotos = (pet_id: string, photo_ids: string[], user = owner) =>
	as(request(app).put(`/v1/pets/${pet_id}/photos`), user).send({ photo_ids });
const order = async (where: { pet_id: string } | { report_id: string }) =>
	(await prisma.photos.findMany({ where, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true } })).map(
		(p) => p.id
	);
const close = (id: string, status: 'closed' | 'reunited' = 'closed') =>
	prisma.reports.update({
		where: { id },
		data: status === 'closed' ? { status, closed_at: new Date() } : { status, reunited_at: new Date() },
	});
const refused = (res: request.Response) => {
	expect(res.status).toBe(400);
	expect(res.body.error.issues[0]).toEqual({ path: 'photo_ids', message: 'Unknown or foreign photo' });
};

beforeAll(async () => {
	await prisma.profiles.createMany({ data: [{ id: owner }, { id: other }] });
	for (const user of [owner, other]) tokens[user] = await signTestToken({ sub: user });
});

afterAll(async () => {
	const users = [owner, other];
	const reports = (await prisma.reports.findMany({ where: { created_by: { in: users } }, select: { id: true } })).map(
		(r) => r.id
	);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reports}::text[])`;
	await prisma.reports.deleteMany({ where: { id: { in: reports } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: { in: users } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

describe('a saved pet with photos reported lost with added photos', () => {
	it('publishes with the pet photos and the added ones; the pet keeps its photos and can save them again', async () => {
		const pet = await as(request(app).post('/v1/pets')).send({ species: 'cat', name: 'Muri' });
		expect(pet.status).toBe(201);
		const [a, b] = [await photo(), await photo()];
		expect((await setPetPhotos(pet.body.id, [a.id, b.id])).status).toBe(200);

		// The owner picks the pet's first photo again: the API answers with the pet photo's id.
		const again = await as(request(app).post('/v1/photos')).send({
			sha256: a.sha256,
			width: a.width,
			height: a.height,
			bytes: a.bytes,
		});
		expect(again.body).toEqual({ photo_id: a.id, existing: true });

		const added = await photo();
		const res = await report(pet.body.id, [a.id, b.id, added.id]);
		expect(res.status).toBe(201);
		expect(await order({ report_id: res.body.id })).toEqual([a.id, b.id, added.id]);
		expect(await order({ pet_id: pet.body.id })).toEqual([a.id, b.id]);

		// The photo added on the report saves on the pet too (PUT /v1/pets/:id/photos), and stays on the report.
		const saved = await setPetPhotos(pet.body.id, [a.id, b.id, added.id]);
		expect(saved.status).toBe(200);
		expect(saved.body.photos.map((p: { id: string }) => p.id)).toEqual([a.id, b.id, added.id]);
		expect(await order({ report_id: res.body.id })).toEqual([a.id, b.id, added.id]);

		// Deleting the pet keeps the photos the report shows (only the pet's link goes).
		expect((await as(request(app).delete(`/v1/pets/${pet.body.id}`))).status).toBe(204);
		expect(await order({ report_id: res.body.id })).toEqual([a.id, b.id, added.id]);
	});

	it('refuses more than 5 photos; a pet lost again takes its photos off the ended report, never off an open one', async () => {
		const pet = await newPet('Liza');
		const six = await Promise.all(Array.from({ length: 6 }, () => photo()));
		const [p0, p1, p2] = six as [(typeof six)[0], (typeof six)[0], (typeof six)[0]];
		const tooMany = await report(
			pet,
			six.map((p) => p.id)
		);
		expect(tooMany.status).toBe(400);
		expect(tooMany.body.error.issues[0].path).toBe('photo_ids');

		expect((await setPetPhotos(pet, [p0.id])).status).toBe(200);
		const first = await report(pet, [p0.id]);
		expect(first.status).toBe(201);
		// What photo.publish left on the first report: public copies under r/<first>/<photo>/.
		const media = `https://media.test/r/${first.body.id}/${p0.id}`;
		await prisma.photos.update({
			where: { id: p0.id },
			data: {
				status: 'published',
				public_display_url: `${media}/display.jpg`,
				public_thumb_url: `${media}/thumb.webp`,
			},
		});
		// While the first report is open, no other report takes its photo.
		refused(await report(undefined, [p0.id]));

		await close(first.body.id);
		const again = await report(pet, [p0.id, p1.id]);
		expect(again.status).toBe(201);
		expect(await order({ report_id: again.body.id })).toEqual([p0.id, p1.id]);
		expect(await order({ report_id: first.body.id })).toEqual([]);
		// Detached from the first report: unpublished, so photo.publish copies it anew; still the pet's photo.
		expect(await prisma.photos.findUnique({ where: { id: p0.id } })).toMatchObject({
			pet_id: pet,
			status: 'unpublished',
			public_display_url: null,
			public_thumb_url: null,
		});
		// The first report's public copies are queued for deletion with the write.
		const jobs = await prisma.$queryRaw<{ data: { objects: { bucket: string; key: string }[] } }[]>`
			delete from pgboss.job where name = 'retention.purge' and data::text like ${`%r/${first.body.id}/${p0.id}/%`}
			returning data`;
		expect(jobs).toHaveLength(1);
		expect(jobs[0]!.data.objects).toContainEqual({
			bucket: 'media',
			key: `r/${first.body.id}/${p0.id}/display.jpg`,
		});

		// The same from a reunited report.
		await close(again.body.id, 'reunited');
		const third = await report(pet, [p1.id, p2.id]);
		expect(third.status).toBe(201);
		expect(await order({ report_id: third.body.id })).toEqual([p1.id, p2.id]);
		await prisma.pets.delete({ where: { id: pet } });
	});

	it("refuses another user's photos, on a pet or on an ended report, on POST /v1/reports and PUT /v1/pets/:id/photos", async () => {
		const theirPet = await newPet('Tačka', other);
		const onTheirPet = await photo(other);
		expect((await setPetPhotos(theirPet, [onTheirPet.id], other)).status).toBe(200);
		const theirs = await photo(other);
		const theirReport = await report(theirPet, [theirs.id], other);
		expect(theirReport.status).toBe(201);
		await close(theirReport.body.id);

		const mine = await newPet('Bela');
		const own = await photo();
		for (const foreign of [onTheirPet.id, theirs.id]) {
			refused(await report(mine, [own.id, foreign]));
			const put = await setPetPhotos(mine, [own.id, foreign]);
			expect(put.status).toBe(400);
			expect(put.body.error.issues[0]).toEqual({ path: 'photo_ids', message: 'Unknown or foreign photo' });
		}
		// Nothing moved: their photos stay where they were, mine stays unattached.
		expect(await prisma.photos.findUnique({ where: { id: onTheirPet.id } })).toMatchObject({ pet_id: theirPet });
		expect(await prisma.photos.findUnique({ where: { id: theirs.id } })).toMatchObject({
			report_id: theirReport.body.id,
		});
		expect(await prisma.photos.findUnique({ where: { id: own.id } })).toMatchObject({
			pet_id: null,
			report_id: null,
		});
		await prisma.pets.deleteMany({ where: { id: { in: [theirPet, mine] } } });
	});
});

describe('a saved pet reported lost without photo_ids (TASK-29.13, CH-348)', () => {
	it("takes the pet's photos in order: referenced, not copied, never a rejected one or one on an open report", async () => {
		const pet = await newPet('Pika');
		const [a, b, onOpen, rejected] = [await photo(), await photo(), await photo(), await photo()];
		// A photo on another open report of the owner (an inline lost report) may still be saved on the pet.
		const inline = await report(undefined, [onOpen.id]);
		expect(inline.status).toBe(201);
		expect((await setPetPhotos(pet, [a.id, onOpen.id, b.id])).status).toBe(200);
		await prisma.photos.update({
			where: { id: rejected.id },
			data: { pet_id: pet, position: 3, status: 'rejected' },
		});
		const before = await prisma.photos.findMany({ where: { owner_id: owner }, orderBy: { id: 'asc' } });

		const res = await report(pet, []);
		expect(res.status).toBe(201);
		expect(CreateReportResponse.strict().safeParse(res.body).success).toBe(true);
		expect(res.body.photo_ids).toEqual([a.id, b.id]);
		expect(await order({ report_id: res.body.id })).toEqual([a.id, b.id]);
		expect(await order({ report_id: inline.body.id })).toEqual([onOpen.id]);
		// The pet keeps all four (one shared position column, C5: a and b keep their order relative to each other).
		expect((await order({ pet_id: pet })).sort()).toEqual([a.id, b.id, onOpen.id, rejected.id].sort());
		// The same rows, no new ones: each keeps its upload time (created_at), which the AI cutoff reads (TASK-40.11).
		const after = await prisma.photos.findMany({ where: { owner_id: owner }, orderBy: { id: 'asc' } });
		expect(after.map((p) => [p.id, p.created_at])).toEqual(before.map((p) => [p.id, p.created_at]));
		const jobs = await prisma.$queryRaw<{ name: string }[]>`
			select name from pgboss.job where data->>'report_id' = ${res.body.id} order by name`;
		expect(jobs.map((j) => j.name)).toEqual(['alerts.fanout', 'match.report', 'photo.publish']);

		// Lost again after the report ended: the photos come off the ended report.
		await close(res.body.id);
		const again = await report(pet, []);
		expect(again.status).toBe(201);
		expect(again.body.photo_ids).toEqual([a.id, b.id]);
		expect(await order({ report_id: res.body.id })).toEqual([]);
		// Photos sent explicitly still win over the pet's.
		await close(again.body.id);
		const added = await photo();
		const explicit = await report(pet, [added.id]);
		expect(explicit.body.photo_ids).toEqual([added.id]);
		expect(await order({ report_id: explicit.body.id })).toEqual([added.id]);
		await prisma.pets.delete({ where: { id: pet } });
	});

	it('still needs one photo when the pet has none (or only a rejected one); found reports always send one', async () => {
		const pet = await newPet('Sivko');
		const count = () => prisma.reports.count({ where: { created_by: owner } });
		const before = await count();
		const none = await report(pet, []);
		expect(none.status).toBe(400);
		expect(none.body.error.issues[0]).toEqual({ path: 'photo_ids', message: 'At least one photo' });
		const rejected = await photo();
		await prisma.photos.update({ where: { id: rejected.id }, data: { pet_id: pet, status: 'rejected' } });
		const onlyRejected = await report(pet, []);
		expect(onlyRejected.body.error.issues[0]).toEqual({ path: 'photo_ids', message: 'At least one photo' });
		const found = await as(request(app).post('/v1/reports').set('Idempotency-Key', randomUUID())).send({
			type: 'found',
			species: 'cat',
			location: LJ,
			event_at: new Date(Date.now() - 3600_000).toISOString(),
			photo_ids: [],
		});
		expect(found.status).toBe(400);
		expect(found.body.error.issues[0].path).toBe('photo_ids');
		expect(await count()).toBe(before);
		await prisma.pets.delete({ where: { id: pet } });
	});
});

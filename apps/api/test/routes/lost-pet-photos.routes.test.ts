// TASK-114.5: a saved pet with photos reported lost with more photos added. POST /v1/photos answers a re-picked
// image with the pet photo's id (dedupe by owner and hash), so the report and the pet share photo rows (C5).
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const owner = randomUUID();
let token = '';
const LJ = { lat: 46.0514263, lng: 14.5060547 };

const as = (req: request.Test) => req.set('Authorization', `Bearer ${token}`).set('x-forwarded-for', ip());
const ip = () => `198.51.100.${randomInt(1, 255)}`;
/** An uploaded, accepted photo of the owner (what /complete and photo.process leave behind). */
const photo = async () =>
	prisma.photos.create({
		data: {
			owner_id: owner,
			sha256: randomBytes(32).toString('hex'),
			width: 1600,
			height: 1200,
			bytes: 50_000,
			status: 'accepted',
		},
	});
const report = (pet_id: string, photo_ids: string[]) =>
	as(request(app).post('/v1/reports').set('Idempotency-Key', randomUUID())).send({
		type: 'lost',
		species: 'cat',
		pet_id,
		location: LJ,
		event_at: new Date(Date.now() - 3600_000).toISOString(),
		photo_ids,
	});
const setPetPhotos = (pet_id: string, photo_ids: string[]) =>
	as(request(app).put(`/v1/pets/${pet_id}/photos`)).send({ photo_ids });
const order = async (where: { pet_id: string } | { report_id: string }) =>
	(await prisma.photos.findMany({ where, orderBy: { position: 'asc' }, select: { id: true } })).map((p) => p.id);

beforeAll(async () => {
	await prisma.profiles.create({ data: { id: owner } });
	token = await signTestToken({ sub: owner });
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { created_by: owner } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: owner } });
	await prisma.profiles.deleteMany({ where: { id: owner } });
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

	it('refuses more than 5 photos and a photo of another report, with the photo_ids path', async () => {
		const pet = await as(request(app).post('/v1/pets')).send({ species: 'cat', name: 'Liza' });
		const six = await Promise.all(Array.from({ length: 6 }, photo));
		const tooMany = await report(
			pet.body.id,
			six.map((p) => p.id)
		);
		expect(tooMany.status).toBe(400);
		expect(tooMany.body.error.issues[0].path).toBe('photo_ids');

		const first = await report(pet.body.id, [six[0]!.id]);
		expect(first.status).toBe(201);
		await prisma.reports.update({
			where: { id: first.body.id },
			data: { status: 'closed', closed_at: new Date() },
		});
		// The first report keeps its photo: a second report cannot take it.
		const taken = await report(pet.body.id, [six[0]!.id, six[1]!.id]);
		expect(taken.status).toBe(400);
		expect(taken.body.error.issues[0]).toEqual({ path: 'photo_ids', message: 'Unknown or foreign photo' });
		await prisma.pets.delete({ where: { id: pet.body.id } });
	});
});

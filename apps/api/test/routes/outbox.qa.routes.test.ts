// TASK-86.3 (QA) regression tests for the mobile outbox against the real API (C17 §Outbox, C1, docs/05 "Offline
// queue idempotency"): an outbox retry repeats the whole send (POST /v1/photos for every photo, then POST /v1/reports
// with the outbox id as Idempotency-Key and event_at = captured_at). The retry must yield one report, the same manage
// token and the original capture time.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const HOUR = 3600_000;
const LJ = { lat: 46.0514263, lng: 14.5060547 };
const finder = randomUUID();
let token = '';

const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const as = (req: request.Test) => req.set('Authorization', `Bearer ${token}`).set('x-forwarded-for', ip());
/** What the outbox sends per photo on every attempt (C5): the prepared photo's metadata. */
const meta = (sha256: string) => ({ sha256, width: 1600, height: 1200, bytes: 412_000 });
const registerPhoto = (sha256: string) => as(request(app).post('/v1/photos')).send(meta(sha256));
/** The first attempt's photo: POST, the presigned PUT (in-memory storage) and /complete. */
async function uploadPhoto(sha256: string): Promise<string> {
	const created = await registerPhoto(sha256);
	expect(created.status).toBe(201);
	const { photo_id } = created.body as { photo_id: string };
	await adapters.storage.put(
		{ bucket: 'private', key: `uploads/${finder}/${photo_id}.jpg` },
		Buffer.from('x'),
		'image/jpeg'
	);
	expect((await as(request(app).post(`/v1/photos/${photo_id}/complete`))).status).toBe(202);
	return photo_id;
}
const postReport = (key: string, body: object) =>
	as(request(app).post('/v1/reports')).set('Idempotency-Key', key).send(body);
const reportCount = () => prisma.reports.count({ where: { created_by: finder } });

beforeAll(async () => {
	await prisma.profiles.create({ data: { id: finder, role: 'USER', is_anonymous: true } });
	token = await signTestToken({ sub: finder, is_anonymous: true, aal: 'aal1' });
});

afterAll(async () => {
	const reports = await prisma.reports.findMany({ where: { created_by: finder }, select: { id: true } });
	const reportIds = reports.map((r) => r.id);
	const photos = await prisma.photos.findMany({ where: { owner_id: finder }, select: { id: true } });
	const photoIds = photos.map((p) => p.id);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reportIds}::text[])
		or data->>'photo_id' = any(${photoIds}::text[])`;
	await prisma.photos.deleteMany({ where: { owner_id: finder } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: finder } });
	await prisma.profiles.deleteMany({ where: { id: finder } });
});

describe('outbox retry against the API (C17, C1)', () => {
	it('a lost response and the full retry give one found report, the same manage token and the capture time', async () => {
		const outboxId = randomUUID();
		const sha = randomBytes(32).toString('hex');
		const capturedAt = new Date(Date.now() - 5 * HOUR).toISOString();
		const before = await reportCount();

		// Attempt 1: the report is created, the answer never reaches the phone.
		const photoId = await uploadPhoto(sha);
		const body = { type: 'found', species: 'cat', location: LJ, photo_ids: [photoId], event_at: capturedAt };
		const first = await postReport(outboxId, body);
		expect(first.status).toBe(201);
		expect(typeof first.body.manage_token).toBe('string');

		// Attempt 2 (hours later, after an app restart): every photo is registered again; the photo is now on the
		// report, and the same sha256 still answers the same photo_id, so the body is the same.
		const again = await registerPhoto(sha);
		expect(again.status).toBe(200);
		expect(again.body).toEqual({ photo_id: photoId, existing: true });
		const retry = await postReport(outboxId, { ...body, photo_ids: [again.body.photo_id] });

		expect(retry.status).toBe(201);
		expect(retry.headers['idempotent-replayed']).toBe('true');
		expect(retry.body).toEqual(first.body);
		expect(await reportCount()).toBe(before + 1);
		// The original capture time is what matching reads (AC #5), not the time of the send.
		const row = await prisma.reports.findUniqueOrThrow({ where: { id: first.body.id } });
		expect(row.event_at.toISOString()).toBe(capturedAt);
	});

	it('a sighting without photos replays the same way', async () => {
		const outboxId = randomUUID();
		const before = await reportCount();
		const body = {
			type: 'sighted',
			species: 'dog',
			location: LJ,
			photo_ids: [],
			event_at: new Date(Date.now() - HOUR).toISOString(),
		};
		const first = await postReport(outboxId, body);
		expect(first.status).toBe(201);
		const retry = await postReport(outboxId, body);
		expect(retry.status).toBe(201);
		expect(retry.body).toEqual(first.body);
		expect(await reportCount()).toBe(before + 1);
	});

	it('a found retry after the key expired (24 h) is refused, not duplicated: its photo is on the first report', async () => {
		const outboxId = randomUUID();
		const sha = randomBytes(32).toString('hex');
		const photoId = await uploadPhoto(sha);
		const body = {
			type: 'found',
			species: 'cat',
			location: LJ,
			photo_ids: [photoId],
			event_at: new Date(Date.now() - 2 * HOUR).toISOString(),
		};
		expect((await postReport(outboxId, body)).status).toBe(201);
		const before = await reportCount();
		await prisma.idempotency_keys.update({
			where: { key: outboxId },
			data: { created_at: new Date(Date.now() - 25 * HOUR) },
		});

		const late = await postReport(outboxId, body);

		expect(late.status).toBe(400);
		expect(late.body.error.code).toBe('VALIDATION');
		expect(await reportCount()).toBe(before);
	});
});

// /v1/photos (C5): validation, dedupe by (owner, sha256), presigned PUT, /complete → photo.process, GET and DELETE,
// the permission matrix and the 60/hour rate limit. Storage is the in-memory adapter (vitest.config.ts).
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { app } from '../../app.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { userCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const storage = adapters.storage;
const ids = {
	owner: randomUUID(),
	anon: randomUUID(),
	other: randomUUID(),
	mod: randomUUID(),
	modAal2: randomUUID(),
	admin: randomUUID(),
	burst: randomUUID(),
};
const HOUR = 3600_000;
const hash = () => randomBytes(32).toString('hex');
const input = (sha256 = hash(), extra = {}) => ({ sha256, width: 1600, height: 1200, bytes: 412_000, ...extra });
const tokenFor = (id: string) =>
	signTestToken({
		sub: id,
		is_anonymous: id === ids.anon,
		aal: id === ids.modAal2 || id === ids.admin ? 'aal2' : 'aal1',
	});
/** Everyone but the owner: other user, anonymous user, moderator aal1 and aal2, admin aal2. */
const strangers = [ids.other, ids.anon, ids.mod, ids.modAal2, ids.admin];
const as = async (id: string | null, req: request.Test) =>
	id ? req.set('Authorization', `Bearer ${await tokenFor(id)}`) : req;
const create = (id: string | null, body: object) => as(id, request(app).post('/v1/photos').send(body));
const complete = (id: string | null, photoId: string) => as(id, request(app).post(`/v1/photos/${photoId}/complete`));
const get = (id: string | null, photoId: string) => as(id, request(app).get(`/v1/photos/${photoId}`));
const del = (id: string | null, photoId: string) => as(id, request(app).delete(`/v1/photos/${photoId}`));
const uploadKey = (owner: string, photoId: string) =>
	({ bucket: 'private', key: `uploads/${owner}/${photoId}.jpg` }) as const;
const jobCount = async (name: string, photoId: string) =>
	(
		await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from pgboss.job where name = ${name} and data::text like ${`%${photoId}%`}`
	)[0].count;

/** A photo of `owner` that went through POST and /complete. */
async function uploadedPhoto(owner: string, extra: object = {}) {
	const photo = await prisma.photos.create({
		data: { owner_id: owner, sha256: hash(), width: 1600, height: 1200, bytes: 1000, status: 'accepted', ...extra },
	});
	return photo.id;
}

beforeAll(async () => {
	const roles: Record<string, USER_ROLE> = {
		[ids.mod]: 'MODERATOR',
		[ids.modAal2]: 'MODERATOR',
		[ids.admin]: 'ADMIN',
	};
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	// Fixed one-hour windows: earlier runs in this hour must not count (anonymous callers share the test IP).
	await prisma.rate_limits.deleteMany({ where: { name: 'photos.create' } });
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
	await prisma.profiles.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

describe('POST /v1/photos', () => {
	it('validates the metadata (hash, ≤ 1 MB, long edge ≤ 1600, short edge ≥ 320)', async () => {
		for (const body of [
			input('ABC'),
			input(undefined, { bytes: 1_048_577 }),
			input(undefined, { bytes: 0 }),
			input(undefined, { width: 1601 }),
			input(undefined, { height: 319 }),
			{ sha256: hash() },
		]) {
			const res = await create(ids.owner, body);
			expect(res.status).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
	});

	it('creates a pending photo with a 5-minute presigned PUT to uploads/<owner>/<id>.jpg', async () => {
		const before = Date.now();
		const res = await create(ids.owner, input());
		expect(res.status).toBe(201);
		const { photo_id, upload } = res.body;
		expect(upload).toMatchObject({
			method: 'PUT',
			headers: { 'Content-Type': 'image/jpeg' },
			url: `memory://private/uploads/${ids.owner}/${photo_id}.jpg`,
		});
		const ttl = new Date(upload.expires_at).getTime() - before;
		expect(ttl).toBeGreaterThan(290_000);
		expect(ttl).toBeLessThanOrEqual(305_000);
		expect(await prisma.photos.findUnique({ where: { id: photo_id } })).toMatchObject({
			owner_id: ids.owner,
			status: 'pending',
			bytes: 412_000,
		});
	});

	it('same owner and hash: a fresh upload for the same photo_id until /complete, then `existing: true`', async () => {
		const body = input();
		const first = await create(ids.owner, body);
		const retry = await create(ids.owner, { ...body, bytes: 400_000 });
		expect(retry.status).toBe(201);
		expect(retry.body.photo_id).toBe(first.body.photo_id);
		expect(await prisma.photos.findUnique({ where: { id: first.body.photo_id } })).toMatchObject({
			bytes: 400_000,
		});

		await storage.put(uploadKey(ids.owner, first.body.photo_id), Buffer.from('x'), 'image/jpeg');
		expect((await complete(ids.owner, first.body.photo_id)).status).toBe(202);
		// 23 h later (the client keeps the draft photo_id that long): existing, and the purge clock restarts.
		await prisma.photos.update({
			where: { id: first.body.photo_id },
			data: { updated_at: new Date(Date.now() - 23 * HOUR) },
		});
		const again = await create(ids.owner, body);
		expect(again.status).toBe(200);
		expect(again.body).toEqual({ photo_id: first.body.photo_id, existing: true });
		const row = await prisma.photos.findUniqueOrThrow({ where: { id: first.body.photo_id } });
		expect(Date.now() - row.updated_at.getTime()).toBeLessThan(60_000);

		// Another owner with the same hash gets their own photo.
		const other = await create(ids.other, body);
		expect(other.status).toBe(201);
		expect(other.body.photo_id).not.toBe(first.body.photo_id);
	});

	it('anonymous finders can upload; signed-out callers cannot', async () => {
		expect((await create(ids.anon, input())).status).toBe(201);
		const res = await create(null, input());
		expect(res.status).toBe(401);
		expect(res.body.error.code).toBe('UNAUTHENTICATED');
	});

	it('is rate limited to 60 per hour (RATE_LIMITED with Retry-After)', async () => {
		for (let i = 0; i < 60; i++) expect((await create(ids.burst, input())).status).toBe(201);
		const res = await create(ids.burst, input());
		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe('RATE_LIMITED');
		expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
	});
});

describe('POST /v1/photos/:id/complete', () => {
	it('CONFLICT while the object is missing; then uploaded and photo.process queued once', async () => {
		const { photo_id } = (await create(ids.owner, input())).body;
		const missing = await complete(ids.owner, photo_id);
		expect(missing.status).toBe(409);
		expect(missing.body.error.code).toBe('CONFLICT');

		await storage.put(uploadKey(ids.owner, photo_id), Buffer.from('x'), 'image/jpeg');
		const res = await complete(ids.owner, photo_id);
		expect(res.status).toBe(202);
		expect(res.body).toEqual({ status: 'uploaded' });
		expect((await prisma.photos.findUniqueOrThrow({ where: { id: photo_id } })).status).toBe('uploaded');
		// A repeat is accepted without a second job.
		expect((await complete(ids.owner, photo_id)).status).toBe(202);
		expect(await jobCount('photo.process', photo_id)).toBe(1);
	});

	it('NOT_FOUND for someone else’s or an unknown photo, VALIDATION for a bad id', async () => {
		const { photo_id } = (await create(ids.owner, input())).body;
		await storage.put(uploadKey(ids.owner, photo_id), Buffer.from('x'), 'image/jpeg');
		for (const caller of strangers) expect((await complete(caller, photo_id)).status).toBe(404);
		expect((await complete(ids.owner, randomUUID())).status).toBe(404);
		expect((await complete(ids.owner, 'nope')).status).toBe(400);
		expect((await complete(null, photo_id)).status).toBe(401);
		expect((await prisma.photos.findUniqueOrThrow({ where: { id: photo_id } })).status).toBe('pending');
	});
});

describe('GET /v1/photos/:id', () => {
	it('owner: status, reject reason and a 10-minute presigned thumb while private, no-store', async () => {
		const photoId = await uploadedPhoto(ids.owner, { status: 'rejected', reject_reason: 'hash_mismatch' });
		const res = await get(ids.owner, photoId);
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(res.body).toEqual({
			id: photoId,
			status: 'rejected',
			reject_reason: 'hash_mismatch',
			thumb_url: expect.stringMatching(
				new RegExp(`^memory://private/variants/${photoId}/thumb\\.webp\\?expires=`)
			),
		});
		const expires = Number(new URL(res.body.thumb_url).searchParams.get('expires'));
		expect(expires - Date.now()).toBeGreaterThan(590_000);
		expect(expires - Date.now()).toBeLessThanOrEqual(600_000);
	});

	it('owner: the public thumb once published', async () => {
		const photoId = await uploadedPhoto(ids.owner, {
			status: 'published',
			public_thumb_url: 'https://media.test/r/x/thumb.webp',
		});
		expect((await get(ids.owner, photoId)).body).toEqual({
			id: photoId,
			status: 'published',
			thumb_url: 'https://media.test/r/x/thumb.webp',
		});
	});

	it('anonymous owner sees their photo; everyone else gets NOT_FOUND, signed-out callers 401', async () => {
		const photoId = await uploadedPhoto(ids.anon);
		expect((await get(ids.anon, photoId)).status).toBe(200);
		for (const caller of [ids.owner, ...strangers.filter((id) => id !== ids.anon)]) {
			const res = await get(caller, photoId);
			expect(res.status).toBe(404);
			expect(res.body.error.code).toBe('NOT_FOUND');
		}
		expect((await get(null, photoId)).status).toBe(401);
	});
});

describe('DELETE /v1/photos/:id', () => {
	it('owner: 204, the row is gone and retention.purge deletes its objects', async () => {
		const photoId = await uploadedPhoto(ids.owner);
		const res = await del(ids.owner, photoId);
		expect(res.status).toBe(204);
		expect(await prisma.photos.findUnique({ where: { id: photoId } })).toBeNull();
		expect(await jobCount('retention.purge', photoId)).toBe(1);
		expect((await get(ids.owner, photoId)).status).toBe(404);
	});

	it('CONFLICT while on a published (visible) report; allowed once the report is hidden', async () => {
		const report = await ReportsDomain.insertReport(
			{ type: 'lost', species: 'cat', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
			userCtx({
				user_id: ids.owner,
				role: 'USER',
				is_anonymous: false,
				aal: 'aal1',
				email_verified: true,
				locale: 'sl',
			})
		);
		const published = await uploadedPhoto(ids.owner, { report_id: report.id, status: 'published' });
		const accepted = await uploadedPhoto(ids.owner, { report_id: report.id, position: 1 });
		for (const photoId of [published, accepted]) {
			const res = await del(ids.owner, photoId);
			expect(res.status).toBe(409);
			expect(res.body.error.code).toBe('CONFLICT');
		}
		await prisma.reports.update({ where: { id: report.id }, data: { moderation_state: 'hidden' } });
		expect((await del(ids.owner, accepted)).status).toBe(204);
	});

	it('NOT_FOUND for everyone but the owner, 401 signed out', async () => {
		const photoId = await uploadedPhoto(ids.owner);
		for (const caller of strangers) expect((await del(caller, photoId)).status).toBe(404);
		expect((await del(null, photoId)).status).toBe(401);
		expect(await prisma.photos.findUnique({ where: { id: photoId } })).not.toBeNull();
	});
});

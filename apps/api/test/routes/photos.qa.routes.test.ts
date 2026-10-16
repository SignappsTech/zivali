// TASK-14.4 (QA) story check for photo capture and upload (C5, ADR-014) across TASK-14.1 and the report write path:
// an EXIF-GPS photo goes POST /v1/photos → presigned PUT (in-memory storage) → /complete → photo.process → POST
// /v1/reports → photo.publish, and the public copy carries no metadata; the original upload is private and deleted.
import { createHash, randomInt, randomUUID } from 'node:crypto';

import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { app } from '../../app.ts';
import { handlers } from '../../jobs/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const storage = adapters.storage;
const LJ = { lat: 46.0514263, lng: 14.5060547 };
const owner = randomUUID();
let token = '';

const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const as = (req: request.Test) => req.set('Authorization', `Bearer ${token}`).set('x-forwarded-for', ip());
const jobCtx = () => ({ ...systemCtx(), prisma, send: jobs.send });
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** A camera-like JPEG with the artist, GPS and a capture time in EXIF (what a client must never let through). */
async function exifJpeg(): Promise<Buffer> {
	return sharp({
		create: { width: 1600, height: 1200, channels: 3, background: { r: 140, g: 90, b: randomInt(256) } },
	})
		.jpeg()
		.withExif({
			IFD0: { Artist: 'QA-SECRET-ARTIST' },
			IFD2: { DateTimeOriginal: '2026:10:14 09:30:00' },
			IFD3: {
				GPSLatitudeRef: 'N',
				GPSLatitude: '46/1 3/1 5/1',
				GPSLongitudeRef: 'E',
				GPSLongitude: '14/1 30/1 22/1',
			},
		})
		.toBuffer();
}

beforeAll(async () => {
	await prisma.profiles.create({ data: { id: owner, role: 'USER', is_anonymous: false } });
	token = await signTestToken({ sub: owner, is_anonymous: false, aal: 'aal1' });
});

afterAll(async () => {
	const reports = await prisma.reports.findMany({ where: { created_by: owner }, select: { id: true } });
	const reportIds = reports.map((r) => r.id);
	const photos = await prisma.photos.findMany({ where: { owner_id: owner }, select: { id: true } });
	const photoIds = photos.map((p) => p.id);
	await prisma.$executeRaw`delete from pgboss.job where data->>'report_id' = any(${reportIds}::text[])
		or data->>'photo_id' = any(${photoIds}::text[])`;
	await prisma.photos.deleteMany({ where: { owner_id: owner } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: owner } });
	await prisma.profiles.deleteMany({ where: { id: owner } });
});

describe('photo story end to end (C5)', () => {
	it('an EXIF-GPS upload reaches the public report as metadata-free copies; the original is private and deleted', async () => {
		const body = await exifJpeg();
		expect(body.includes('QA-SECRET-ARTIST')).toBe(true);
		const meta = { sha256: sha(body), width: 1600, height: 1200, bytes: body.length };

		const created = await as(request(app).post('/v1/photos')).send(meta);
		expect(created.status).toBe(201);
		const { photo_id, upload } = created.body as { photo_id: string; upload: { method: string; headers: object } };
		expect(upload.method).toBe('PUT');
		expect(upload.headers).toEqual({ 'Content-Type': 'image/jpeg' });
		const original = { bucket: 'private', key: `uploads/${owner}/${photo_id}.jpg` } as const;
		// The presigned PUT, as the client sends it.
		await storage.put(original, body, 'image/jpeg');
		expect((await as(request(app).post(`/v1/photos/${photo_id}/complete`))).status).toBe(202);
		await handlers['photo.process']({ photo_id }, jobCtx());
		// The upload with its EXIF is never kept once processed.
		expect(await storage.head(original)).toBeNull();
		expect((await prisma.photos.findUniqueOrThrow({ where: { id: photo_id } })).status).toBe('accepted');

		const report = await as(request(app).post('/v1/reports'))
			.set('Idempotency-Key', randomUUID())
			.send({
				type: 'lost',
				species: 'dog',
				name: 'Piki',
				colours: ['brown', 'white'],
				location: LJ,
				event_at: new Date(Date.now() - 3600_000).toISOString(),
				photo_ids: [photo_id],
			});
		expect(report.status).toBe(201);
		const { id: reportId, short_code } = report.body as { id: string; short_code: string };

		// Before photo.publish the public read model lists no photo (nothing unprocessed or private is served).
		expect((await request(app).get(`/v1/reports/${short_code}`)).body.photos).toEqual([]);
		await handlers['photo.publish']({ report_id: reportId }, jobCtx());

		const shown = await request(app).get(`/v1/reports/${short_code}`);
		expect(shown.status).toBe(200);
		expect(shown.body.photos).toHaveLength(1);
		const [photo] = shown.body.photos as { url: string; thumb_url: string; alt: string }[];
		expect(photo.url).toMatch(new RegExp(`/r/${reportId}/${photo_id}/display\\.jpg$`));
		expect(photo.thumb_url).toMatch(new RegExp(`/r/${reportId}/${photo_id}/thumb\\.webp$`));
		expect(photo.alt.length).toBeGreaterThan(0);

		for (const variant of ['display.jpg', 'display.webp', 'thumb.webp']) {
			const copy = await storage.get({ bucket: 'media', key: `r/${reportId}/${photo_id}/${variant}` });
			const out = await sharp(copy).metadata();
			expect(out).not.toHaveProperty('exif');
			expect(out).not.toHaveProperty('xmp');
			expect(copy.includes('QA-SECRET-ARTIST')).toBe(false);
			expect(copy.includes('2026:10:14')).toBe(false);
			expect(Math.max(out.width!, out.height!)).toBeLessThanOrEqual(variant === 'thumb.webp' ? 480 : 1600);
		}

		// The owner reads the photo as published (the public thumb), never a URL to the private original.
		const own = await as(request(app).get(`/v1/photos/${photo_id}`));
		expect(own.status).toBe(200);
		expect(own.body.thumb_url).toBe(photo.thumb_url);
		expect(own.body.thumb_url).not.toContain('uploads/');
	});

	it('rejects an upload whose bytes are not the declared JPEG (server-side type and hash checks)', async () => {
		const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#808080' } })
			.png()
			.toBuffer();
		const created = await as(request(app).post('/v1/photos')).send({
			sha256: sha(png),
			width: 800,
			height: 600,
			bytes: png.length,
		});
		expect(created.status).toBe(201);
		const { photo_id } = created.body as { photo_id: string };
		const original = { bucket: 'private', key: `uploads/${owner}/${photo_id}.jpg` } as const;
		await storage.put(original, png, 'image/jpeg');
		expect((await as(request(app).post(`/v1/photos/${photo_id}/complete`))).status).toBe(202);
		await handlers['photo.process']({ photo_id }, jobCtx());

		const own = await as(request(app).get(`/v1/photos/${photo_id}`));
		expect(own.body).toMatchObject({ status: 'rejected', reject_reason: 'not_jpeg' });
		expect(await storage.head(original)).toBeNull();
	});
});

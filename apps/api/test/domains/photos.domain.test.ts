// Photos domain and jobs (C5, ADR-014) against the local database and the in-memory storage adapter: photo.process
// (validation, sharp variants without metadata), photo.publish, retention.purge and the purge clock (CH-134).
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MAX_PHOTO_BYTES } from '@zivali/validation';

import { adapters } from '../../adapters/index.ts';
import type { ObjectRef } from '../../adapters/storage/index.ts';
import { PHOTO_HOOKS, PhotosDomain } from '../../domains/photos/index.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { handlers } from '../../jobs/index.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

const storage = adapters.storage;
const owner: Actor = {
	user_id: randomUUID(),
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
};
const HOUR = 3600_000;
const ctx = () => systemCtx();
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const uploadRef = (id: string): ObjectRef => ({ bucket: 'private', key: `uploads/${owner.user_id}/${id}.jpg` });
const variantRef = (id: string, v: string): ObjectRef => ({ bucket: 'private', key: `variants/${id}/${v}` });
const mediaRef = (reportId: string, id: string, v: string): ObjectRef => ({
	bucket: 'media',
	key: `r/${reportId}/${id}/${v}`,
});
const VARIANTS = ['display.webp', 'display.jpg', 'thumb.webp'];

let shade = 0;
/** A distinct JPEG each call (unique hash per owner); EXIF with the artist, GPS and orientation 6 when asked. */
async function jpeg({ width = 1200, height = 800, exif = false } = {}): Promise<Buffer> {
	shade++;
	const image = sharp({
		create: { width, height, channels: 3, background: { r: shade % 256, g: (shade * 7) % 256, b: 90 } },
	}).jpeg();
	if (!exif) return image.toBuffer();
	return image
		.withExif({
			IFD0: { Artist: 'SECRET-ARTIST' },
			IFD3: {
				GPSLatitudeRef: 'N',
				GPSLatitude: '46/1 3/1 25/1',
				GPSLongitudeRef: 'E',
				GPSLongitude: '14/1 30/1 20/1',
			},
		})
		.withMetadata({ orientation: 6 })
		.toBuffer();
}

/** An `uploaded` row with its object in the private bucket, as after POST /complete. */
async function uploaded(body: Buffer, data: { sha256?: string; report_id?: string; pet_id?: string } = {}) {
	const photo = await prisma.photos.create({
		data: {
			owner_id: owner.user_id,
			sha256: sha(body),
			width: 1200,
			height: 800,
			bytes: body.length,
			status: 'uploaded',
			...data,
		},
	});
	await storage.put(uploadRef(photo.id), body, 'image/jpeg');
	return photo;
}

const row = (id: string) => prisma.photos.findUnique({ where: { id } });
const queued = async (name: string, key: string, value: string) =>
	(
		await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from pgboss.job where name = ${name} and data->>${key} = ${value}`
	)[0].count;

const newReport = () =>
	ReportsDomain.insertReport(
		{ type: 'lost', species: 'dog', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
		userCtx(owner)
	);

beforeAll(async () => {
	await prisma.profiles.create({ data: { id: owner.user_id } });
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { created_by: owner.user_id } });
	await prisma.profiles.deleteMany({ where: { id: owner.user_id } });
});

describe('photo.process', () => {
	it('re-encodes an EXIF-GPS JPEG into display (WebP, JPEG) and thumb variants without any metadata', async () => {
		const body = await jpeg({ exif: true });
		const input = await sharp(body).metadata();
		// The fixture really carries the artist, GPS (IFD pointer tag 0x8825) and a rotation.
		expect(body.includes('SECRET-ARTIST')).toBe(true);
		expect(input.exif?.includes(Buffer.from([0x25, 0x88]))).toBe(true);
		expect(input.orientation).toBe(6);

		const photo = await uploaded(body);
		await PhotosDomain.processPhoto({ photo_id: photo.id }, ctx());

		// Orientation applied: the 1200 × 800 landscape comes out as 800 × 1200.
		expect(await row(photo.id)).toMatchObject({
			status: 'accepted',
			reject_reason: null,
			width: 800,
			height: 1200,
		});
		for (const v of VARIANTS) {
			const out = await storage.get(variantRef(photo.id, v));
			const meta = await sharp(out).metadata();
			expect(meta.format).toBe(v.endsWith('.webp') ? 'webp' : 'jpeg');
			expect(meta).not.toHaveProperty('exif');
			expect(meta).not.toHaveProperty('xmp');
			expect(meta).not.toHaveProperty('iptc');
			expect(meta).not.toHaveProperty('icc');
			expect(meta.orientation).toBeUndefined();
			expect(out.includes('SECRET-ARTIST')).toBe(false);
			expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(v === 'thumb.webp' ? 480 : 1600);
		}
		// The unprocessed upload is never kept.
		expect(await storage.head(uploadRef(photo.id))).toBeNull();
	});

	it('scales display to 1600 px and thumb to 480 px on the long edge', async () => {
		const photo = await uploaded(await jpeg({ width: 2000, height: 1000 }));
		await PhotosDomain.processPhoto({ photo_id: photo.id }, ctx());
		expect(await row(photo.id)).toMatchObject({ status: 'accepted', width: 1600, height: 800 });
		const thumb = await sharp(await storage.get(variantRef(photo.id, 'thumb.webp'))).metadata();
		expect([thumb.width, thumb.height]).toEqual([480, 240]);
	});

	it('rejects with a reason: not_jpeg, hash_mismatch, too_large, decode_failed', async () => {
		const png = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#123456' } })
			.png()
			.toBuffer();
		const garbage = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(2000)]);
		const huge = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(MAX_PHOTO_BYTES)]);
		const cases = [
			{ reason: 'not_jpeg', photo: await uploaded(png) },
			{
				reason: 'hash_mismatch',
				photo: await uploaded(await jpeg(), { sha256: randomBytes(32).toString('hex') }),
			},
			{ reason: 'too_large', photo: await uploaded(huge) },
			{ reason: 'decode_failed', photo: await uploaded(garbage) },
		];
		for (const { reason, photo } of cases) {
			await PhotosDomain.processPhoto({ photo_id: photo.id }, ctx());
			expect(await row(photo.id)).toMatchObject({ status: 'rejected', reject_reason: reason });
			expect(await storage.head(uploadRef(photo.id))).toBeNull();
			expect(await storage.head(variantRef(photo.id, 'display.webp'))).toBeNull();
		}
	});

	it('is idempotent and skips rows that are not `uploaded`', async () => {
		const photo = await uploaded(await jpeg());
		await PhotosDomain.processPhoto({ photo_id: photo.id }, ctx());
		await prisma.photos.update({ where: { id: photo.id }, data: { width: 1 } });
		await PhotosDomain.processPhoto({ photo_id: photo.id }, ctx());
		expect(await row(photo.id)).toMatchObject({ status: 'accepted', width: 1 });
		await PhotosDomain.processPhoto({ photo_id: randomUUID() }, ctx());
	});

	it('queues photo.publish for a photo already on a report; PHOTO_HOOKS is empty in M2', async () => {
		expect(PHOTO_HOOKS).toEqual([]);
		const report = await newReport();
		const photo = await uploaded(await jpeg(), { report_id: report.id });
		await PhotosDomain.processPhoto({ photo_id: photo.id }, ctx());
		expect(await queued('photo.publish', 'report_id', report.id)).toBe(1);
	});

	it('drops a job without a photo_id instead of retrying it', async () => {
		const jobCtx = { ...ctx(), prisma, send: jobs.send };
		await expect(handlers['photo.process']({ marker: 'x' }, jobCtx)).resolves.toBeUndefined();
		await expect(handlers['photo.publish']({}, jobCtx)).resolves.toBeUndefined();
	});
});

describe('photo.publish', () => {
	it('copies accepted variants of a visible report to the media bucket and removes them when hidden or expired', async () => {
		const report = await newReport();
		const photos = [await uploaded(await jpeg(), { report_id: report.id })];
		photos.push(await uploaded(await jpeg(), { report_id: report.id }));
		await prisma.photos.update({ where: { id: photos[1].id }, data: { position: 1 } });
		for (const p of photos) await PhotosDomain.processPhoto({ photo_id: p.id }, ctx());
		const publish = () => PhotosDomain.publishReportPhotos({ report_id: report.id }, ctx());
		const mediaCount = async (id: string) =>
			(await Promise.all(VARIANTS.map((v) => storage.head(mediaRef(report.id, id, v))))).filter(Boolean).length;

		await publish();
		for (const p of photos) {
			expect(await row(p.id)).toMatchObject({
				status: 'published',
				public_display_url: expect.stringMatching(new RegExp(`/r/${report.id}/${p.id}/display\\.jpg$`)),
				public_thumb_url: expect.stringMatching(new RegExp(`/r/${report.id}/${p.id}/thumb\\.webp$`)),
			});
			expect(await mediaCount(p.id)).toBe(3);
		}
		// The public read model now lists them.
		const view = await ReportsDomain.getReport({ code: report.short_code }, systemCtx());
		expect(view.report.photos).toHaveLength(2);

		await prisma.reports.update({ where: { id: report.id }, data: { moderation_state: 'hidden' } });
		await publish();
		for (const p of photos) {
			expect(await row(p.id)).toMatchObject({
				status: 'unpublished',
				public_display_url: null,
				public_thumb_url: null,
			});
			expect(await mediaCount(p.id)).toBe(0);
			// The private variants stay for the owner.
			expect(await storage.head(variantRef(p.id, 'display.webp'))).not.toBeNull();
		}

		await prisma.reports.update({ where: { id: report.id }, data: { moderation_state: 'visible' } });
		await publish();
		expect(await row(photos[0].id)).toMatchObject({ status: 'published' });

		await prisma.reports.update({
			where: { id: report.id },
			data: { status: 'closed', close_reason: 'expired', closed_at: new Date() },
		});
		await publish();
		expect(await row(photos[0].id)).toMatchObject({ status: 'unpublished' });
		expect(await mediaCount(photos[0].id)).toBe(0);
	});

	it('never publishes held reports or unprocessed photos', async () => {
		const report = await newReport();
		await prisma.reports.update({ where: { id: report.id }, data: { moderation_state: 'held' } });
		const accepted = await uploaded(await jpeg(), { report_id: report.id });
		await PhotosDomain.processPhoto({ photo_id: accepted.id }, ctx());
		await PhotosDomain.publishReportPhotos({ report_id: report.id }, ctx());
		expect(await row(accepted.id)).toMatchObject({ status: 'accepted', public_display_url: null });

		await prisma.reports.update({ where: { id: report.id }, data: { moderation_state: 'visible' } });
		const pending = await uploaded(await jpeg(), { report_id: report.id });
		await PhotosDomain.publishReportPhotos({ report_id: report.id }, ctx());
		expect(await row(pending.id)).toMatchObject({ status: 'uploaded', public_display_url: null });
		expect(await row(accepted.id)).toMatchObject({ status: 'published' });
	});
});

describe('retention.purge', () => {
	const age = (id: string, hours: number) =>
		prisma.photos.update({ where: { id }, data: { updated_at: new Date(Date.now() - hours * HOUR) } });
	const exists = async (id: string) => (await row(id)) !== null;

	it('removes photos unattached for 24 h with their objects, keeps recent and attached ones', async () => {
		const old = await uploaded(await jpeg());
		await PhotosDomain.processPhoto({ photo_id: old.id }, ctx());
		await age(old.id, 25);
		const recent = await uploaded(await jpeg());
		await age(recent.id, 23);
		const pet = await prisma.pets.create({ data: { owner_id: owner.user_id, species: 'cat', name: 'Muri' } });
		const petPhoto = await uploaded(await jpeg(), { pet_id: pet.id });
		await age(petPhoto.id, 48);

		await PhotosDomain.purgePhotos(ctx());
		expect(await exists(old.id)).toBe(false);
		for (const v of VARIANTS) expect(await storage.head(variantRef(old.id, v))).toBeNull();
		expect(await exists(recent.id)).toBe(true);
		expect(await storage.head(uploadRef(recent.id))).not.toBeNull();
		expect(await exists(petPhoto.id)).toBe(true);

		// Deleting the pet detaches its photos (foreign key), so the next run removes them.
		await prisma.pets.delete({ where: { id: pet.id } });
		await PhotosDomain.purgePhotos(ctx());
		expect(await exists(petPhoto.id)).toBe(false);
		expect(await storage.head(uploadRef(petPhoto.id))).toBeNull();
	});

	it('`existing: true` restarts the purge clock of an unattached photo (CH-134)', async () => {
		const body = await jpeg();
		const photo = await uploaded(body);
		await age(photo.id, 25);
		const again = await PhotosDomain.createPhoto(
			{ sha256: sha(body), width: 1200, height: 800, bytes: body.length },
			userCtx(owner)
		);
		expect(again).toEqual({ photo_id: photo.id, existing: true });
		await PhotosDomain.purgePhotos(ctx());
		expect(await exists(photo.id)).toBe(true);
	});

	it('removes report photos (public copies included) 12 months after the report closed', async () => {
		const longAgo = await newReport();
		const recently = await newReport();
		const oldPhoto = await uploaded(await jpeg(), { report_id: longAgo.id });
		const keptPhoto = await uploaded(await jpeg(), { report_id: recently.id });
		await PhotosDomain.processPhoto({ photo_id: oldPhoto.id }, ctx());
		await PhotosDomain.publishReportPhotos({ report_id: longAgo.id }, ctx());
		expect(await storage.head(mediaRef(longAgo.id, oldPhoto.id, 'display.jpg'))).not.toBeNull();
		const closed = (days: number) => ({
			status: 'closed' as const,
			close_reason: 'gave_up' as const,
			closed_at: new Date(Date.now() - days * 24 * HOUR),
		});
		await prisma.reports.update({ where: { id: longAgo.id }, data: closed(370) });
		await prisma.reports.update({ where: { id: recently.id }, data: closed(30) });

		await PhotosDomain.purgePhotos(ctx());
		expect(await exists(oldPhoto.id)).toBe(false);
		expect(await storage.head(mediaRef(longAgo.id, oldPhoto.id, 'display.jpg'))).toBeNull();
		expect(await storage.head(variantRef(oldPhoto.id, 'display.webp'))).toBeNull();
		expect(await exists(keptPhoto.id)).toBe(true);
	});

	it('with `{ objects }` deletes just those objects (DELETE /v1/photos/:id)', async () => {
		const ref: ObjectRef = { bucket: 'private', key: `variants/${randomUUID()}/thumb.webp` };
		const other: ObjectRef = { bucket: 'private', key: `variants/${randomUUID()}/thumb.webp` };
		await storage.put(ref, Buffer.from('x'), 'image/webp');
		await storage.put(other, Buffer.from('y'), 'image/webp');
		await handlers['retention.purge']({ objects: [ref] }, { ...ctx(), prisma, send: jobs.send });
		expect(await storage.head(ref)).toBeNull();
		expect(await storage.head(other)).not.toBeNull();
	});
});

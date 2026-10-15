import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { withExif } from './exif-fixture';

// TASK-14.2: the PhotoPicker on /dev/photos in a real browser, against a faked API (C5) and R2.
// The mock API port playwright.config.ts picks (it also builds the app against it as NEXT_PUBLIC_API_URL).
const API = `http://localhost:${process.env.E2E_API_PORT}`;
const PUT_URL = 'https://e2e.eu.r2.cloudflarestorage.com/zivali-private/uploads/u1/photo.jpg?X-Amz-Signature=e2e';
const cors = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': '*',
	'access-control-allow-methods': '*',
};
const failedNetwork = 'Fotografija se ni naložila. Preverite povezavo in poskusite znova.';

type Create = { sha256: string; width: number; height: number; bytes: number };

/** POST /v1/photos, the presigned PUT and /complete; `drop` makes the PUT fail like a lost connection. */
async function fakeUploads(page: Page) {
	const seen = { create: [] as Create[], put: [] as { body: Buffer; type?: string }[], complete: 0, drop: false };
	const answer = (status: number, json?: unknown) => ({ status, headers: cors, json });
	await page.route(`${API}/v1/photos**`, async (route) => {
		const request = route.request();
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		if (request.url().endsWith('/complete')) {
			seen.complete += 1;
			return route.fulfill(answer(202, { status: 'uploaded' }));
		}
		seen.create.push(request.postDataJSON());
		await route.fulfill(
			answer(201, {
				photo_id: '9b0e2d4c-1f3a-4b5c-8d6e-7f8091a2b3c4',
				upload: {
					url: PUT_URL,
					method: 'PUT',
					headers: { 'Content-Type': 'image/jpeg' },
					expires_at: '2030-01-01T00:00:00Z',
				},
			})
		);
	});
	await page.route(`${new URL(PUT_URL).origin}/**`, async (route) => {
		const request = route.request();
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		if (seen.drop) return route.abort('internetdisconnected');
		seen.put.push({
			body: request.postDataBuffer()!,
			type: (await request.headerValue('content-type')) ?? undefined,
		});
		await route.fulfill({ status: 200, headers: cors });
	});
	return seen;
}

/** A 4032 × 3024 camera-like JPEG of about 6 MB: a gradient under fine noise, encoded by the browser. */
async function cameraJpeg(page: Page): Promise<Uint8Array> {
	const base64 = await page.evaluate(async () => {
		const [width, height] = [4032, 3024];
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext('2d')!;
		const image = context.createImageData(width, height);
		const noise = new Uint8Array(65_536);
		for (let i = 0; i < image.data.length; i += 4) {
			if (i % noise.length === 0) crypto.getRandomValues(noise);
			const x = (i / 4) % width;
			const n = noise[i % noise.length] & 63;
			image.data.set([(x / width) * 160 + n, 120 + n, 200 - (x / width) * 120 + n, 255], i);
		}
		context.putImageData(image, 0, 0);
		const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
		const url = await new Promise<string>((resolve) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.readAsDataURL(blob);
		});
		return url.slice(url.indexOf(',') + 1);
	});
	return new Uint8Array(Buffer.from(base64, 'base64'));
}

/** JPEG segment markers up to the image data, and the size from the frame header. */
function jpegInfo(jpeg: Buffer) {
	const markers: number[] = [];
	let size: { width: number; height: number } | undefined;
	for (let at = 2; at < jpeg.length && jpeg[at] === 0xff; at += 2 + jpeg.readUInt16BE(at + 2)) {
		const marker = jpeg[at + 1];
		markers.push(marker);
		if (marker >= 0xc0 && marker <= 0xc2)
			size = { height: jpeg.readUInt16BE(at + 5), width: jpeg.readUInt16BE(at + 7) };
		if (marker === 0xda) break;
	}
	return { markers, size };
}

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

test('a 6 MB camera photo uploads as a JPEG of at most 1600 px and 1 MiB with no EXIF', async ({ page }) => {
	const seen = await fakeUploads(page);
	await page.goto('/dev/photos');
	const original = withExif(await cameraJpeg(page));
	expect(original.length).toBeGreaterThan(6_000_000);
	expect(jpegInfo(Buffer.from(original)).markers).toContain(0xe1);

	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(original) });

	const row = page.getByRole('listitem', { name: 'Fotografija 1 od 1' });
	await expect(row.getByText('Naslovna fotografija')).toBeVisible({ timeout: 60_000 });
	await expect(row.getByRole('img', { name: 'Fotografija 1 od 1' })).toBeVisible();
	const [create] = seen.create;
	const [put] = seen.put;
	// Exactly the declared bytes and type (the presigned PUT pins Content-Type and Content-Length).
	expect(put.type).toBe('image/jpeg');
	expect(put.body.length).toBe(create.bytes);
	expect(create.bytes).toBeLessThanOrEqual(1024 * 1024);
	expect(createHash('sha256').update(put.body).digest('hex')).toBe(create.sha256);
	expect(create).toMatchObject({ width: 1600, height: 1200 });
	const uploaded = jpegInfo(put.body);
	expect(uploaded.size).toEqual({ width: 1600, height: 1200 });
	// Only APP0 (JFIF) and APP2 (Chrome's sRGB ICC colour profile, no personal data) may remain: no APP1 (EXIF, XMP),
	// APP3-APP15 or comment segment.
	expect(
		uploaded.markers.filter((marker) => (marker >= 0xe3 && marker <= 0xef) || marker === 0xfe || marker === 0xe1)
	).toEqual([]);
	expect(put.body.includes('Exif')).toBe(false);
	expect(put.body.includes('ns.adobe.com/xap')).toBe(false);
	expect(seen.complete).toBe(1);
	await expectNoAxeViolations(page);
});

test('the draft survives a reload and the upload resumes after a dropped connection', async ({ page, context }) => {
	const seen = await fakeUploads(page);
	seen.drop = true;
	await page.goto('/dev/photos');
	await page.locator('input[type=file][multiple]').setInputFiles({
		name: 'dog.jpg',
		mimeType: 'image/jpeg',
		buffer: readFileSync(new URL('../../../docs/design/directions/img/dog-aussie.jpg', import.meta.url)),
	});
	await expect(page.getByText(failedNetwork)).toBeVisible({ timeout: 60_000 });
	await expect(page.getByRole('button', { name: 'Poskusi znova' })).toBeVisible();
	await expectNoAxeViolations(page);

	// After a reload the photo comes back from IndexedDB and is sent again without picking it.
	const before = seen.create.length;
	await page.reload();
	await expect(page.getByRole('img', { name: 'Fotografija 1 od 1' })).toBeVisible();
	await expect.poll(() => seen.create.length).toBeGreaterThan(before);
	await expect(page.getByText(failedNetwork)).toBeVisible();

	// Back online: the failed upload is retried at once.
	seen.drop = false;
	await context.setOffline(true);
	await context.setOffline(false);
	await expect(page.getByText('Naslovna fotografija')).toBeVisible();
	expect(seen.complete).toBe(1);
	expect(seen.put).toHaveLength(1);

	// The uploaded photo stays in the draft with its id: nothing is sent again.
	const sent = seen.create.length;
	await page.reload();
	await expect(page.getByText('Naslovna fotografija')).toBeVisible();
	expect(seen.create).toHaveLength(sent);
	await expectNoAxeViolations(page);
});

test.describe('on a phone', () => {
	test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

	test('offers the camera and the gallery as 44 px+ tiles instead of the drop area', async ({ page }) => {
		await page.goto('/dev/photos');
		for (const name of ['Fotografiraj', 'Izberi iz galerije']) {
			const box = await page.getByRole('button', { name }).boundingBox();
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
		await expect(page.getByRole('button', { name: /^Izberi fotografije/ })).toBeHidden();
		await expect(page.locator('input[type=file][capture=environment]')).toHaveAttribute('accept', 'image/*');
		await expectNoAxeViolations(page);
	});
});

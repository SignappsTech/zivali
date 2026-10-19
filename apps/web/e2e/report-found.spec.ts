import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request, test } from '@playwright/test';

import { attributesMultipleAnimals, attributesPending, attributesReady } from '@zivali/api/__fixtures__/ai';
import { responsibleConfirmed } from '@zivali/api/__fixtures__/directory';
import { createdReport } from '@zivali/api/__fixtures__/reports';
import type { CreateReportInput } from '@zivali/types';

import { expectNoAdSlots, expectNoAnalyticsBeforeConsent } from '../../../tests/quality/guards.mjs';
import { FIXTURE_EXIF, withExif } from './exif-fixture';

// TASK-30.2: the P7 found flow on a phone, without an account, against faked GoTrue (anonymous sign-in), API and R2:
// under 60 s (G-3), axe 0 violations, no ad slot, and the sighting linked to a lost listing from its detail page.
const API = `http://localhost:${process.env.E2E_API_PORT}`;
const PUT_URL = 'https://e2e.eu.r2.cloudflarestorage.com/zivali-private/uploads/anon-1/photo.jpg?X-Amz-Signature=e2e';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PHONE = { width: 390, height: 844 };
const TOKEN = 'e2eManageTok3n_abcdefghijklmnopqrstuvwxyz012';
const LOST_ID = '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e10'; // e2e/mock-api.ts lostReport (Rex12345)
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const ACCESS_TOKEN = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: 'anon-1', is_anonymous: true, exp }), 'e2e'].join(
	'.'
);

/** Answers GoTrue's anonymous sign-in, the photo upload (C5), the report create and the directory; returns the creates. */
async function fakeBackend(page: Page) {
	const creates: Request[] = [];
	const cors = (request: Request) => ({
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
		'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
	});
	await page.route(
		(url) => url.pathname === '/auth/v1/signup',
		(route) =>
			route.request().method() === 'OPTIONS'
				? route.fulfill({ status: 204, headers: cors(route.request()) })
				: route.fulfill({
						status: 200,
						headers: cors(route.request()),
						json: {
							access_token: ACCESS_TOKEN,
							token_type: 'bearer',
							expires_in: 3600,
							expires_at: exp,
							refresh_token: 'e2e',
							user: {
								id: 'anon-1',
								aud: 'authenticated',
								role: 'authenticated',
								is_anonymous: true,
								app_metadata: {},
								user_metadata: {},
								created_at: new Date().toISOString(),
							},
						},
					})
	);
	await page.route(`${API}/v1/**`, (route) => {
		const request = route.request();
		const headers = cors(request);
		const path = new URL(request.url()).pathname;
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
		if (path === '/v1/photos')
			return route.fulfill({
				status: 201,
				headers,
				json: {
					photo_id: '9b0e2d4c-1f3a-4b5c-8d6e-7f8091a2b3c4',
					upload: {
						url: PUT_URL,
						method: 'PUT',
						headers: { 'Content-Type': 'image/jpeg' },
						expires_at: '2030-01-01T00:00:00Z',
					},
				},
			});
		if (path.endsWith('/complete')) return route.fulfill({ status: 202, headers, json: { status: 'uploaded' } });
		if (path === '/v1/reports' && request.method() === 'POST') {
			creates.push(request);
			return route.fulfill({ status: 201, headers, json: { ...createdReport, manage_token: TOKEN } });
		}
		if (path === '/v1/shelters/responsible')
			return route.fulfill({ status: 200, headers, json: responsibleConfirmed });
		// Everything else (the reverse geocoder, the listing) is e2e/mock-api.ts.
		return route.fallback();
	});
	await page.route(`${new URL(PUT_URL).origin}/**`, (route) =>
		route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, headers: cors(route.request()) })
	);
	return creates;
}

/** A 1200 × 900 phone-camera JPEG with the fixture's EXIF (time and GPS in Ljubljana). */
async function cameraPhoto(page: Page): Promise<Buffer> {
	const base64 = await page.evaluate(async () => {
		const canvas = new OffscreenCanvas(1200, 900);
		const context = canvas.getContext('2d')!;
		context.fillStyle = '#a0784e';
		context.fillRect(0, 0, 1200, 900);
		const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
		const bytes = new Uint8Array(await blob.arrayBuffer());
		let binary = '';
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return btoa(binary);
	});
	return Buffer.from(withExif(new Uint8Array(Buffer.from(base64, 'base64'))));
}

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
	Math.hypot((b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180), b.lat - a.lat) * 111_320;

test('a finder reports a found dog without an account in under 60 s on a phone (AC #1, #2, #5)', async ({ page }) => {
	await page.setViewportSize(PHONE);
	const creates = await fakeBackend(page);
	const started = Date.now();
	await page.goto('/prijava/najdena-zival');
	expect(await page.title()).toBe('Našli ste psa ali mačko? Prijava brez računa · Najdimo');
	await expect(page.getByRole('heading', { level: 1, name: 'Fotografirajte žival' })).toBeVisible();
	await expectNoAdSlots(page);
	await expectNoAxeViolations(page);

	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: await cameraPhoto(page) });
	await expect(page.getByText('Naslovna fotografija')).toBeVisible();
	await page.getByRole('button', { name: 'Naprej' }).click();

	await page.getByRole('radio', { name: 'Pes' }).click();
	await page.getByRole('button', { name: 'Naprej' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeFocused();
	await expect(page.getByText('Kraj smo prebrali iz fotografije.')).toBeVisible();
	await expect(page.getByText('Ne sprašujemo, kje je žival zdaj.')).toBeVisible();
	await expectNoAxeViolations(page);
	await page.getByRole('button', { name: 'Naprej' }).click();

	await page.getByRole('radio', { name: /Da, žival je pri meni/ }).click();
	await page.getByLabel('E-naslov (neobvezno)').fill('ana@primer.si');
	await page.getByRole('button', { name: 'Naprej' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Objavite prijavo' })).toBeVisible();
	await expectNoAxeViolations(page);
	await page.getByRole('button', { name: 'Objavi prijavo' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeVisible();
	expect(Date.now() - started).toBeLessThan(60_000);

	// One create, with the anonymous session, an Idempotency-Key and only the coarsened photo place (C6, C7).
	expect(creates).toHaveLength(1);
	const [create] = creates;
	expect(create!.headers().authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
	expect(create!.headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
	const body = create!.postDataJSON() as CreateReportInput;
	expect(body).toMatchObject({ type: 'found', species: 'dog', finder_email: 'ana@primer.si' });
	expect(body.photo_ids).toEqual(['9b0e2d4c-1f3a-4b5c-8d6e-7f8091a2b3c4']);
	const distance = metres(FIXTURE_EXIF, body.location);
	expect(distance).toBeGreaterThan(15);
	expect(distance).toBeLessThan(35);
	// The capture time is the photo's (EXIF, local time), not the time of sending.
	expect(new Date(body.event_at).getDate()).toBe(14);

	// The private link (C7), selectable and kept on this device; the responsible shelter (C18).
	await expect(page.getByText(`/m#${TOKEN}`, { exact: false })).toBeVisible();
	expect(await page.evaluate((id) => localStorage.getItem(`manage:${id}`), createdReport.id)).toBe(TOKEN);
	await expect(page.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toHaveAttribute(
		'href',
		'tel:+38612345678'
	);
	await expectNoAdSlots(page);
	await expectNoAnalyticsBeforeConsent(page);
	await expectNoAxeViolations(page);
});

test('"Sporoči opažanje" on a lost listing sends a sighting linked to it (AC #3)', async ({ page, context }) => {
	await page.setViewportSize(PHONE);
	// A location this site may already read: "Kje" opens on the GPS point, without a prompt.
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation({ latitude: 46.0612, longitude: 14.4977 });
	const creates = await fakeBackend(page);
	await page.goto('/r/Rex12345');
	await page.getByRole('link', { name: 'Sporoči opažanje' }).click();

	await expect(page).toHaveURL(/\/prijava\/najdena-zival\?/);
	await expect(page.getByText('Rex', { exact: true })).toBeVisible();
	await expect(page.getByText('Kraj je določen po vaši lokaciji.')).toBeVisible();
	await page.getByRole('button', { name: 'Naprej' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Kdaj ste jo videli?' })).toBeVisible();
	await page.getByRole('button', { name: 'Naprej' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Dodate fotografijo?' })).toBeVisible();
	await expectNoAxeViolations(page);
	await page.getByRole('button', { name: 'Pošlji opažanje' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Hvala za opažanje' })).toBeVisible();
	const body = creates[0]!.postDataJSON() as CreateReportInput;
	expect(body).toMatchObject({ type: 'sighted', species: 'dog', linked_report_id: LOST_ID, photo_ids: [] });
	expect(body).not.toHaveProperty('finder_email');
	await expect(page.getByRole('link', { name: /Pokliči/ })).toHaveCount(0);
	await expectNoAdSlots(page);
	await expectNoAxeViolations(page);
});

test('the AI suggestion from the photo: "Je to pravilno?", then the choices marked Predlog (TASK-41.2, AC #4)', async ({
	page,
}) => {
	await page.setViewportSize(PHONE);
	const creates = await fakeBackend(page);
	// AI on (C1 public config) and the C19 mock: `pending` once, then the client fixture (dog, black, size uncertain).
	let polls = 0;
	await page.route(`${API}/v1/**`, (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		const headers = { 'Access-Control-Allow-Origin': '*' };
		if (request.method() === 'GET' && path === '/v1/config/public')
			return route.fulfill({ status: 200, headers, json: { 'ai.enabled': true } });
		if (request.method() === 'GET' && path.endsWith('/attributes'))
			return route.fulfill({ status: 200, headers, json: polls++ < 1 ? attributesPending : attributesReady });
		return route.fallback();
	});
	await page.goto('/prijava/najdena-zival');
	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: await cameraPhoto(page) });
	await expect(page.getByText('Pregledujemo fotografijo … Obrazec lahko medtem izpolnjujete naprej.')).toBeVisible();
	await expect(page.getByText('Pregledujemo fotografijo …', { exact: false })).toBeHidden();
	await page.getByRole('button', { name: 'Naprej' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Je to pravilno?' })).toBeFocused();
	await expect(page.getByText('Pes, labradorec, črne barve')).toBeVisible();
	await expect(page.getByText('Predlog iz fotografije. Umetna inteligenca se lahko moti.')).toBeVisible();
	await expectNoAxeViolations(page);

	await page.getByRole('button', { name: 'Uredi podatke' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Katera žival je to?' })).toBeFocused();
	await expect(page.getByRole('radio', { name: 'Pes' })).toBeChecked();
	// The breed the sentence named, filled and marked; each mark with its confidence (wireframe v2).
	await expect(page.getByRole('combobox', { name: 'Pasma (neobvezno)' })).toHaveValue('Labradorec');
	await expect(page.getByText('Predlog', { exact: true })).toHaveCount(3);
	await expect(page.getByText('· 81 %')).toBeVisible();
	await expect(page.getByText('Iz fotografije tega ne moremo zanesljivo razbrati. Izberite sami.')).toBeVisible();
	await expectNoAxeViolations(page);
	await page.getByRole('button', { name: 'Naprej' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeVisible();
	await page.getByRole('button', { name: 'Naprej' }).click();
	await page.getByRole('radio', { name: /Da, žival je pri meni/ }).click();
	await page.getByRole('button', { name: 'Naprej' }).click();
	await page.getByRole('button', { name: 'Objavi prijavo' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeVisible();
	// Only what the finder kept on screen, nothing saved before Publish; the uncertain size stays out.
	expect(creates).toHaveLength(1);
	const body = creates[0]!.postDataJSON() as CreateReportInput;
	expect(body).toMatchObject({
		type: 'found',
		species: 'dog',
		breed_codes: ['dog.labrador_retriever'],
		colours: ['black'],
	});
	expect(body).not.toHaveProperty('size');
	await expectNoAdSlots(page);
});

test('several animals: the photo is cropped, the copy replaces it and is checked again (TASK-41.5, AC #1 to #5)', async ({
	page,
}) => {
	await page.setViewportSize(PHONE);
	const creates = await fakeBackend(page);
	// The original sees several animals; the cropped copy is a new photo (its own id) and sees one dog.
	const ORIGINAL = '9b0e2d4c-1f3a-4b5c-8d6e-7f8091a2b3c4';
	const COPY = '0c1d2e3f-4a5b-4c6d-8e7f-8091a2b3c4d5';
	let uploads = 0;
	let copyPolls = 0;
	await page.route(`${API}/v1/**`, (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		const headers = { 'Access-Control-Allow-Origin': '*' };
		if (request.method() === 'GET' && path === '/v1/config/public')
			return route.fulfill({ status: 200, headers, json: { 'ai.enabled': true } });
		if (request.method() === 'POST' && path === '/v1/photos')
			return route.fulfill({
				status: 201,
				headers,
				json: {
					photo_id: uploads++ ? COPY : ORIGINAL,
					upload: {
						url: PUT_URL,
						method: 'PUT',
						headers: { 'Content-Type': 'image/jpeg' },
						expires_at: '2030-01-01T00:00:00Z',
					},
				},
			});
		if (request.method() === 'GET' && path === `/v1/photos/${ORIGINAL}/attributes`)
			return route.fulfill({ status: 200, headers, json: attributesMultipleAnimals });
		if (request.method() === 'GET' && path === `/v1/photos/${COPY}/attributes`)
			return route.fulfill({ status: 200, headers, json: copyPolls++ < 1 ? attributesPending : attributesReady });
		return route.fallback();
	});
	await page.goto('/prijava/najdena-zival');
	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: await cameraPhoto(page) });
	await expect(page.getByRole('button', { name: 'Obdrži fotografijo' })).toBeVisible();

	// "Obreži fotografijo" in the note opens the tool on the frame; full screen on a phone.
	await page.getByRole('button', { name: 'Obreži fotografijo', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Obreži fotografijo' });
	await expect(dialog).toBeVisible();
	expect((await dialog.boundingBox())?.width).toBe(PHONE.width);
	const frame = dialog.getByRole('group', { name: 'Okvir obreza' });
	await expect(frame).toBeFocused();
	await expectNoAxeViolations(page);
	// Five tab stops: the frame, then the four corners (the edge handles are pointer-only), then the actions.
	for (const corner of ['Vogal zgoraj levo', 'Vogal zgoraj desno', 'Vogal spodaj desno', 'Vogal spodaj levo']) {
		await page.keyboard.press('Tab');
		await expect(dialog.getByRole('button', { name: corner })).toBeFocused();
	}
	await page.keyboard.press('Tab');
	await expect(dialog.getByRole('button', { name: 'Prekliči' })).toBeFocused();
	// The keyboard: a corner resizes (Shift: 10 px), the frame moves.
	const before = (await frame.boundingBox())!;
	await dialog.getByRole('button', { name: 'Vogal spodaj desno' }).focus();
	for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowLeft');
	await frame.focus();
	await page.keyboard.press('Shift+ArrowRight');
	const after = (await frame.boundingBox())!;
	expect(Math.abs(after.width - (before.width - 50))).toBeLessThan(2);
	expect(Math.abs(after.x - (before.x + 10))).toBeLessThan(2);

	await dialog.getByRole('button', { name: 'Uporabi' }).click();
	await expect(dialog).toBeHidden();
	// The copy replaced the photo: the note is gone, it is checked again, and focus is on its crop button.
	await expect(page.getByText('Fotografija je obrezana.')).toBeAttached();
	await expect(page.getByRole('button', { name: 'Obreži fotografijo 1' })).toBeFocused();
	await expect(page.getByRole('button', { name: 'Obdrži fotografijo' })).toHaveCount(0);
	await expect(page.getByText('Pregledujemo fotografijo … Obrazec lahko medtem izpolnjujete naprej.')).toBeVisible();
	await expect(page.getByText('Pregledujemo fotografijo …', { exact: false })).toBeHidden();
	await expect(page.getByRole('listitem', { name: 'Fotografija 1 od 1' })).toBeVisible();
	await page.getByRole('button', { name: 'Naprej' }).click();

	// The copy's result: one dog, the labrador of the client fixture.
	await expect(page.getByRole('heading', { level: 1, name: 'Je to pravilno?' })).toBeFocused();
	await expect(page.getByText('Pes, labradorec, črne barve')).toBeVisible();
	await page.getByRole('button', { name: 'Da, nadaljuj' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeVisible();
	await page.getByRole('button', { name: 'Naprej' }).click();
	await page.getByRole('radio', { name: /Da, žival je pri meni/ }).click();
	await page.getByRole('button', { name: 'Naprej' }).click();
	await page.getByRole('button', { name: 'Objavi prijavo' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeVisible();
	// Only the copy goes on the report; nothing was saved before Publish.
	expect(uploads).toBe(2);
	expect(creates).toHaveLength(1);
	expect((creates[0]!.postDataJSON() as CreateReportInput).photo_ids).toEqual([COPY]);
	await expectNoAdSlots(page);
});

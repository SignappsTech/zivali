import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import { pet } from '@zivali/api/__fixtures__/pets';
import type { Pet } from '@zivali/types';

import { api, dismissConsent, signInAs } from './session';

// TASK-29.3: the P6 lost flow on web against a faked API (C4, C5, C6) and stubbed map tiles: every step is checked
// with axe and for ad slots (C15), and the request body is read where it leaves the browser.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const TILES = 'https://tiles.openfreemap.org';
const PUT_URL = 'https://e2e.eu.r2.cloudflarestorage.com/zivali-private/uploads/u1/photo.jpg?X-Amz-Signature=e2e';
const SISKA = {
	label: 'Šiška, Ljubljana',
	lat: 46.0739,
	lng: 14.4851,
	kind: 'district',
	municipality_slug: 'ljubljana',
};
const cors = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': '*',
	'access-control-allow-methods': '*',
};

/** axe and the protected-flow guard (as tests/quality/guards.mjs expectNoAdSlots, which has no types). */
async function checkStep(page: Page) {
	await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

type Seen = { method: string; path: string; body: unknown; key?: string };

/** Signs in and answers /v1 (me, pets, photos, reports, geocoder) and the tiles, recording every call. */
async function fakeApi(page: Page, baseURL: string, pets: Pet[], create: (call: number) => [number, unknown]) {
	const seen: Seen[] = [];
	await signInAs(page, { id: me.id, role: me.role, aal: 'aal1' }, baseURL);
	await dismissConsent(page);
	await page.route(`${TILES}/**`, (route) => {
		const { pathname } = new URL(route.request().url());
		if (pathname === '/planet')
			return route.fulfill({
				headers: cors,
				json: { tilejson: '3.0.0', tiles: [`${TILES}/planet/e2e/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14 },
			});
		if (pathname.endsWith('.json')) return route.fulfill({ headers: cors, json: {} });
		return route.fulfill({ headers: cors, body: '', contentType: 'application/x-protobuf' });
	});
	await page.route(`${new URL(PUT_URL).origin}/**`, (route) =>
		route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, headers: cors })
	);
	await page.route(`${api()}/v1/**`, async (route) => {
		const request = route.request();
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		const path = new URL(request.url()).pathname;
		const body = request.postData() ? request.postDataJSON() : undefined;
		seen.push({
			method: request.method(),
			path,
			body,
			key: (await request.headerValue('idempotency-key')) ?? undefined,
		});
		const json = (status: number, value?: unknown) => route.fulfill({ status, headers: cors, json: value });

		if (path === '/v1/me') return json(200, me);
		if (path === '/v1/pets') return json(200, { items: pets });
		if (path === '/v1/geo/reverse') return json(200, { place: SISKA });
		if (path === '/v1/geo/search') return json(200, { items: [SISKA] });
		if (path === '/v1/photos')
			return json(201, {
				photo_id: '9b0e2d4c-1f3a-4b5c-8d6e-7f8091a2b3c4',
				upload: {
					url: PUT_URL,
					method: 'PUT',
					headers: { 'Content-Type': 'image/jpeg' },
					expires_at: '2030-01-01T00:00:00Z',
				},
			});
		if (path.endsWith('/complete')) return json(202, { status: 'uploaded' });
		if (path === '/v1/reports' && request.method() === 'POST')
			return json(...create(seen.filter((call) => call.path === '/v1/reports').length));
		if (path.startsWith('/v1/reports/') && request.method() === 'PATCH')
			return json(200, { short_code: path.split('/')[3] });
		return json(404, { error: { code: 'NOT_FOUND', message: path } });
	});
	return seen;
}

const created = (): [number, unknown] => [
	201,
	{ id: '7c1e0000-0000-4000-8000-000000000001', short_code: 'Hk3vT9qP', moderation_state: 'visible', warnings: [] },
];

/** An 800 × 600 JPEG, drawn by the browser. */
async function jpeg(page: Page): Promise<Buffer> {
	const base64 = await page.evaluate(async () => {
		const canvas = new OffscreenCanvas(800, 600);
		const context = canvas.getContext('2d')!;
		context.fillStyle = '#c84';
		context.fillRect(0, 0, 800, 600);
		const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
		const bytes = new Uint8Array(await blob.arrayBuffer());
		return btoa(String.fromCharCode(...bytes));
	});
	return Buffer.from(base64, 'base64');
}

const heading = (page: Page, name: string) => expect(page.getByRole('heading', { level: 1, name })).toBeFocused();

test('signed out, the start page asks for an account and returns here after sign-in', async ({ page }) => {
	await page.goto('/prijava/izgubljena-zival');
	await expect(page).toHaveTitle('Prijavite izgubljenega psa ali mačko · Najdimo');
	await expect(page.getByRole('heading', { level: 1, name: 'Prijava izgubljene živali' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Vpiši se' })).toHaveAttribute(
		'href',
		'/vpis?next=%2Fprijava%2Fizgubljena-zival'
	);
	await checkStep(page);
});

test('SL: a new pet in seven steps, keyboard and axe on each, one POST with the coarsened point', async ({
	page,
	baseURL,
}) => {
	test.setTimeout(120_000);
	const seen = await fakeApi(page, baseURL!, [], created);
	await page.goto('/prijava/izgubljena-zival');
	await expect(page.getByRole('heading', { level: 1, name: 'Katero žival iščete?' })).toBeVisible();
	await expect(page.getByRole('progressbar', { name: 'Korak 1 od 7' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Vnesi podatke' })).toBeChecked();
	await checkStep(page);
	// Enter on the chosen row advances.
	await page.getByRole('radio', { name: 'Vnesi podatke' }).press('Enter');

	await heading(page, 'Dodajte fotografije');
	await page.getByRole('button', { name: 'Naprej' }).click();
	await expect(page.getByText('Dodajte vsaj eno fotografijo, da bodo ljudje žival prepoznali.')).toBeVisible();
	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
	await expect(page.getByText('Naslovna fotografija')).toBeVisible({ timeout: 30_000 });
	await checkStep(page);
	await page.getByRole('button', { name: 'Naprej' }).click();

	await heading(page, 'Opišite žival');
	await page.getByRole('button', { name: 'Naprej' }).click();
	await expect(page.getByText('Izberite vsaj eno barvo.')).toBeVisible();
	await checkStep(page);
	await page.getByRole('radio', { name: 'Pes' }).click();
	await page.getByRole('button', { name: 'Rjava' }).click();
	await page.getByRole('textbox', { name: 'Ime' }).fill('Medo');
	await page.getByRole('textbox', { name: 'Ime' }).press('Enter');

	await heading(page, 'Kje ste žival nazadnje videli?');
	await expect(page.locator('[data-slot=map-view]')).toHaveAttribute('data-state', 'ready');
	await expect(page.getByText('Šiška, Ljubljana')).toBeVisible();
	await checkStep(page);
	await page.getByRole('button', { name: 'Potrdi kraj' }).click();

	await heading(page, 'Kdaj ste žival nazadnje videli?');
	await expect(page.getByRole('radio', { name: 'Pravkar' })).toBeChecked();
	await page.getByRole('radio', { name: 'Drugič' }).click();
	await page.getByLabel('Datum').fill('2026-01-10');
	await expect(page.getByText('Od takrat je minilo več kot 30 dni.', { exact: false })).toBeVisible();
	await checkStep(page);
	await page.getByRole('radio', { name: 'Pravkar' }).click();
	await page.getByRole('button', { name: 'Naprej' }).click();

	await heading(page, 'Kaj se je zgodilo?');
	await expect(page.getByRole('radio', { name: /Samo s sporočili v aplikaciji/ })).toBeChecked();
	await page.getByRole('switch', { name: 'Ponujam nagrado za vrnitev' }).click();
	await page.getByRole('textbox', { name: 'Opomba (neobvezno)' }).fill('Pokličite me na 041 123 456');
	await page.getByRole('button', { name: 'Naprej' }).click();
	await expect(
		page.getByText('Odstranite telefonsko številko, e-naslov, povezavo ali številko računa.', { exact: false })
	).toBeVisible();
	await expect(page.getByText('Nikoli nikomur ne plačajte vnaprej', { exact: false })).toBeVisible();
	await checkStep(page);
	await page.getByRole('textbox', { name: 'Opomba (neobvezno)' }).fill('');
	await page.getByRole('textbox', { name: 'Znesek v evrih (neobvezno)' }).fill('100');
	await page.getByRole('button', { name: 'Naprej' }).click();

	await heading(page, 'Preverite in objavite');
	await expect(page.getByText('Medo')).toBeVisible();
	await expect(page.getByText('100 €')).toBeVisible();
	await checkStep(page);
	await page.getByRole('button', { name: 'Objavi iskanje' }).click();

	await heading(page, 'Iskanje je objavljeno');
	await checkStep(page);
	const posts = seen.filter((call) => call.method === 'POST' && call.path === '/v1/reports');
	expect(posts).toHaveLength(1);
	expect(posts[0]!.key).toMatch(/^[0-9a-f-]{36}$/);
	const body = posts[0]!.body as { location: { lat: number; lng: number } } & Record<string, unknown>;
	expect(body).toMatchObject({
		type: 'lost',
		species: 'dog',
		name: 'Medo',
		colours: ['brown'],
		requested_radius_m: 500,
		contact_pref: 'chat_only',
		reward_eur: 100,
		reward_note: null,
		photo_ids: ['9b0e2d4c-1f3a-4b5c-8d6e-7f8091a2b3c4'],
	});
	// C6: the picker's point coarsened once (20–30 m), never the raw map centre.
	const metres =
		Math.hypot((body.location.lng - 14.5058) * Math.cos((46.0514 * Math.PI) / 180), body.location.lat - 46.0514) *
		111_320;
	expect(metres).toBeGreaterThanOrEqual(19);
	expect(metres).toBeLessThanOrEqual(31);
});

test('EN: a saved pet goes straight to photos and where; a duplicate open search can be updated', async ({
	page,
	baseURL,
}) => {
	test.setTimeout(120_000);
	const seen = await fakeApi(page, baseURL!, [structuredClone(pet)], () => [
		409,
		{
			error: {
				code: 'DUPLICATE_OPEN_REPORT',
				message: 'x',
				details: { report_id: 'r1', short_code: 'Pq7xYz12' },
			},
		},
	]);
	await page.goto(`/en/report/lost?pet=${pet.id}`);
	await expect(page.getByRole('radio', { name: 'Runo · Dog' })).toBeChecked();
	await expect(page.getByRole('progressbar', { name: 'Step 1 of 6' })).toBeVisible();
	await checkStep(page);
	await page.getByRole('button', { name: 'Next' }).click();
	await heading(page, 'Add photos');
	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0002.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
	await expect(page.getByText('Cover photo')).toBeVisible({ timeout: 30_000 });
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.locator('[data-slot=map-view]')).toHaveAttribute('data-state', 'ready');
	await page.getByRole('button', { name: 'Confirm location' }).click();
	await heading(page, 'When did you last see your pet?');
	await page.getByRole('button', { name: 'Next' }).click();
	await heading(page, 'What happened?');
	await page.getByRole('button', { name: 'Next' }).click();
	await heading(page, 'Check and publish');
	await page.getByRole('button', { name: 'Publish search' }).click();

	await expect(page.getByText('You already have an open search for this pet')).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Update the existing search' })).toBeChecked();
	await checkStep(page);
	await page.getByRole('button', { name: 'Publish search' }).click();
	await heading(page, 'Your search is live');
	expect(seen.find((call) => call.method === 'POST' && call.path === '/v1/reports')?.body).toMatchObject({
		pet_id: pet.id,
	});
	expect(seen.find((call) => call.method === 'PATCH')?.path).toBe('/v1/reports/Pq7xYz12');
});

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import { pet as fixture } from '@zivali/api/__fixtures__/pets';
import type { Pet } from '@zivali/types';

import { api, signInAs } from './session';

// TASK-16.6: P8 My pets on web against a faked pets and photos API (C4, C5): create with a photo, edit, delete,
// the free limit, SL and EN, axe in each state.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PUT_URL = 'https://e2e.eu.r2.cloudflarestorage.com/zivali-private/uploads/u1/photo.jpg?X-Amz-Signature=e2e';
const cors = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': '*',
	'access-control-allow-methods': '*',
};

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

type Seen = { method: string; path: string; body: unknown };

/** Signs in and answers /v1 from `pets` (changed in place, like the API would), recording every call. */
async function fakeApi(page: Page, baseURL: string, pets: Pet[]) {
	const seen: Seen[] = [];
	await signInAs(page, { id: me.id, role: me.role, aal: 'aal1' }, baseURL);
	await page.route(`${api()}/v1/**`, async (route) => {
		const request = route.request();
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		const path = new URL(request.url()).pathname;
		const body = request.postData() ? request.postDataJSON() : undefined;
		seen.push({ method: request.method(), path, body });
		const json = (status: number, value?: unknown) => route.fulfill({ status, headers: cors, json: value });
		const [, , , id, action] = path.split('/'); // /v1/pets/:id/:action
		const found = pets.find((item) => item.id === id);

		if (path === '/v1/me') return json(200, me);
		if (path === '/v1/photos')
			return json(201, {
				photo_id: 'photo-new',
				upload: {
					url: PUT_URL,
					method: 'PUT',
					headers: { 'Content-Type': 'image/jpeg' },
					expires_at: '2030-01-01T00:00:00Z',
				},
			});
		if (path.endsWith('/complete')) return json(202, { status: 'uploaded' });
		if (path === '/v1/pets' && request.method() === 'GET') return json(200, { items: pets });
		if (path === '/v1/pets' && request.method() === 'POST') {
			if (pets.filter((item) => !item.archived_at).length >= 2)
				return json(409, {
					error: { code: 'CONFLICT', message: 'Pet limit reached', details: { code: 'PET_LIMIT', limit: 2 } },
				});
			const created: Pet = {
				...fixture,
				...body,
				id: `pet-${pets.length + 1}`,
				chip_number: body.chip ? body.chip.replace(/\D/g, '') : null,
				chip_status: body.chip ? 'valid' : 'none',
				photos: [],
			};
			pets.push(created);
			return json(201, created);
		}
		if (!found) return json(404, { error: { code: 'NOT_FOUND', message: path } });
		if (action === 'photos') {
			found.photos = body.photo_ids.map((photoId: string) => ({
				id: photoId,
				thumb_url: 'https://media.zivali.test/p/thumb.webp',
			}));
			return json(200, found);
		}
		if (action === 'archive') return json(200, Object.assign(found, { archived_at: '2026-10-16T10:00:00Z' }));
		if (request.method() === 'GET') return json(200, found);
		if (request.method() === 'PATCH') return json(200, Object.assign(found, body));
		if (request.method() === 'DELETE') {
			pets.splice(pets.indexOf(found), 1);
			return route.fulfill({ status: 204, headers: cors });
		}
		return json(404, { error: { code: 'NOT_FOUND', message: path } });
	});
	await page.route(`${new URL(PUT_URL).origin}/**`, (route) =>
		route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, headers: cors })
	);
	return seen;
}

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

test('SL: an owner adds a pet with a photo and a chip; only they can reveal the number', async ({ page, baseURL }) => {
	test.setTimeout(90_000);
	const seen = await fakeApi(page, baseURL!, []);
	await page.goto('/moje-zivali');
	await expect(page.getByRole('heading', { level: 3, name: 'Še nimate shranjenih živali' })).toBeVisible();
	await expect(page).toHaveTitle('Moje živali · Najdimo');
	await expectNoAxeViolations(page);

	await page.getByRole('link', { name: 'Dodaj žival' }).click();
	await expect(page).toHaveURL('/moje-zivali/nova');
	await expect(page.getByRole('heading', { level: 1, name: 'Nova žival' })).toBeVisible();
	await page
		.locator('input[type=file][multiple]')
		.setInputFiles({ name: 'IMG_0001.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
	await expect(page.getByText('Naslovna fotografija')).toBeVisible({ timeout: 30_000 });
	await page.getByRole('radio', { name: 'Pes' }).click();
	await page.getByRole('textbox', { name: 'Ime' }).fill('Rex');
	await page.getByRole('textbox', { name: 'Številka čipa' }).pressSequentially('705123456789012');
	await expectNoAxeViolations(page);
	await page.getByRole('button', { name: 'Shrani' }).click();

	await expect(page).toHaveURL('/moje-zivali/pet-1');
	await expect(page.getByRole('heading', { level: 1, name: 'Rex' })).toBeVisible();
	await expect(page.getByText('Profil je shranjen.')).toBeVisible();
	expect(seen.find((call) => call.method === 'POST' && call.path === '/v1/pets')?.body).toMatchObject({
		species: 'dog',
		name: 'Rex',
		chip: '705 1234 5678 9012',
	});
	expect(seen.find((call) => call.method === 'PUT')?.body).toEqual({ photo_ids: ['photo-new'] });

	// AC#2: the number is not on the page until the owner asks for it.
	await expect(page.getByRole('main')).not.toContainText('705');
	await page.getByRole('button', { name: 'Pokaži številko' }).click();
	await expect(page.getByText('705 1234 5678 9012')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Skrij številko' })).toBeFocused();
	await expect(page.getByRole('link', { name: 'Prijavi izgubljeno žival' })).toHaveAttribute(
		'href',
		'/prijava/izgubljena-zival?pet=pet-1'
	);
	await expectNoAxeViolations(page);

	await page.getByRole('link', { name: 'Moje živali' }).click();
	await expect(page.getByRole('link', { name: /^Rex/ })).toContainText('Čip vpisan');
	await expect(page.getByRole('main')).not.toContainText('705');
});

test('SL: an owner edits a pet; only the changed field is sent', async ({ page, baseURL }) => {
	const seen = await fakeApi(page, baseURL!, [structuredClone(fixture)]);
	await page.goto(`/moje-zivali/${fixture.id}`);
	await page.getByRole('link', { name: 'Uredi' }).click();
	await expect(page).toHaveURL(`/moje-zivali/${fixture.id}/uredi`);
	await expect(page.getByRole('heading', { level: 1, name: 'Uredi profil' })).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Ime' })).toHaveValue('Runo');
	await expect(page.getByRole('combobox', { name: 'Pasma' })).toHaveValue('Labradorec');
	await expectNoAxeViolations(page);

	await page.getByRole('textbox', { name: 'Ime' }).fill('Runo Mali');
	await page.getByRole('button', { name: 'Shrani' }).click();
	await expect(page).toHaveURL(`/moje-zivali/${fixture.id}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Runo Mali' })).toBeVisible();
	expect(seen.find((call) => call.method === 'PATCH')?.body).toEqual({ name: 'Runo Mali' });
	expect(seen.some((call) => call.method === 'PUT')).toBe(false);
});

test('SL: an owner deletes a pet after confirming, and is back on the list', async ({ page, baseURL }) => {
	const seen = await fakeApi(page, baseURL!, [structuredClone(fixture)]);
	await page.goto(`/moje-zivali/${fixture.id}`);
	await page.getByRole('button', { name: 'Izbriši' }).click();
	const dialog = page.getByRole('alertdialog', { name: 'Izbrišete ta profil?' });
	await expect(dialog).toContainText('Izbrisali bomo tudi vse fotografije profila.');
	await expect(dialog.getByRole('button', { name: 'Prekliči' })).toBeFocused();
	await expectNoAxeViolations(page);
	await dialog.getByRole('button', { name: 'Izbriši profil' }).click();

	await expect(page).toHaveURL('/moje-zivali');
	await expect(page.getByText('Profil je izbrisan.')).toBeVisible();
	await expect(page.getByRole('heading', { level: 3, name: 'Še nimate shranjenih živali' })).toBeVisible();
	expect(seen.some((call) => call.method === 'DELETE' && call.path === `/v1/pets/${fixture.id}`)).toBe(true);
});

test('EN: at the free limit the list shows the note, and a third pet gets it again without losing input', async ({
	page,
	baseURL,
}) => {
	await fakeApi(page, baseURL!, [
		structuredClone(fixture),
		{ ...structuredClone(fixture), id: 'pet-2', name: 'Luna' },
	]);
	await page.goto('/en/my-pets');
	await expect(page.getByRole('heading', { level: 1, name: 'My pets' })).toBeVisible();
	await expect(page.getByText('2 pets')).toBeVisible();
	const note = 'You can save 2 pet profiles for free; Premium Protect allows more.';
	await expect(page.getByRole('status').filter({ hasText: note })).toBeVisible();
	await expectNoAxeViolations(page);

	await page.getByRole('link', { name: 'Add a pet' }).click();
	await expect(page).toHaveURL('/en/my-pets/new');
	await page.getByRole('radio', { name: 'Cat' }).click();
	await page.getByRole('textbox', { name: 'Name' }).fill('Muri');
	await page.getByRole('button', { name: 'Save' }).click();
	const limit = page.getByRole('status').filter({ hasText: note });
	await expect(limit).toBeFocused();
	await expect(limit).toContainText('You can always report a lost pet without a profile.');
	await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Muri');
	await expect(page).toHaveURL('/en/my-pets/new');
	await expectNoAxeViolations(page);
});

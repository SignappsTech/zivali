import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import * as fx from '@zivali/api/__fixtures__/ads';
import { adminMe } from '@zivali/api/__fixtures__/me';

import { api, dismissConsent, signInAs } from './session';

// TASK-37.3: P20 ad management for admins (aal2): list, editor with the live preview, detail with statistics and
// CSV, house ads; access denied for moderators; axe in light and dark. The API is answered here from the
// @zivali/api fixtures and the session is signed by the e2e mock (e2e/session.ts): no apps/api, no Supabase.

const today = new Date('2026-10-15T12:00:00+02:00');
const running = fx.adminAds.items[0]!;
const NEW_ID = 'ad7e1f2a-0000-4000-8000-0000000000aa';

async function signIn(page: Page, me: typeof adminMe, baseURL: string) {
	// The fixture image from the mock API: the CSP allows the media origin (MEDIA_BASE_URL), not the fixture's host.
	const list = {
		...fx.adminAds,
		items: fx.adminAds.items.map((item) =>
			item.image_url ? { ...item, image_url: `${api()}/media/${item.id}.jpg` } : item
		),
	};
	await signInAs(page, me, baseURL);
	await dismissConsent(page);
	await page.route(/\/v1\/me$/, (route) => route.fulfill({ json: me }));
	await page.route(/\/v1\/admin\/ads(\?.*)?$/, (route) =>
		route.request().method() === 'POST'
			? route.fulfill({ json: { ...fx.adminAds.items[2], ...route.request().postDataJSON(), id: NEW_ID } })
			: route.fulfill({ json: list })
	);
	await page.route(/\/v1\/admin\/ads\/[^/]+\/stats/, (route) => route.fulfill({ json: fx.adStats }));
	await page.route(/\/v1\/admin\/audit-log/, (route) => route.fulfill({ json: fx.adHistory }));
	await page.clock.setFixedTime(today);
}

async function expectNoAxeViolations(page: Page) {
	// Let enter fades finish (dialogs, sheets), so contrast is measured on the settled colours.
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every((animation) => !(animation instanceof CSSTransition) || animation.playState === 'finished')
	);
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

/** The preview is drawn from the form: no served slot, no ad request, no impression. */
function adRequests(page: Page) {
	const urls: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/ads/')) urls.push(request.url());
	});
	return urls;
}

for (const colorScheme of ['light', 'dark'] as const) {
	test(`admin ads in ${colorScheme}: list, editor with preview, detail with CSV and house ads have no axe violations`, async ({
		page,
		baseURL,
	}) => {
		test.setTimeout(120_000); // guard: five pages with axe passes and the editor flows
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		const served = adRequests(page);
		await signIn(page, adminMe, baseURL!);
		await page.emulateMedia({ colorScheme });

		// List
		await page.goto('/admin/oglasi');
		await expect(page.getByRole('heading', { level: 1, name: 'Oglasi', exact: true })).toBeVisible();
		await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
		const table = page.getByRole('table', { name: 'Oglasi', exact: true });
		await expect(table.getByRole('link', { name: running.title, exact: true })).toBeVisible();
		await expect(table.getByText('Se prikazuje', { exact: true })).toHaveCount(1);
		await expect(table.getByText('Podprite Najdimo', { exact: true })).toHaveCount(0);
		await expectNoAxeViolations(page);

		// New ad: the checks on save focus the first problem; the preview follows the form.
		await page.getByRole('link', { name: 'Nov oglas', exact: true }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Nov oglas', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Shrani', exact: true }).click();
		await expect(page.getByText('Dodajte opis slike.', { exact: true })).toBeVisible();
		await expect(page.getByLabel('Opis slike (alt)', { exact: true })).toBeFocused();
		await expectNoAxeViolations(page);
		await page.getByLabel('Opis slike (alt)', { exact: true }).fill('Pes z igračo ob polni skodelici hrane');
		await page.getByLabel('Naslov', { exact: true }).fill('Repek: jesenska akcija');
		await page.getByLabel('Besedilo', { exact: true }).fill('Brezplačna dostava do konca meseca.');
		// SL and EN (the default): one button text cannot serve both, so it is typed (TASK-37.3 fix round).
		await page.getByLabel('Besedilo gumba (neobvezno)', { exact: true }).fill('Več o tem');
		await page.getByLabel('Povezava', { exact: true }).fill('https://repek.si/jesen');
		const form = page.locator('form');
		await form
			.getByRole('group', { name: 'Oglasna mesta', exact: true })
			.getByRole('button', { name: 'Stran prijave', exact: true })
			.click();
		const preview = page.getByRole('complementary', { name: 'Predogled', exact: true });
		await preview
			.getByRole('group', { name: 'Mesto', exact: true })
			.getByRole('button', { name: 'Stranska vrstica', exact: true })
			.click();
		const unit = preview.getByRole('group', {
			name: 'Oglas: Repek: jesenska akcija. Brezplačna dostava do konca meseca. Več o tem',
			exact: true,
		});
		await expect(unit).toBeVisible();
		expect((await unit.boundingBox())?.height).toBeGreaterThanOrEqual(452);
		await preview
			.getByRole('group', { name: 'Svetlo / temno', exact: true })
			.getByRole('button', { name: 'Temno', exact: true })
			.click();
		await expectNoAxeViolations(page);
		await page.getByRole('button', { name: 'Shrani', exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`/admin/oglasi/${NEW_ID}$`));

		// Detail: totals, breakdowns, CSV, history.
		await page.goto(`/admin/oglasi/${running.id}`);
		await expect(page.getByRole('heading', { level: 1, name: running.title, exact: true })).toBeVisible();
		await expect(page.getByRole('table', { name: 'Po mestih', exact: true })).toBeVisible();
		await expect(page.getByRole('table', { name: 'Zgodovina sprememb', exact: true })).toBeVisible();
		const download = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Izvozi CSV', exact: true }).click();
		expect((await download).suggestedFilename()).toBe('ad-ad7e1f2a-2026-09-16-2026-10-15.csv');
		await expectNoAxeViolations(page);

		// House ads: one row per language, each with its switch.
		await page.goto('/admin/lastni-oglasi');
		await expect(page.getByRole('heading', { level: 1, name: 'Lastni oglasi', exact: true })).toBeVisible();
		await expect(page.getByRole('switch')).toHaveCount(6);
		await page.getByRole('button', { name: 'Uredi: Posvojitev (SL)', exact: true }).click();
		await expect(page.getByText('Pri lastnih oglasih so mesta in ciljanje fiksni.', { exact: true })).toBeVisible();
		await expectNoAxeViolations(page);

		expect(await page.locator('[data-ad-slot]').count()).toBe(0);
		expect(served).toEqual([]);
		expect(errors).toEqual([]);
	});
}

test('below lg the list stacks and the preview opens as a sheet, with no sideways scroll', async ({
	page,
	baseURL,
}) => {
	await signIn(page, adminMe, baseURL!);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/en/admin/ads');
	await expect(page.getByRole('heading', { level: 1, name: 'Ads', exact: true })).toBeVisible();
	await expect(page.getByRole('table', { name: 'Ads', exact: true })).toBeHidden();
	await expect(page.getByRole('list', { name: 'Ads', exact: true }).getByRole('listitem')).toHaveCount(4);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

	await page.goto('/en/admin/ads/new');
	await expect(page.getByRole('complementary', { name: 'Preview', exact: true })).toBeHidden();
	await page.getByRole('button', { name: 'Preview', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Preview', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await expectNoAxeViolations(page);
});

test('moderators get the access-denied screen and no ad data', async ({ page, baseURL }) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/admin/')) requests.push(request.url());
	});
	await signIn(page, { ...adminMe, role: 'MODERATOR' }, baseURL!);
	for (const path of ['/admin/oglasi', '/admin/lastni-oglasi', `/admin/oglasi/${running.id}`]) {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1, name: 'Dostop ni mogoč', exact: true })).toBeVisible();
	}
	expect(requests).toEqual([]);
});

test('a new ad in two languages needs its own button text: the save is refused and the field is focused', async ({
	page,
	baseURL,
}) => {
	await signIn(page, adminMe, baseURL!);
	await page.goto('/admin/oglasi/nov');
	await page.getByLabel('Opis slike (alt)', { exact: true }).fill('Pes z igračo ob polni skodelici hrane');
	await page.getByLabel('Naslov', { exact: true }).fill('Repek: jesenska akcija');
	await page.getByLabel('Besedilo', { exact: true }).fill('Brezplačna dostava do konca meseca.');
	await page.getByLabel('Povezava', { exact: true }).fill('https://repek.si/jesen');
	await page
		.locator('form')
		.getByRole('group', { name: 'Oglasna mesta', exact: true })
		.getByRole('button', { name: 'Stran prijave', exact: true })
		.click();
	await page.getByRole('button', { name: 'Shrani', exact: true }).click();
	await expect(page.getByText('To polje je obvezno.', { exact: true })).toBeVisible();
	await expect(page.getByLabel(/^Besedilo gumba/)).toBeFocused();
	await expect(page).toHaveURL(/\/admin\/oglasi\/nov$/);
});

test('the CSV has the byte order mark, one header row, one row per statistics row and no formula cells', async ({
	page,
	baseURL,
}) => {
	await signIn(page, adminMe, baseURL!);
	await page.goto(`/admin/oglasi/${running.id}`);
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Izvozi CSV', exact: true }).click();
	const stream = await (await download).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	const text = Buffer.concat(chunks).toString('utf8');
	expect(text.charCodeAt(0)).toBe(0xfeff);
	const lines = text.slice(1).trimEnd().split('\r\n');
	expect(lines).toHaveLength(fx.adStats.items.length + 1);
	for (const line of lines) expect(line).not.toMatch(/(^|,)[=+@-]/);
});

test('a house ad is enabled or paused with its switch (a status call), per language', async ({ page, baseURL }) => {
	const calls: string[] = [];
	await signIn(page, adminMe, baseURL!);
	await page.route(/\/v1\/admin\/ads\/[^/]+\/status$/, (route) => {
		calls.push(route.request().postDataJSON().status);
		return route.fulfill({ json: fx.adminAds.items[0] });
	});
	await page.goto('/admin/lastni-oglasi');
	const first = page.getByRole('switch').first();
	const wasOn = (await first.getAttribute('aria-checked')) === 'true';
	await first.click();
	await expect.poll(() => calls.length).toBe(1);
	expect(calls[0]).toBe(wasOn ? 'paused' : 'active');
});

test('English: the editor and the house ads are in English', async ({ page, baseURL }) => {
	await signIn(page, adminMe, baseURL!);
	await page.goto('/en/admin/ads/new');
	await expect(page.getByRole('heading', { level: 1, name: 'New ad', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByLabel('Image description (alt)', { exact: true })).toBeFocused();
	await page.goto('/en/admin/house-ads');
	await expect(page.getByRole('heading', { level: 1, name: 'House ads', exact: true })).toBeVisible();
});

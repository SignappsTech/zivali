import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import * as fx from '@zivali/api/__fixtures__/directory-admin';
import { adminMe } from '@zivali/api/__fixtures__/me';

// TASK-89.2: the P19 shelter directory for admins (aal2), access denied for moderators, axe in light and dark.
// The API is answered here from the @zivali/api fixtures and the session is a cookie for @supabase/ssr, so the spec
// needs neither apps/api nor Supabase.

const supabaseRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321').hostname.split('.')[0];
const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

// The page runs on a fixed date, so the stale entries and the yearly reminder (from 1 April) do not depend on the
// day of the run; the session must outlive both that date (browser) and the real one (proxy).
const today = new Date('2026-10-15T10:00:00+02:00');

async function signIn(page: Page, me: typeof adminMe, baseURL: string) {
	const exp = Math.floor(Math.max(Date.now(), today.getTime()) / 1000) + 86_400;
	const session = {
		access_token: [
			base64url({ alg: 'HS256', typ: 'JWT' }),
			base64url({ sub: me.id, aal: me.aal, exp }),
			'e2e',
		].join('.'),
		token_type: 'bearer',
		expires_in: 86_400,
		expires_at: exp,
		refresh_token: 'e2e',
		user: {
			id: me.id,
			aud: 'authenticated',
			role: 'authenticated',
			app_metadata: {},
			user_metadata: {},
			created_at: '2026-01-01T00:00:00Z',
		},
	};
	await page
		.context()
		.addCookies([{ name: `sb-${supabaseRef}-auth-token`, value: `base64-${base64url(session)}`, url: baseURL }]);
	await page.route(/\/v1\/me$/, (route) => route.fulfill({ json: me }));
	await page.route(/\/v1\/admin\/shelters$/, (route) => route.fulfill({ json: fx.adminShelters }));
	await page.route(/\/v1\/admin\/municipality-shelters$/, (route) => route.fulfill({ json: fx.adminMunicipalities }));
	await page.route(/\/v1\/admin\/directory\/import/, (route) => route.fulfill({ json: fx.importWithErrors }));
	await page.clock.setFixedTime(today);
}

async function expectNoAxeViolations(page: Page) {
	// Let enter fades finish (drawer, dialogs), so contrast is measured on the settled colours.
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

for (const colorScheme of ['light', 'dark'] as const) {
	test(`admin directory in ${colorScheme}: tables, drawer, import dry run and delete guard have no axe violations`, async ({
		page,
		baseURL,
	}) => {
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		await signIn(page, adminMe, baseURL!);
		await page.emulateMedia({ colorScheme });
		await page.goto('/admin/zavetisca');

		await expect(page.getByRole('heading', { level: 1, name: 'Imenik zavetišč' })).toBeVisible();
		await expect(
			page.getByText('Letno preverjanje: 2 vnosa nista bila preverjena več kot 12 mesecev.')
		).toBeVisible();
		await expect(page.getByRole('table', { name: 'Zavetišča' }).getByText('zastarelo')).toHaveCount(1);
		await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
		await expectNoAxeViolations(page);

		// Edit drawer: 480 px, focus trapped, Escape returns focus to the row.
		const row = page.getByRole('button', { name: 'Zavetišče Lipa', exact: true });
		await row.click();
		const drawer = page.getByRole('dialog', { name: 'Uredi zavetišče' });
		await expect(drawer).toBeVisible();
		expect((await drawer.boundingBox())?.width).toBe(480);
		await drawer.getByLabel('Telefon').fill('07 305 62');
		await drawer.getByRole('button', { name: 'Shrani' }).click();
		await expect(drawer.getByText('Telefonska številka ni veljavna.', { exact: false })).toBeVisible();
		await expectNoAxeViolations(page);
		await page.keyboard.press('Escape');
		await expect(drawer).toBeHidden();
		await expect(row).toBeFocused();

		// CSV import: dry run with errors, apply disabled.
		await page.getByRole('button', { name: 'Uvozi CSV' }).click();
		const dialog = page.getByRole('dialog', { name: 'Uvoz CSV' });
		await dialog
			.locator('input[type=file]')
			.setInputFiles({ name: 'imenik.csv', mimeType: 'text/csv', buffer: Buffer.from('slug\n') });
		await expect(dialog.getByText('1 nov vnos, 2 spremenjena, 0 odstranjenih, 2 napaki')).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Uveljavi spremembe' })).toBeDisabled();
		await expectNoAxeViolations(page);
		await page.keyboard.press('Escape');

		// Delete guard: refused while municipalities are assigned; focus starts on Cancel.
		await page.getByRole('button', { name: 'Dejanja: Zavetišče Lipa' }).first().click();
		await page.getByRole('menuitem', { name: 'Izbriši' }).click();
		const alert = page.getByRole('alertdialog', { name: 'Izbriši: Zavetišče Lipa?' });
		await expect(alert.getByRole('button', { name: 'Prekliči' })).toBeFocused();
		await expect(alert.getByRole('button', { name: 'Izbriši' })).toBeDisabled();
		await expectNoAxeViolations(page);
		await page.keyboard.press('Escape');

		// Municipalities view with an unconfirmed row.
		await page.getByRole('tab', { name: 'Občine' }).click();
		await expect(page.getByRole('table', { name: 'Občine' }).getByText('Ni potrjeno')).toHaveCount(3);
		await expectNoAxeViolations(page);

		expect(errors).toEqual([]);
	});
}

test('below lg the tables become stacked rows and the drawer goes full width below 640 px', async ({
	page,
	baseURL,
}) => {
	await signIn(page, adminMe, baseURL!);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/en/admin/shelters');
	await expect(page.getByRole('heading', { level: 1, name: 'Shelter directory' })).toBeVisible();
	await expect(page.getByRole('table', { name: 'Shelters' })).toBeHidden();
	await expect(page.getByRole('list', { name: 'Shelters' }).getByRole('listitem')).toHaveCount(3);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await expectNoAxeViolations(page);
	await page.getByRole('button', { name: 'Zavetišče Lipa', exact: true }).click();
	expect((await page.getByRole('dialog', { name: 'Edit shelter' }).boundingBox())?.width).toBe(390);
});

test('moderators get the access-denied screen and no directory data', async ({ page, baseURL }) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/admin/')) requests.push(request.url());
	});
	await signIn(page, { ...adminMe, role: 'MODERATOR' }, baseURL!);
	await page.goto('/admin/zavetisca');
	await expect(page.getByRole('heading', { level: 1, name: 'Dostop ni mogoč' })).toBeVisible();
	await expect(page.getByText('Za to stran nimate dovoljenja.')).toBeVisible();
	await expect(page.locator('main').getByText('Imenik zavetišč')).toHaveCount(0);
	expect(requests).toEqual([]);
	await expectNoAxeViolations(page);
});

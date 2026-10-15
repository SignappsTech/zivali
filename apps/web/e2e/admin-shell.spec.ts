import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { adminMe, auditLog, me } from '@zivali/api/__fixtures__/me';
import { CONSENT_VERSION } from '@zivali/analytics';

import { api, signInAs } from './session';

// TASK-34.3: the P19 shell (role navigation, TOTP enrolment and code, access denied, audit log), SL and EN, axe in
// light and dark, and no GA in the console. The API and Supabase Auth are answered here or by e2e/mock-api.ts.

type Me = typeof adminMe;

async function signIn(page: Page, user: Me, baseURL: string) {
	await signInAs(page, user, baseURL);
	await page.route(/\/v1\/me$/, (route) => route.fulfill({ json: user }));
	await page.route(/\/v1\/admin\/audit-log/, (route) => route.fulfill({ json: auditLog }));
}

async function expectNoAxeViolations(page: Page) {
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

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Konzola' });

for (const colorScheme of ['light', 'dark'] as const) {
	test(`admin console in ${colorScheme}: role menu, dashboard, audit log, collapsed menu, no axe violations`, async ({
		page,
		baseURL,
	}) => {
		test.setTimeout(90_000);
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		await signIn(page, adminMe, baseURL!);
		await page.emulateMedia({ colorScheme });
		await page.goto('/admin');

		await expect(page.getByRole('heading', { level: 1, name: 'Nadzorna plošča' })).toBeVisible();
		await expect(page).toHaveTitle('Nadzorna plošča · Konzola Najdimo');
		await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
		for (const group of ['Pregled', 'Vsebina', 'Varnost', 'Organizacije', 'Ljudje', 'Posel', 'Sistem'])
			await expect(sidebar(page).getByRole('list', { name: group })).toBeVisible();
		await expect(sidebar(page).getByRole('link', { name: 'Oglasi, Kmalu' })).toBeVisible();
		await expect(page.getByText('Lokalno')).toBeVisible();
		await expect(page.getByText('Skrbnik')).toBeVisible();
		await expect(page.getByRole('table', { name: 'Zadnje spremembe' }).getByRole('row')).toHaveCount(4);
		await expectNoAxeViolations(page);

		await sidebar(page).getByRole('link', { name: 'Revizijska sled' }).click();
		await expect(page).toHaveURL(/\/admin\/revizijska-sled$/);
		const table = page.getByRole('table', { name: 'Revizijska sled' });
		await expect(table.getByRole('row').nth(1)).toContainText('user.role.set');
		await expect(sidebar(page).getByRole('link', { name: 'Revizijska sled' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		await expectNoAxeViolations(page);

		await page.getByRole('button', { name: 'Skrči meni' }).click();
		await expect(sidebar(page).getByRole('list', { name: 'Sistem' })).toBeVisible();
		await sidebar(page).getByRole('link', { name: 'Uporabniki, Kmalu' }).hover();
		await expect(page.getByRole('tooltip')).toHaveText('Uporabniki');
		await expectNoAxeViolations(page);

		await page.getByRole('button', { name: 'Razširi meni' }).click();
		await sidebar(page).getByRole('link', { name: 'Uporabniki, Kmalu' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Uporabniki' })).toBeVisible();
		await expect(page.getByText('Ta del konzole še pripravljamo.')).toBeVisible();
		expect(errors).toEqual([]);
	});
}

test('English console at 390 px: the menu is a sheet, focus on close, no sideways scroll', async ({
	page,
	baseURL,
}) => {
	await signIn(page, adminMe, baseURL!);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/en/admin/audit-log');
	await expect(page.getByRole('heading', { level: 1, name: 'Audit log' })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Audit log' }).getByRole('listitem')).toHaveCount(3);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.getByRole('button', { name: 'Open menu' }).click();
	const sheet = page.getByRole('dialog', { name: 'Main menu' });
	await expect(sheet.getByRole('button', { name: 'Close menu' })).toBeFocused();
	await expectNoAxeViolations(page);
	await sheet.getByRole('link', { name: 'Dashboard' }).click();
	await expect(sheet).toBeHidden();
	await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});

test('moderators see Overview and Safety only and are refused the audit log, with no admin data', async ({
	page,
	baseURL,
}) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/admin/')) requests.push(request.url());
	});
	await signIn(page, { ...adminMe, role: 'MODERATOR' }, baseURL!);
	await page.goto('/admin/revizijska-sled');
	await expect(page.getByRole('heading', { level: 1, name: 'Dostop ni mogoč' })).toBeVisible();
	await expect(sidebar(page).getByRole('list')).toHaveCount(2);
	await expect(sidebar(page).getByRole('link', { name: 'Revizijska sled' })).toHaveCount(0);
	await expect(page.getByText('Moderator', { exact: true })).toBeVisible();
	expect(requests).toEqual([]);
	await expectNoAxeViolations(page);
});

test('signed-in users without a staff role get the plain refusal: no menu, no TOTP, no hint', async ({
	page,
	baseURL,
}) => {
	const auth: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/auth/v1/factors') || request.url().endsWith('/auth/v1/user'))
			auth.push(request.url());
	});
	await signIn(page, me, baseURL!);
	await page.goto('/admin');
	await expect(page.getByRole('heading', { level: 1, name: 'Dostop ni mogoč' })).toBeVisible();
	await expect(page.getByRole('navigation')).toHaveCount(0);
	await expect(page.getByText('Konzola')).toHaveCount(0);
	expect(auth).toEqual([]);
	await expectNoAxeViolations(page);
});

const factor = {
	id: 'f-1',
	factor_type: 'totp',
	status: 'verified',
	friendly_name: '',
	created_at: '',
	updated_at: '',
};
const qr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="7" height="7"/></svg>';

/** Supabase Auth's MFA endpoints; verifying returns an aal2 session and GET /v1/me reports aal2 from then on. */
async function mockTotp(page: Page, user: Me, factors: object[]) {
	const session = { aal: 'aal1' };
	await page.route(/\/v1\/me$/, (route) => route.fulfill({ json: { ...user, aal: session.aal } }));
	await page.route(`${api()}/auth/v1/user`, (route) =>
		route.fulfill({ json: { id: user.id, aud: 'authenticated', role: 'authenticated', factors } })
	);
	await page.route(`${api()}/auth/v1/factors`, (route) =>
		route.fulfill({
			json: { id: 'f-new', type: 'totp', totp: { qr_code: qr, secret: 'JBSWY3DPEHPK3PXP', uri: '' } },
		})
	);
	await page.route(/\/auth\/v1\/factors\/[^/]+\/challenge$/, (route) =>
		route.fulfill({ json: { id: 'ch-1', type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 } })
	);
	await page.route(/\/auth\/v1\/factors\/[^/]+\/verify$/, async (route) => {
		if (route.request().postDataJSON().code !== '482913')
			return route.fulfill({
				status: 422,
				json: { code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' },
			});
		const query = new URLSearchParams({ sub: user.id, role: user.role.toLowerCase(), aal: 'aal2' });
		const access_token = await (await fetch(`${api()}/e2e/token?${query}`)).text();
		session.aal = 'aal2';
		return route.fulfill({
			json: {
				access_token,
				token_type: 'bearer',
				expires_in: 3600,
				refresh_token: 'e2e-2',
				user: { id: user.id, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
			},
		});
	});
}

test('staff with a factor enter the code before any admin page loads; a wrong code says so', async ({
	page,
	baseURL,
}) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/admin/')) requests.push(request.url());
	});
	const staff: Me = { ...adminMe, aal: 'aal1' };
	await signIn(page, staff, baseURL!);
	await mockTotp(page, staff, [factor]);
	await page.goto('/admin/revizijska-sled');

	await expect(page.getByRole('heading', { level: 1, name: 'Vnesite kodo za preverjanje' })).toBeVisible();
	const field = page.getByLabel('6-mestna koda');
	await expect(field).toBeFocused();
	await expect(page.getByRole('navigation', { name: 'Konzola' })).toHaveCount(0);
	expect(requests).toEqual([]);
	await field.fill('111111');
	await page.getByRole('button', { name: 'Potrdi' }).click();
	await expect(page.getByText('Koda ni pravilna ali je potekla. Poskusite z novo kodo.')).toBeVisible();
	await expect(field).toHaveAttribute('aria-invalid', 'true');
	await expectNoAxeViolations(page);

	await field.fill('482913');
	await page.getByRole('button', { name: 'Potrdi' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Revizijska sled' })).toBeVisible();
	await expect(page).toHaveURL(/\/admin\/revizijska-sled$/);
});

test('staff without a factor enrol with the QR code or the key, in light and dark', async ({ page, baseURL }) => {
	const staff: Me = { ...adminMe, role: 'MODERATOR', aal: 'aal1' };
	await signIn(page, staff, baseURL!);
	await mockTotp(page, staff, []);
	await page.goto('/en/admin');

	await expect(page.getByRole('heading', { level: 1, name: 'Set up two-step verification' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible();
	await expect(page.getByText('JBSW Y3DP EHPK 3PXP')).toBeVisible();
	await expect(page.getByLabel('Code from the app')).toBeFocused();
	await expectNoAxeViolations(page);
	await page.emulateMedia({ colorScheme: 'dark' });
	await expectNoAxeViolations(page);

	await page.getByLabel('Code from the app').fill('482913');
	await page.getByRole('button', { name: 'Confirm and continue' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});

test('no GA in the console even with analytics granted; the public pages still load it', async ({ page, baseURL }) => {
	const external: string[] = [];
	await page.context().route(
		(url) => url.hostname !== 'localhost',
		(route) => {
			external.push(route.request().url());
			return route.fulfill({ contentType: 'text/javascript', body: '' });
		}
	);
	const granted = encodeURIComponent(
		JSON.stringify({ v: CONSENT_VERSION, analytics: true, ts: new Date().toISOString() })
	);
	await page.context().addCookies([{ name: 'zz_consent', value: granted, domain: 'localhost', path: '/' }]);
	await signIn(page, adminMe, baseURL!);

	await page.goto('/admin');
	await expect(page.getByRole('heading', { level: 1, name: 'Nadzorna plošča' })).toBeVisible();
	await page.getByRole('link', { name: 'Revizijska sled' }).first().click();
	await expect(page.getByRole('heading', { level: 1, name: 'Revizijska sled' })).toBeVisible();
	await page.waitForLoadState('networkidle');
	expect(external).toEqual([]);
	expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);

	await page.goto('/');
	await expect.poll(() => external).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-E2ETEST']);
});

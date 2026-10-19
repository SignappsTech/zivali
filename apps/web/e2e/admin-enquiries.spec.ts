import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { adminLeads } from '@zivali/api/__fixtures__/ads';
import { adminMe } from '@zivali/api/__fixtures__/me';

import { dismissConsent, signInAs } from './session';

// TASK-34.10: P19 Enquiries for admins (aal2): the leads table, the drawer with the message, keyboard only, axe in
// light and dark; access denied for moderators. The API is answered here from the @zivali/api fixtures and the
// session is signed by the e2e mock (e2e/session.ts): no apps/api, no Supabase.

const [newest] = adminLeads.items;

async function signIn(page: Page, me: typeof adminMe, baseURL: string) {
	await signInAs(page, me, baseURL);
	await dismissConsent(page);
	await page.route(/\/v1\/me$/, (route) => route.fulfill({ json: me }));
	await page.route(/\/v1\/admin\/leads(\?.*)?$/, (route) => route.fulfill({ json: adminLeads }));
}

async function expectNoAxeViolations(page: Page) {
	// Let enter fades finish (the drawer), so contrast is measured on the settled colours.
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
	test(`enquiries in ${colorScheme}: the table and the drawer have no axe violations and work by keyboard`, async ({
		page,
		baseURL,
	}) => {
		await signIn(page, adminMe, baseURL!);
		await page.emulateMedia({ colorScheme });
		await page.goto('/admin/povprasevanja');
		await expect(page.getByRole('heading', { level: 1, name: 'Povpraševanja', exact: true })).toBeVisible();
		await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, nofollow');
		const table = page.getByRole('table', { name: 'Povpraševanja', exact: true });
		await expect(table.getByRole('row')).toHaveCount(adminLeads.items.length + 1);
		await expectNoAxeViolations(page);

		const opener = table.getByRole('button', { name: newest!.company, exact: true });
		await opener.focus();
		await page.keyboard.press('Enter');
		const drawer = page.getByRole('dialog', { name: newest!.company });
		await expect(drawer.getByText(newest!.message, { exact: true })).toBeVisible();
		await expect(drawer.getByText(/^Soglasje za stik: /)).toBeVisible();
		await expectNoAxeViolations(page);
		await page.keyboard.press('Escape');
		await expect(drawer).toBeHidden();
		await expect(opener).toBeFocused();
	});
}

test('the URL carries no lead data', async ({ page, baseURL }) => {
	await signIn(page, adminMe, baseURL!);
	await page.goto('/admin/povprasevanja');
	await page.getByRole('table').getByRole('button', { name: newest!.company, exact: true }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	expect(new URL(page.url()).pathname).toBe('/admin/povprasevanja');
	expect(new URL(page.url()).search).toBe('');
});

test('moderators get the access-denied screen and no lead data', async ({ page, baseURL }) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/admin/')) requests.push(request.url());
	});
	await signIn(page, { ...adminMe, role: 'MODERATOR' }, baseURL!);
	await page.goto('/admin/povprasevanja');
	await expect(page.getByRole('heading', { level: 1, name: 'Dostop ni mogoč', exact: true })).toBeVisible();
	expect(requests).toEqual([]);
});

test('English: the enquiries page is in English', async ({ page, baseURL }) => {
	await signIn(page, adminMe, baseURL!);
	await page.goto('/en/admin/enquiries');
	await expect(page.getByRole('heading', { level: 1, name: 'Enquiries', exact: true })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: 'Consent to contact', exact: true })).toBeVisible();
});

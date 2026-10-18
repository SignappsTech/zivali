import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { adminAbuseReports, moderationFlags } from '@zivali/api/__fixtures__/abuse';
import { adminMe, me } from '@zivali/api/__fixtures__/me';

import { signInAs } from './session';

// TASK-25.5: P19 abuse reports and moderation flags for moderators and admins (aal2), the refusal for everyone else,
// axe in light and dark. The API is answered here from the @zivali/api fixtures; the session is signed by e2e/mock-api.ts.

type Me = typeof adminMe;

async function signIn(page: Page, user: Me, baseURL: string) {
	await signInAs(page, user, baseURL);
	await page.route(/\/v1\/me$/, (route) => route.fulfill({ json: user }));
	await page.route(/\/v1\/admin\/abuse-reports/, (route) => route.fulfill({ json: adminAbuseReports }));
	await page.route(/\/v1\/admin\/moderation-flags/, (route) => route.fulfill({ json: moderationFlags }));
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
	test(`a moderator reads abuse reports and flags in ${colorScheme}, linked to the listing, no axe violations`, async ({
		page,
		baseURL,
	}) => {
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});
		await signIn(page, { ...adminMe, role: 'MODERATOR' }, baseURL!);
		await page.emulateMedia({ colorScheme });
		await page.goto('/admin');
		await sidebar(page).getByRole('link', { name: 'Prijave zlorab', exact: true }).click();

		await expect(page).toHaveURL(/\/admin\/prijave-zlorab$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Prijave zlorab' })).toBeVisible();
		await expect(page).toHaveTitle('Prijave zlorab · Konzola Najdimo');
		await expect(sidebar(page).getByRole('link', { name: 'Prijave zlorab', exact: true })).toHaveAttribute(
			'aria-current',
			'page'
		);
		const reports = page.getByRole('table', { name: 'Prijave zlorab' });
		await expect(reports.getByRole('row')).toHaveCount(4);
		await expect(reports.getByRole('row').nth(1)).toContainText('Prevara ali zahteva po denarju');
		await expect(reports.getByRole('link', { name: 'Sporočilo o prijavi Lm4wX8rS' })).toHaveAttribute(
			'href',
			'/r/Lm4wX8rS'
		);
		const flags = page.getByRole('table', { name: 'Opozorila za moderacijo' });
		await expect(flags.getByRole('row').nth(1)).toContainText('Samodejno skrito');
		await expectNoAxeViolations(page);
		expect(errors).toEqual([]);
	});
}

test('English at 390 px: stacked rows, no sideways scroll', async ({ page, baseURL }) => {
	await signIn(page, adminMe, baseURL!);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/en/admin/abuse-reports');
	await expect(page.getByRole('heading', { level: 1, name: 'Abuse reports' })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Abuse reports' }).getByRole('listitem')).toHaveCount(3);
	await expect(page.getByRole('list', { name: 'Moderation flags' }).getByRole('listitem')).toHaveCount(2);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await expectNoAxeViolations(page);
});

test('signed-in users without a staff role get the plain refusal and no admin data', async ({ page, baseURL }) => {
	const requests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/v1/admin/')) requests.push(request.url());
	});
	await signIn(page, me, baseURL!);
	await page.goto('/admin/prijave-zlorab');
	await expect(page.getByRole('heading', { level: 1, name: 'Dostop ni mogoč' })).toBeVisible();
	await expect(page.getByRole('table')).toHaveCount(0);
	expect(requests).toEqual([]);
	await expectNoAxeViolations(page);
});

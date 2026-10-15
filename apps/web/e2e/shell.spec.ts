import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { dismissConsent } from './session';

// TASK-11.2: the P1 web shell (header, footer, skip link, sidebar region, menus, 404, guards) at 320, 390 and 1440 px.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.beforeEach(({ page }) => dismissConsent(page));

async function expectNoAxeViolations(page: Page) {
	// Let enter fades finish, so contrast is measured on the settled colours.
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every((animation) => !(animation instanceof CSSTransition) || animation.playState === 'finished')
	);
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const)
	test(`home at 1440 in ${colorScheme}: header, skip link and footer, no sidebar (P3), no axe violations`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme });
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');

		const header = page.getByRole('banner');
		await expect(header.getByRole('navigation', { name: 'Glavni meni' }).getByRole('link')).toHaveText([
			'Zemljevid',
			'Izgubljene',
			'Najdene',
			'Kako deluje',
		]);
		await expect(header.getByRole('link', { name: 'Vpis' })).toBeVisible();
		await expect(header.getByRole('group', { name: 'Jezik: Slovenščina' })).toBeVisible();
		await expect(page.getByRole('complementary')).toHaveCount(0);
		// Logo, 12 links (Cookie settings is a button), SL and EN.
		await expect(page.getByRole('contentinfo').getByRole('link')).toHaveCount(15);

		await page.keyboard.press('Tab');
		const skip = page.getByRole('link', { name: 'Preskoči na vsebino' });
		await expect(skip).toBeFocused();
		await expect(skip).toBeVisible();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#main$/);
		await expectNoAxeViolations(page);
	});

test('"Prijavi" opens its popover from the keyboard, arrows move, Escape returns focus', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/kako-deluje');
	const report = page.getByRole('banner').getByRole('button', { name: 'Prijavi' });
	const menu = page.locator('#report-menu');

	await report.focus();
	await page.keyboard.press('Enter');
	await expect(menu).toBeVisible();
	await expect(menu.getByRole('link', { name: /^Izgubljena žival/ })).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await expect(menu.getByRole('link', { name: /^Najdena žival/ })).toBeFocused();
	await expectNoAxeViolations(page);
	await page.keyboard.press('Escape');
	await expect(menu).toBeHidden();
	await expect(report).toBeFocused();

	await report.click();
	await menu.getByRole('link', { name: /^Izgubljena žival/ }).click();
	await expect(page).toHaveURL(/\/prijava\/izgubljena-zival$/);
	await expect(menu).toBeHidden();
});

test('at 390 the menu is a full-height sheet and "Prijavi" a bottom sheet', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const open = page.getByRole('button', { name: 'Odpri meni' });

	await expect(page.getByRole('complementary')).toBeHidden();
	await open.click();
	const sheet = page.getByRole('dialog', { name: 'Glavni meni' });
	await expect(sheet.getByRole('link', { name: 'Vpis' })).toBeVisible();
	await expect(sheet.getByRole('link', { name: 'English' })).toBeVisible();
	await expectNoAxeViolations(page);
	await page.keyboard.press('Escape');
	await expect(sheet).toBeHidden();
	await expect(open).toBeFocused();

	await page.getByRole('banner').getByRole('button', { name: 'Prijavi' }).click();
	const choices = page.getByRole('dialog', { name: 'Kaj želite prijaviti?' });
	await expect(choices.getByRole('link')).toHaveCount(3);
	await expectNoAxeViolations(page);
	await choices.getByRole('link', { name: /^Opažena žival/ }).click();
	await expect(page).toHaveURL(/\/prijava\/najdena-zival$/);
	await expect(choices).toBeHidden();
});

for (const path of ['/', '/en', '/zavetisca', '/no/such/page'])
	test(`${path} has no horizontal scroll at 320 px`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 640 });
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
	});

for (const { path, lang, canonical, description } of [
	// Next.js writes the root URL without the trailing slash.
	{ path: '/', lang: 'sl', canonical: '', description: /^Ste izgubili ali našli psa ali mačko\?/ },
	{ path: '/en', lang: 'en', canonical: '/en', description: /^Lost or found a dog or cat\?/ },
])
	test(`${path}: localised description, canonical on the app URL and the icons`, async ({ page, request }) => {
		await page.goto(path);
		const origin = new URL(page.url()).origin;

		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}${canonical}`);
		for (const icon of await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').all())
			expect((await request.get((await icon.getAttribute('href'))!)).status()).toBe(200);
		expect((await request.get('/favicon.ico')).status()).toBe(200);
	});

test('the language switch keeps the page', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/kako-deluje');
	await page.getByRole('banner').getByRole('link', { name: 'English' }).click();

	await expect(page).toHaveURL(/\/en\/how-it-works$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('How Najdimo works');
	await expect(page.getByRole('banner').getByRole('link', { name: 'Slovenščina' })).toHaveAttribute(
		'href',
		'/kako-deluje'
	);
});

test('every header and footer link answers (placeholders until their stories ship)', async ({ page, request }) => {
	await page.goto('/');
	const hrefs = await page
		.locator('header a[href], footer a[href], #report-menu a[href]')
		.evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href')!))]);

	for (const href of hrefs) expect(`${href} ${(await request.get(href)).status()}`).toBe(`${href} 200`);
});

test('the signed-in header links answer too (signed out, through sign-in)', async ({ request }) => {
	for (const href of [
		'/nabiralnik',
		'/racun',
		'/racun/opozorila',
		'/racun/placila',
		'/en/inbox',
		'/en/account/alerts',
	])
		expect(`${href} ${(await request.get(href)).status()}`).toBe(`${href} 200`);
});

test('an unknown path gets the calm 404 inside the shell', async ({ page }) => {
	const response = await page.goto('/no/such/page');

	expect(response?.status()).toBe(404);
	await expect(page).toHaveTitle('Strani ni mogoče najti · Najdimo');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Te strani ne najdemo');
	await expect(page.getByRole('main').getByRole('link', { name: 'Na zemljevid' })).toHaveAttribute(
		'href',
		'/zemljevid'
	);
	await expect(page.getByRole('banner')).toBeVisible();
});

// The page asked for goes along as `next` (TASK-9.3), so sign-in returns to it.
for (const [path, target] of [
	['/moje-zivali', '/vpis?next=%2Fmoje-zivali'],
	['/en/portal', '/en/sign-in?next=%2Fen%2Fportal'],
	['/admin/zavetisca', '/vpis?next=%2Fadmin%2Fzavetisca'],
])
	test(`signed out, ${path} is guarded on the server`, async ({ request }) => {
		const response = await request.get(path, { maxRedirects: 0 });

		expect(response.status()).toBe(307);
		expect(response.headers()['location']).toBe(target);
	});

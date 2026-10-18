import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-27.2: P3 home (T1) and content pages (T2 article, T3 FAQ), server-rendered with no client JS of their own.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

const PAGES = [
	{
		path: '/',
		h1: 'Izgubljena žival? Skupaj jo pripeljemo domov.',
		title: 'Izgubljene živali v Sloveniji: psi in mačke · Najdimo',
		ld: 'Organization',
	},
	{
		path: '/en',
		h1: "Lost pet? Let's bring them home together.",
		title: 'Lost and found pets in Slovenia · Najdimo',
		ld: 'Organization',
	},
	{
		path: '/kako-deluje',
		h1: 'Kako deluje Najdimo',
		title: 'Kako deluje prijava izgubljene živali · Najdimo',
		ld: 'WebPage',
	},
	{
		path: '/en/how-it-works',
		h1: 'How Najdimo works',
		title: 'How reporting a lost pet works · Najdimo',
		ld: 'WebPage',
	},
	{
		path: '/varnost',
		h1: 'Nasveti za varnost',
		title: 'Izgubljen pes ali mačka: nasveti in prevare · Najdimo',
		ld: 'Article',
	},
	{ path: '/en/safety', h1: 'Safety tips', title: 'Lost pet tips and how to avoid scams · Najdimo', ld: 'Article' },
	{
		path: '/pogosta-vprasanja',
		h1: 'Pogosta vprašanja',
		title: 'Pogosta vprašanja o izgubljenih živalih · Najdimo',
		ld: 'FAQPage',
	},
	{
		path: '/en/faq',
		h1: 'Frequently asked questions',
		title: 'FAQ about lost and found pets · Najdimo',
		ld: 'FAQPage',
	},
	{
		path: '/za-zavetisca',
		h1: 'Za zavetišča, veterinarje in občine',
		title: 'Za zavetišča: brezplačna objava najdenih živali · Najdimo',
		ld: 'WebPage',
	},
	{
		path: '/en/for-shelters',
		h1: 'For shelters, vets and municipalities',
		title: 'For shelters: publish found animals free · Najdimo',
		ld: 'WebPage',
	},
	{ path: '/o-nas', h1: 'O nas', title: 'O nas: zakaj smo ustvarili Najdimo · Najdimo', ld: 'AboutPage' },
	{ path: '/en/about', h1: 'About us', title: 'About us: why we built Najdimo · Najdimo', ld: 'AboutPage' },
];

for (const { path, h1, title, ld } of PAGES)
	test(`${path}: title, one h1, canonical, Open Graph card, ${ld} JSON-LD, no axe violations`, async ({
		page,
		request,
	}) => {
		const response = await page.goto(path);
		const origin = new URL(page.url()).origin;

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(title);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			origin + (path === '/' ? '' : path)
		);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^.{80,}$/);
		const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
		await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', `Najdimo – ${h1}`);
		const card = await request.get(new URL(ogImage!).pathname);
		expect([card.status(), card.headers()['content-type']]).toEqual([200, 'image/png']);
		const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];
		expect(graph[0]['@type']).toBe(ld);
		// Decorative images carry alt="" on purpose (e.g. the third mosaic tile); the axe check below still covers image-alt.
		for (const img of await page.locator('main img').all()) expect(await img.getAttribute('alt')).not.toBeNull();
		await expectNoAxeViolations(page);
	});

test('the home hero has the page primary, so the header "Prijavi" is secondary there and on How it works', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	for (const path of ['/', '/kako-deluje']) {
		await page.goto(path);
		await expect(page.getByRole('banner').getByRole('button', { name: 'Prijavi' })).toHaveAttribute(
			'data-variant',
			'secondary'
		);
	}
	await page.goto('/pogosta-vprasanja');
	await expect(page.getByRole('banner').getByRole('button', { name: 'Prijavi' })).toHaveAttribute(
		'data-variant',
		'default'
	);
});

test('FAQ rows open and close from the keyboard without page scripts', async ({ page }) => {
	await page.goto('/pogosta-vprasanja');
	const row = page.locator('details').filter({ hasText: 'Ali bo številka čipa javna?' });
	const answer = row.getByText('Uporabimo jo samo za iskanje ujemanj.');

	await expect(answer).toBeHidden();
	await row.locator('summary').focus();
	await page.keyboard.press('Enter');
	await expect(answer).toBeVisible();
	await page.keyboard.press('Space');
	await expect(answer).toBeHidden();
	await page.getByText('Kako prepoznam prevaro?').click();
	await page.getByRole('link', { name: 'nasvetih za varnost' }).click();
	await expect(page).toHaveURL(/\/varnost$/);
});

test('"On this page": a sticky list from lg, one collapsed row at 390 that jumps to the section', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/kako-deluje');
	const desktop = page.getByRole('navigation', { name: 'Na tej strani' });
	await expect(desktop.getByRole('link')).toHaveCount(7);
	await desktop.getByRole('link', { name: 'Kako iščemo ujemanja' }).click();
	await expect(page).toHaveURL(/#kako-iscemo-ujemanja$/);

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/en/safety');
	const toggle = page.locator('summary', { hasText: 'On this page' });
	await expect(toggle).toBeVisible();
	await toggle.click();
	await page
		.getByRole('navigation', { name: 'On this page' })
		.getByRole('link', { name: 'If you find an animal' })
		.click();
	await expect(page.getByRole('heading', { level: 2, name: 'If you find an animal' })).toBeInViewport();
});

for (const path of ['/', '/kako-deluje', '/pogosta-vprasanja', '/en/for-shelters'])
	test(`${path} has no horizontal scroll at 320 px`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 640 });
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
	});

test('sitemap.xml lists the content pages in both locales', async ({ request }) => {
	const xml = await (await request.get('/sitemap.xml')).text();

	for (const path of ['/kako-deluje', '/en/safety', '/pogosta-vprasanja', '/en/for-shelters', '/o-nas'])
		expect(xml).toMatch(new RegExp(`<loc>[^<]+${path}</loc>`));
});

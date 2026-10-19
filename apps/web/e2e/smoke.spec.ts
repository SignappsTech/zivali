import { expect, test } from '@playwright/test';

import en from '@zivali/i18n/dist/en.json' with { type: 'json' };
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };

for (const { path, lang, messages } of [
	{ path: '/', lang: 'sl', messages: sl },
	{ path: '/en', lang: 'en', messages: en },
]) {
	test(`${path} renders in ${lang} under the CSP without console errors`, async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') errors.push(message.text());
		});

		const response = await page.goto(path);

		expect(response?.status()).toBe(200);
		expect(response?.headers()['content-security-policy']).toMatch(
			/(?:^|; )script-src 'self' 'nonce-[^']+' 'strict-dynamic'(?:;|$)/
		);
		expect(response?.headers()['x-content-type-options']).toBe('nosniff');
		// hreflang alternates (C15) from the proxy; Next.js appends its font preloads to the same Link header.
		const origin = new URL(page.url()).origin;
		expect(response?.headers()['link']).toContain(
			`<${origin}/>; rel="alternate"; hreflang="sl", <${origin}/en>; rel="alternate"; hreflang="en", <${origin}/>; rel="alternate"; hreflang="x-default"`
		);
		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.pages.home.hero_title);
		expect(errors).toEqual([]);
	});
}

test('home layout B: recent reports next to the map teaser, server-rendered; empty state, no numbers without stats', async ({
	page,
}) => {
	const home = sl.pages.home;
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');

	// The mock API lists no reports and has no /v1/stats/public (404), so the numbers block stays out.
	const recent = page.getByRole('region', { name: home.near_title_no_location });
	await expect(recent.getByText(home.near_empty_body)).toBeVisible();
	// From lg the heading link and the teaser open the map; at 390 only the teaser. No map library on the home page.
	const map = recent.getByRole('link', { name: home.near_open_map });
	await expect(map).toHaveCount(2);
	for (const link of await map.all()) await expect(link).toHaveAttribute('href', '/zemljevid');
	await expect(page.locator('canvas, .maplibregl-map')).toHaveCount(0);
	await expect(recent.getByRole('link', { name: home.near_empty_action })).toHaveAttribute(
		'href',
		'/racun/opozorila'
	);
	await expect(page.getByText(home.stat_reunited)).toHaveCount(0);
	// From lg the last section sits 96 px above the footer, one section gap, not two (TASK-115.11).
	const shelters = (await page.getByRole('region', { name: home.shelters_title }).boundingBox())!;
	const footer = (await page.locator('footer').first().boundingBox())!;
	expect(Math.round(footer.y - (shelters.y + shelters.height))).toBe(96);

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(map).toHaveCount(1);
});

test('the CSP nonce differs between requests', async ({ request }) => {
	const nonce = async () =>
		(await request.get('/')).headers()['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1];
	const [first, second] = [await nonce(), await nonce()];

	expect(first).toBeTruthy();
	expect(second).not.toBe(first);
});

test('an unknown path renders the 404 with a nonce', async ({ page }) => {
	const response = await page.goto('/no/such/page');

	expect(response?.status()).toBe(404);
	expect(response?.headers()['content-security-policy']).toMatch(/'nonce-[^']+'/);
});

test('dark mode follows the OS', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveClass(/\bdark\b/);

	await page.emulateMedia({ colorScheme: 'light' });
	await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
});

test('the page preloads its three web font files, 60 KB at most together (system §4)', async ({ page, request }) => {
	await page.goto('/');
	const fonts = await page
		.locator('link[rel="preload"][as="font"]')
		.evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));

	expect(fonts).toHaveLength(3);
	const bytes = await Promise.all(fonts.map(async (href) => (await (await request.get(href)).body()).length));
	expect(bytes.reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(60_000);
});

test('/api/health answers', async ({ request }) => {
	const response = await request.get('/api/health');

	expect(response.ok()).toBe(true);
	expect(await response.json()).toEqual({ ok: true, version: expect.any(String), env: expect.any(String) });
});

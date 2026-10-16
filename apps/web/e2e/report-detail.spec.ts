import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { publicReport } from '@zivali/api/__fixtures__/reports';

// TASK-18.2: P9 /r/[code] server-rendered from the report API (e2e/mock-api.ts: Rex12345 lost with a reward,
// the found fixture, Gone1234 gone, anything else unknown).
const appUrl = `http://localhost:${process.env.PLAYWRIGHT_PORT}`;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

const meta = (page: Page, selector: string) => page.locator(selector).first().getAttribute('content');

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 },
]) {
	test(`/r/Rex12345 is server-rendered with SEO, the reward warning and no axe violations (${viewport.width} px)`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const response = await page.goto('/r/Rex12345');

		expect(response?.status()).toBe(200);
		await expect(page.locator('html')).toHaveAttribute('lang', 'sl');
		await expect(page).toHaveTitle('Izgubljen pes Rex – Ljubljana · Najdimo');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rex');
		await expect(page.getByText('Čip vpisan')).toBeVisible();
		await expect(page.getByText(/^Nagrada: 50\s€$/)).toBeVisible();
		await expect(page.getByRole('note')).toContainText('Nikoli nikomur ne plačajte vnaprej.');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${appUrl}/r/Rex12345`);
		expect(await meta(page, 'meta[name="description"]')).toMatch(/^Pogrešan pes Rex, rjave in bele barve\./);
		expect(await page.locator('meta[name="robots"]').count()).toBe(0);

		const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];
		expect(jsonLd[0]).toMatchObject({ '@type': 'Article', headline: 'Rex' });
		expect(JSON.stringify(jsonLd)).not.toMatch(/"geo"|46\.064|14\.493/);

		// Open Graph image: the photo and the type label, a PNG.
		const og = await meta(page, 'meta[property="og:image"]');
		expect(og).toBe(`${appUrl}/r/Rex12345/opengraph-image`);
		const image = await page.request.get(og!);
		expect(image.status()).toBe(200);
		expect(image.headers()['content-type']).toBe('image/png');

		await expectNoAxeViolations(page);
		// The map waits below the fold; its text alternative is there from the start.
		await expect(page.getByText('Območje: Šiška, približno 500 m')).toBeAttached();
		expect(errors).toEqual([]);
	});
}

test('/en/r/Rex12345 is the English page', async ({ page }) => {
	await page.goto('/en/r/Rex12345');

	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page).toHaveTitle('Lost dog Rex – Ljubljana · Najdimo');
	await expect(page.getByText(/^Reward offered: €50$/)).toBeVisible();
	expect(await meta(page, 'meta[property="og:image"]')).toBe(`${appUrl}/r/Rex12345/opengraph-image?lang=en`);
	await expectNoAxeViolations(page);
});

test('a gone report answers 410 with the P1 page and noindex', async ({ page }) => {
	const response = await page.goto('/r/Gone1234');

	expect(response?.status()).toBe(410);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ta prijava ni več na voljo');
	await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
	await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
	expect((await page.request.get('/r/Gone1234/opengraph-image')).status()).toBe(404);
	await expectNoAxeViolations(page);
});

test('an unknown code answers 404', async ({ page }) => {
	expect((await page.goto('/r/Nope1234'))?.status()).toBe(404);
});

// TASK-17.7: the /m page's "Uredi prijavo" links to /r/<code>, which is this page now.
test('the manage page Edit target is a working detail page', async ({ page }) => {
	const response = await page.goto(`/r/${publicReport.short_code}`);

	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Najden pes');
});

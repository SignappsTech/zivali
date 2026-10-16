import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import { publicReport } from '@zivali/api/__fixtures__/reports';

import { dismissConsent, signInAs } from './session';

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

// The /m page's "Uredi prijavo" opens /r/<code>/uredi (e2e/lifecycle.spec.ts); the found report's own page works too.
test('a found report has its detail page', async ({ page }) => {
	const response = await page.goto(`/r/${publicReport.short_code}`);

	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Najden pes');
});

// TASK-21.6: slot A contact (C9). The browser's calls are answered here: GET /v1/me (a confirmed account) and
// POST /v1/conversations; the session is signed by the e2e mock (e2e/session.ts).
test('signed in, "Pošlji sporočilo" opens the conversation about the report', async ({ page, baseURL }) => {
	const id = 'c9a1d2e3-0000-4000-8000-000000000006';
	const sent: unknown[] = [];
	const answer = (url: RegExp, handler: (route: Route) => Promise<void>) =>
		page.route(url, (route) => (route.request().method() === 'OPTIONS' ? route.continue() : handler(route)));
	await signInAs(page, { id: me.id, role: 'USER', aal: 'aal1' }, baseURL!);
	await dismissConsent(page);
	await answer(/\/v1\/me$/, (route) => route.fulfill({ json: me }));
	await answer(/\/v1\/notifications(\?.*)?$/, (route) =>
		route.fulfill({ json: { items: [], next_cursor: null, unread: 0 } })
	);
	await answer(/\/v1\/conversations$/, (route) => {
		if (route.request().method() !== 'POST') return route.fulfill({ json: { items: [], next_cursor: null } });
		sent.push(route.request().postDataJSON());
		return route.fulfill({ json: { id } });
	});
	await page.goto('/r/Rex12345');

	await page.getByRole('button', { name: 'Pošlji sporočilo', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`/nabiralnik/${id}$`));
	expect(sent).toEqual([{ about_report_code: 'Rex12345' }]);
});

test('signed out, "To je moja žival" on a found report opens the P16 gate and sends nothing', async ({ page }) => {
	const sent: string[] = [];
	await page.route(/\/v1\/conversations$/, (route) => {
		sent.push(route.request().method());
		return route.abort();
	});
	await dismissConsent(page);
	await page.goto(`/r/${publicReport.short_code}`);

	await page.getByRole('button', { name: 'To je moja žival', exact: true }).click();
	const gate = page.getByRole('dialog', { name: 'Za pogovor potrebujete račun' });
	await expect(gate).toBeVisible();
	await expect(gate.getByRole('link', { name: 'Vpiši se' })).toBeVisible();
	expect(sent).toEqual([]);
});

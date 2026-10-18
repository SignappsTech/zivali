import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-90.1: T5 /zavetisca and T6 /zavetisca/[slug] server-rendered from the directory API (e2e/mock-api.ts).
const appUrl = `http://localhost:${process.env.PLAYWRIGHT_PORT}`;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

const jsonLd = async (page: Page) =>
	JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];

for (const { path, lang, h1, title, canonical } of [
	{
		path: '/zavetisca',
		lang: 'sl',
		h1: 'Zavetišča za živali po občinah',
		title: 'Zavetišča za živali po občinah · Najdimo',
		canonical: '/zavetisca',
	},
	{
		path: '/en/shelters',
		lang: 'en',
		h1: 'Animal shelters by municipality',
		title: 'Animal shelters by municipality · Najdimo',
		canonical: '/en/shelters',
	},
]) {
	test(`T5 ${path} is server-rendered in ${lang} with SEO and no axe violations`, async ({ page }) => {
		const response = await page.goto(path);

		expect(response?.status()).toBe(200);
		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		await expect(page).toHaveTitle(title);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${appUrl}${canonical}`);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /2/);
		const [collection] = await jsonLd(page);
		expect(collection['@type']).toBe('CollectionPage');
		expect(collection.mainEntity.itemListElement).toHaveLength(2);
		await expectNoAxeViolations(page);
	});
}

test('T5 search answers confirmed, likely and unconfirmed municipalities by the client rule', async ({ page }) => {
	await page.goto('/zavetisca');
	const search = page.getByRole('combobox', { name: 'Vaša občina' });
	const answer = page.locator('[aria-live="polite"]');

	await search.fill('skof');
	await expect(page.getByRole('option')).toHaveText(['Škofja Loka', 'Škofljica']);
	await search.press('ArrowDown');
	await search.press('Enter');
	await expect(search).toHaveValue('Škofljica');
	await expect(answer.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toHaveAttribute(
		'href',
		'tel:+38612345678'
	);
	await expectNoAxeViolations(page);

	await search.fill('Kočev');
	await page.getByRole('option', { name: 'Kočevje' }).click();
	await expect(answer.getByText('Ni potrjeno', { exact: true })).toBeVisible();
	await expect(answer.getByRole('heading', { name: 'Morda pristojno zavetišče' })).toBeVisible();
	const unconfirmedCall = answer.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana. Pristojnost ni potrjena.' });
	await expect(unconfirmedCall).toHaveText('Pokliči (ni potrjeno)');
	await expect(unconfirmedCall).toHaveAttribute('data-variant', 'secondary');
	await expectNoAxeViolations(page);

	await search.fill('osil');
	await page.getByRole('option', { name: 'Osilnica' }).click();
	await expect(answer.getByText('Najbližji zavetišči')).toBeVisible();
	await expect(answer.locator('a[href^="tel:"]')).toHaveCount(0);

	await search.fill('Kamnk');
	await expect(answer).toHaveText('Občine »Kamnk« ne najdemo. Preverite zapis ali jo poiščite na seznamu spodaj.');
});

test('T5 "Uporabi mojo lokacijo" fills the municipality from the device and sends only the rounded point (TASK-114.11)', async ({
	page,
	context,
}) => {
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation({ latitude: 46.056947, longitude: 14.505751 });
	const sent: string[] = [];
	page.on('request', (request) => sent.push(`${request.url()} ${request.postData() ?? ''}`));
	await page.goto('/zavetisca');
	const reverse = page.waitForRequest(
		(request) => request.method() === 'POST' && request.url().endsWith('/v1/geo/reverse')
	);

	await page.getByRole('button', { name: 'Uporabi mojo lokacijo' }).click();

	expect((await reverse).postDataJSON()).toEqual({ lat: 46.06, lng: 14.51 });
	await expect(page.getByRole('combobox', { name: 'Vaša občina' })).toHaveValue('Ljubljana');
	await expect(
		page.locator('[aria-live="polite"]').getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })
	).toHaveAttribute('href', 'tel:+38612345678');
	expect(sent.filter((line) => /46\.056|14\.505/.test(line))).toEqual([]);
	expect(page.url()).not.toMatch(/46\.|14\./);
	await expectNoAxeViolations(page);
});

test('T6 shelter page in SL and EN with AnimalShelter JSON-LD, canonical and no axe violations', async ({ page }) => {
	for (const { path, title, call } of [
		{
			path: '/zavetisca/zavetisce-ljubljana',
			title: 'Zavetišče Ljubljana – zavetišče za živali · Najdimo',
			call: 'Pokliči Zavetišče Ljubljana',
		},
		{
			path: '/en/shelters/zavetisce-ljubljana',
			title: 'Zavetišče Ljubljana – animal shelter · Najdimo',
			call: 'Call Zavetišče Ljubljana',
		},
	]) {
		const response = await page.goto(path);

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(title);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${appUrl}${path}`);
		await expect(page.getByRole('link', { name: call })).toHaveAttribute('href', 'tel:+38612345678');
		const [shelter, breadcrumb] = await jsonLd(page);
		expect(shelter).toMatchObject({ '@type': 'AnimalShelter', url: `${appUrl}${path}`, telephone: '+38612345678' });
		expect(shelter.areaServed).toEqual(['Ljubljana', 'Škofljica']);
		expect(breadcrumb['@type']).toBe('BreadcrumbList');
		await expectNoAxeViolations(page);
	}
});

test('T6 without a phone and with stale data', async ({ page }) => {
	await page.goto('/zavetisca/zavetisce-kocevje');

	await expect(
		page.getByText('Podatki so bili nazadnje preverjeni 3. 8. 2025. Pred obiskom pokličite.')
	).toBeVisible();
	await expect(page.getByText('Telefonska številka ni objavljena.', { exact: false })).toBeVisible();
	await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
	await expectNoAxeViolations(page);
});

test('an unknown shelter is a 404', async ({ page }) => {
	expect((await page.goto('/zavetisca/no-such-shelter'))?.status()).toBe(404);
});

test('sitemap.xml lists the shelter pages in both locales on the app URL', async ({ request }) => {
	const xml = await (await request.get('/sitemap.xml')).text();

	for (const path of [
		'/zavetisca',
		'/en/shelters',
		'/zavetisca/zavetisce-kocevje',
		'/en/shelters/zavetisce-ljubljana',
	])
		expect(xml).toContain(`<loc>${appUrl}${path}</loc>`);
	expect(xml).toContain(`hreflang="en" href="${appUrl}/en/shelters/zavetisce-kocevje"`);
});

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-38.3: P22 /oglasevanje and /en/advertise, server-rendered with the partner stats from e2e/mock-api.ts
// (@zivali/api/__fixtures__/ads partnerStats). The enquiry goes from the browser to the API; these tests answer it.
const appUrl = `http://localhost:${process.env.PLAYWRIGHT_PORT}`;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Answers the browser's POST /v1/leads (cross-origin, so the preflight too); returns the bodies it saw. */
async function answerLeads(page: Page, status: number, body: unknown) {
	const sent: Record<string, unknown>[] = [];
	await page.route('**/v1/leads', (route) => {
		const request = route.request();
		const cors = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
		};
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		sent.push(request.postDataJSON());
		return route.fulfill({ status, json: body, headers: cors });
	});
	return sent;
}

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

for (const { path, lang, title, h1, og } of [
	{
		path: '/oglasevanje',
		lang: 'sl',
		title: 'Oglašujte lastnikom psov in mačk · Najdimo',
		h1: 'Oglašujte pri nas',
		og: '/og/sl-partners.png',
	},
	{
		path: '/en/advertise',
		lang: 'en',
		title: 'Advertise to dog and cat owners · Najdimo',
		h1: 'Advertise with us',
		og: '/og/en-partners.png',
	},
]) {
	test(`P22 ${path} is indexable, server-rendered in ${lang}, without ads or axe violations`, async ({ page }) => {
		const response = await page.goto(path);

		expect(response?.status()).toBe(200);
		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		await expect(page).toHaveTitle(title);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${appUrl}${path}`);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Vet Partner|Veterinarski/);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`${og}$`));
		expect((await page.request.get(og)).headers()['content-type']).toBe('image/png');
		const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];
		expect(graph.map((node: { '@type': string }) => node['@type'])).toEqual([
			'WebPage',
			'BreadcrumbList',
			'FAQPage',
		]);
		await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
		await expectNoAxeViolations(page);
	});
}

test('P22 audience: real numbers with "< 5", the region switch and the pilot note', async ({ page }) => {
	await page.goto('/en/advertise');
	const numbers = page.locator('dl dd');

	await expect(numbers).toHaveText(['1,240', '86', '31']);
	await expect(page.getByText('We are piloting in Ljubljana.', { exact: false })).toBeVisible();
	await page.getByRole('combobox', { name: 'Region' }).selectOption('koroska');
	await expect(numbers).toHaveText(['38', '< 5fewer than 5', '0']);
	await expect(numbers.nth(1).getByText('< 5')).toBeVisible();
});

test('P22 enquiry: errors first, then the lead is sent with consent and confirmed', async ({ page }) => {
	const sent = await answerLeads(page, 201, { id: 'a1e5f00d-0000-4000-8000-000000000001' });
	await page.goto('/oglasevanje#povprasevanje');
	const form = page.locator('#povprasevanje');

	await form.getByRole('button', { name: 'Pošlji povpraševanje' }).click();
	await expect(form.getByText('Vpišite ime podjetja.')).toBeVisible();
	await expect(form.getByText('Za odgovor potrebujemo vaše soglasje.')).toBeVisible();
	await expect(form.getByLabel('Podjetje')).toBeFocused();
	await expectNoAxeViolations(page);

	await form.getByLabel('Podjetje').fill('Veterinarska ambulanta Primer');
	await form.getByLabel('Ime in priimek').fill('Ana Novak');
	await form.getByLabel('E-naslov').fill('ana@primer.si');
	await form.getByLabel('Kaj vas zanima?').selectOption('vet_partner');
	await form.getByLabel('Sporočilo').fill('Zanima nas mesto na strani prijave.');
	await form.getByRole('checkbox', { name: /Strinjam se/ }).check();
	await form.getByRole('button', { name: 'Pošlji povpraševanje' }).click();

	await expect(form.getByRole('heading', { name: 'Hvala, povpraševanje smo prejeli' })).toBeFocused();
	await expect(form.getByText('Odgovorili vam bomo na ana@primer.si.')).toBeVisible();
	expect(sent).toEqual([
		expect.objectContaining({ interest: 'vet_partner', consent: true, locale: 'sl', email: 'ana@primer.si' }),
	]);
	await expectNoAxeViolations(page);
});

test('P22 enquiry: a rate limit keeps the details and says when to try again', async ({ page }) => {
	await answerLeads(page, 429, { error: { code: 'RATE_LIMITED', message: 'Too many' } });
	await page.goto('/en/advertise#enquiry');
	const form = page.locator('#enquiry');

	await form.getByLabel('Company').fill('Example clinic');
	await form.getByLabel('Full name').fill('Ana Novak');
	await form.getByLabel('Email address').fill('ana@example.com');
	await form.getByLabel('Message').fill('Interested in the report page slot.');
	await form.getByRole('checkbox', { name: /I agree/ }).check();
	await form.getByRole('button', { name: 'Send enquiry' }).click();

	await expect(form.getByRole('status')).toHaveText(
		'Several enquiries were sent from this network. Please try again in an hour. Your details are still in the form.'
	);
	await expect(form.getByLabel('Company')).toHaveValue('Example clinic');
});

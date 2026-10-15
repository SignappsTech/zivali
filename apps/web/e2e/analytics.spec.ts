import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { CONSENT_VERSION } from '@zivali/analytics';

test.use({ storageState: { cookies: [], origins: [] } }); // no stored choice: the banner is under test

// playwright.config.ts builds with the ga4 provider and this test id. Every request off localhost is answered here,
// so nothing leaves the machine and the test sees each one.
const ID = 'G-E2ETEST';

async function visit(page: Page, path: string, analytics?: boolean) {
	const external: string[] = [];
	await page.context().route(
		(url) => url.hostname !== 'localhost',
		(route) => {
			external.push(route.request().url());
			return route.fulfill({ contentType: 'text/javascript', body: '' });
		}
	);
	if (analytics !== undefined) {
		const value = encodeURIComponent(
			JSON.stringify({ v: CONSENT_VERSION, analytics, ts: new Date().toISOString() })
		);
		await page.context().addCookies([{ name: 'zz_consent', value, domain: 'localhost', path: '/' }]);
	}
	const response = await page.goto(path);
	await page.waitForLoadState('networkidle');
	return { external, response };
}

const gaCookies = async (context: BrowserContext) =>
	(await context.cookies()).map((cookie) => cookie.name).filter((name) => name.startsWith('_ga'));

for (const [label, analytics] of [
	['not asked yet', undefined],
	['declined', false],
] as const) {
	test(`${label}: no request reaches Google and no _ga cookie`, async ({ page }) => {
		const { external } = await visit(page, '/', analytics);

		expect(external).toEqual([]);
		expect(await gaCookies(page.context())).toEqual([]);
		expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false);
	});
}

test('on grant: consent default then update, gtag.js with the CSP nonce, page_view by route template', async ({
	page,
}) => {
	const { external, response } = await visit(page, '/en?utm_source=e2e&code=AB12CD', true);
	const nonce = response?.headers()['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1];
	const origin = new URL(page.url()).origin;

	await expect.poll(() => external).toEqual([`https://www.googletagmanager.com/gtag/js?id=${ID}`]);
	const script = page.locator('script[src^="https://www.googletagmanager.com/gtag/js"]');
	expect(await script.evaluate((element: HTMLScriptElement) => element.nonce)).toBe(nonce);
	const dataLayer = await page.evaluate(() =>
		(window as unknown as { dataLayer: IArguments[] }).dataLayer.map((args) => Array.from(args))
	);
	expect(dataLayer).toEqual([
		[
			'consent',
			'default',
			{
				analytics_storage: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
			},
		],
		['consent', 'update', { analytics_storage: 'granted' }],
		['js', expect.anything()],
		['config', ID, { send_page_view: false }],
		// Locale, short code and other query text are gone; campaign parameters stay.
		['set', { page_location: `${origin}/?utm_source=e2e`, page_referrer: '', page_title: '/' }],
		['event', 'page_view'],
	]);
});

test('on withdraw: ga-disable flag set and _ga cookies deleted', async ({ page }) => {
	await page.context().addCookies([
		{ name: '_ga', value: 'GA1.1.1.1', domain: 'localhost', path: '/' },
		{ name: '_ga_E2ETEST', value: 'GS2.1.1', domain: 'localhost', path: '/' },
	]);

	const { external } = await visit(page, '/', false);

	expect(external).toEqual([]);
	expect(await gaCookies(page.context())).toEqual([]);
	expect(await page.evaluate((id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`], ID)).toBe(
		true
	);
});

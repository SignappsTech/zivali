import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } }); // no stored choice: the banner is under test

// TASK-13.2 / P17: the banner on a first visit, Reject and Accept against the ga4 build (see analytics.spec.ts: every
// request off localhost is answered here), Cookie settings from the footer, withdrawal.
async function visit(page: Page, path = '/en') {
	const external: string[] = [];
	await page.context().route(
		(url) => url.hostname !== 'localhost',
		(route) => {
			external.push(route.request().url());
			return route.fulfill({ contentType: 'text/javascript', body: '' });
		}
	);
	await page.goto(path);
	return external;
}
const gaCookies = async (page: Page) =>
	(await page.context().cookies()).map((c) => c.name).filter((name) => name.startsWith('_ga'));

test('first visit: Reject and Accept equal, axe clean; Reject sends nothing to Google and is remembered', async ({
	page,
}) => {
	const external = await visit(page);
	const banner = page.getByRole('dialog', { name: 'Cookie choice' });
	await expect(banner).toBeVisible();
	await expect(banner.getByRole('heading', { name: 'Cookies and your privacy' })).toBeFocused();

	// Customise is the text button after them (TASK-115.11); Reject and Accept weigh the same.
	const sizes = await banner.getByRole('button').evaluateAll((els) =>
		els.slice(0, 2).map((e) => {
			const { width, height } = e.getBoundingClientRect();
			return `${Math.round(width)}x${Math.round(height)}`;
		})
	);
	expect(new Set(sizes).size, sizes.join()).toBe(1);
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

	await banner.getByRole('button', { name: 'Reject all' }).click();
	await expect(banner).toBeHidden();
	await page.reload();
	await page.waitForLoadState('networkidle');
	await expect(banner).toBeHidden();
	expect(external).toEqual([]);
	expect(await gaCookies(page)).toEqual([]);
});

test('Accept loads GA at once; Cookie settings reopens, withdrawal clears _ga and stops analytics', async ({
	page,
}) => {
	const external = await visit(page);
	await page.getByRole('dialog').getByRole('button', { name: 'Accept all' }).click();
	await expect.poll(() => external.some((url) => url.includes('googletagmanager.com/gtag/js'))).toBe(true);
	await page.context().addCookies([{ name: '_ga', value: 'GA1.1.1.1', domain: 'localhost', path: '/' }]);

	await page.getByRole('button', { name: 'Cookie settings' }).click();
	const analytics = page.getByRole('switch', { name: 'Analytics cookies' });
	await expect(analytics).toBeChecked();
	await analytics.uncheck();
	await page.getByRole('button', { name: 'Save choice' }).click();

	await expect(page.getByRole('dialog')).toBeHidden();
	await expect(page.getByRole('status')).toHaveText('Choice saved.');
	await expect(page.getByRole('button', { name: 'Cookie settings' })).toBeFocused();
	expect(await gaCookies(page)).toEqual([]);
	expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)['ga-disable-G-E2ETEST'])).toBe(
		true
	);
});

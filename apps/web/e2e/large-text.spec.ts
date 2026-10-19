import { expect, type Locator, type Page, test } from '@playwright/test';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };

// TASK-18.8 (QA TASK-18.4, TASK-17.4): with the root text at 200 % (as a 32 px browser default font) nothing scrolls
// sideways: buttons wrap their label inside the pill and the header wraps its items onto more rows (WCAG 1.4.4,
// 1.4.10; docs/tech/frontend.md DoD "works at 320 px width and 200 % text").

async function openWithLargeText(page: Page, path: string, width: number) {
	await page.setViewportSize({ width, height: 844 });
	await page.goto(path);
	await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
	await page.evaluate(() => document.fonts.ready);
}

/** The page's scroll width, the viewport width and the visible elements under `root` that end past the viewport. */
function reach(root: Locator) {
	return root.evaluate((element) => {
		const width = document.documentElement.clientWidth;
		const past = [element, ...element.querySelectorAll('*')]
			.filter((node) => node.checkVisibility() && node.getBoundingClientRect().right > width + 1)
			.map((node) => `<${node.tagName.toLowerCase()} class="${node.getAttribute('class') ?? ''}">`);
		return { scrollWidth: document.documentElement.scrollWidth, width, past: past.slice(0, 10) };
	});
}

for (const code of ['Rex12345', publicReport.short_code])
	test(`/r/${code} at 390 px and 200 % text has no sideways scroll: the actions wrap, the header fits`, async ({
		page,
	}) => {
		await openWithLargeText(page, `/r/${code}`, 390);
		// The slot actions first: the sighting link (slot A) and the share menu button (slot B, a client island).
		await expect(page.getByRole('link', { name: sl.report.action_sighting, exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: sl.report.share_button, exact: true })).toBeVisible();
		const { scrollWidth, width, past } = await reach(page.locator('body'));

		expect(scrollWidth, past.join('\n')).toBeLessThanOrEqual(width);
		expect((await reach(page.getByRole('banner'))).past).toEqual([]);
	});

// Content variant (logo, "Prijavi", menu) and flow variant (logo, close).
for (const path of ['/', '/kako-deluje', '/vpis', '/prijava/izgubljena-zival', '/m'])
	test(`the header at 320 px and 200 % text stays inside the viewport (${path})`, async ({ page }) => {
		await openWithLargeText(page, path, 320);

		expect((await reach(page.getByRole('banner'))).past).toEqual([]);
	});

// At 100 % text the bar keeps its P1 height: 64 px below md, 88 px from md.
for (const [width, height] of [
	[390, 64],
	[1280, 88],
])
	test(`the header at ${width} px and 100 % text is ${height} px high`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');

		expect((await page.getByRole('banner').boundingBox())?.height).toBe(height);
	});

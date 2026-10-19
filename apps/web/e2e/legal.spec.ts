import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// TASK-28.1: the five legal pages render from MDX at the C15 paths, show the draft notice and pass axe.
const PAGES = [
	['sl', '/zasebnost', 'Politika zasebnosti'],
	['sl', '/piskotki', 'Politika piškotkov'],
	['sl', '/pogoji-uporabe', 'Pogoji uporabe'],
	['sl', '/podatki-o-podjetju', 'Podatki o podjetju'],
	['sl', '/dostopnost', 'Dostopnost'],
	['en', '/en/privacy', 'Privacy policy'],
	['en', '/en/cookies', 'Cookie policy'],
	['en', '/en/terms', 'Terms of use'],
	['en', '/en/company-information', 'Company information'],
	['en', '/en/accessibility', 'Accessibility'],
] as const;

for (const [locale, path, title] of PAGES)
	test(`${path}: h1, draft notice, sections and no axe violations`, async ({ page }) => {
		await page.goto(path);

		await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
		await expect(page.getByRole('note')).toContainText(locale === 'sl' ? 'Osnutek' : 'Draft');
		await expect(page.locator('article h2').first()).toBeVisible();

		const { violations } = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(violations.map(({ id }) => id)).toEqual([]);
	});

// TASK-114.21: the sticky "Na tej strani" list marks the section being read; clicks and the back button stay native.
test('/zasebnost: the table of contents marks the current section', async ({ page }) => {
	await page.goto('/zasebnost');
	const toc = page.getByRole('navigation', { name: 'Na tej strani' });
	// The disclosure's copy of the list is hidden from lg (Desktop Chrome is 1280 px wide).
	const current = toc.locator('[aria-current="location"]:visible');
	await expect(current).toHaveText('1. Na kratko');

	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await expect(current).toHaveText('18. Spremembe te politike');
	await expect(current).toBeInViewport();

	await toc.getByRole('link', { name: '4. Zakaj podatke obdelujemo in na kateri pravni podlagi' }).click();
	await expect(page).toHaveURL(/#s4$/);
	await expect(current).toHaveText('4. Zakaj podatke obdelujemo in na kateri pravni podlagi');
	await expect(page.locator('#s4')).toBeInViewport();

	await toc.getByRole('link', { name: '12. Komu podatke zaupamo' }).click();
	await expect(page).toHaveURL(/#s12$/);
	await expect(current).toHaveText('12. Komu podatke zaupamo');

	await page.goBack();
	await expect(page).toHaveURL(/#s4$/);
	await expect(page.locator('#s4')).toBeInViewport();
	await expect(current).toHaveText('4. Zakaj podatke obdelujemo in na kateri pravni podlagi');

	// Too close to the end for its heading to reach the top: the click still marks it.
	await toc.getByRole('link', { name: '17. Otroci' }).click();
	await expect(current).toHaveText('17. Otroci');
	await expect(current).toHaveCount(1);

	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations.map(({ id }) => id)).toEqual([]);
});

test('every footer legal link resolves to a real page', async ({ page }) => {
	for (const name of ['Zasebnost', 'Piškotki', 'Pogoji uporabe', 'Podatki o podjetju', 'Dostopnost']) {
		await page.goto('/');
		// The column link; Podatki o podjetju is also in the operator line.
		await page.getByRole('contentinfo').getByRole('navigation').getByRole('link', { name, exact: true }).click();
		await expect(page.getByRole('note')).toContainText('Osnutek');
	}
});

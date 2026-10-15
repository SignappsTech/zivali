import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// TASK-28.1: the five legal pages render from MDX at the C15 paths, show the draft notice and pass axe.
const PAGES = [
	['sl', '/zasebnost', 'Politika zasebnosti'],
	['sl', '/piskotki', 'Politika piškotkov'],
	['sl', '/pogoji-uporabe', 'Pogoji uporabe'],
	['sl', '/impresum', 'Impresum'],
	['sl', '/dostopnost', 'Izjava o dostopnosti'],
	['en', '/en/privacy', 'Privacy policy'],
	['en', '/en/cookies', 'Cookie policy'],
	['en', '/en/terms', 'Terms of use'],
	['en', '/en/imprint', 'Imprint'],
	['en', '/en/accessibility', 'Accessibility statement'],
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

test('every footer legal link resolves to a real page', async ({ page }) => {
	for (const name of ['Zasebnost', 'Piškotki', 'Pogoji uporabe', 'Impresum', 'Dostopnost']) {
		await page.goto('/');
		await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click();
		await expect(page.getByRole('note')).toContainText('Osnutek');
	}
});

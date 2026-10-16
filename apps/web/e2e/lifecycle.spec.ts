import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { api, signInAs } from './session';

// TASK-26.4: the owner's lifecycle on web (P9 slot A, P14): close with a reason, reopen, mark reunited and the
// reunited page, and the edit page. e2e/mock-api.ts keeps the owner's report Own12345 in memory.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const OWNER = { id: '0b5f6a3e-6c1d-4f8e-9a2b-3c4d5e6f7a80', role: 'USER', aal: 'aal1' } as const;

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}
const transitions = (page: Page) => {
	const sent: unknown[] = [];
	page.on('request', (request) => {
		if (request.url().endsWith('/v1/reports/Own12345/transitions')) sent.push(request.postDataJSON());
	});
	return sent;
};

test.beforeEach(async ({ page, baseURL }) => {
	await fetch(`${api()}/e2e/reset`, { method: 'POST' });
	await signInAs(page, OWNER, baseURL!);
});

test('the owner closes the search with a reason, then reopens it within the window', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const sent = transitions(page);
	await page.goto('/r/Own12345');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Medo');
	await expectNoAxeViolations(page);

	// P9: "Zaključi iskanje" is in the owner's "Več možnosti" (slot C).
	await page.getByRole('button', { name: 'Več možnosti' }).click();
	await page.getByRole('menuitem', { name: 'Zaključi iskanje' }).click();
	const dialog = page.getByRole('dialog', { name: 'Zaključite iskanje?' });
	await expect(dialog.getByRole('button', { name: 'Zaključi iskanje' })).toBeDisabled();
	await expectNoAxeViolations(page);
	// "Prijava je bila pomota" goes as `other`: `removed` stays with moderation (C4).
	await dialog.getByRole('radio', { name: 'Prijava je bila pomota' }).click();
	await dialog.getByRole('button', { name: 'Zaključi iskanje' }).click();

	await expect(page.getByText('Iskanje je zaključeno.')).toBeVisible();
	await expect(page.getByText('Zaključeno', { exact: true })).toBeVisible();
	expect(sent).toEqual([{ action: 'close', reason: 'other' }]);

	await page.getByRole('button', { name: 'Ponovno odpri' }).click();
	await expect(page.getByText('Iskanje je spet odprto.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Žival je spet doma' })).toBeVisible();
	expect(sent).toEqual([{ action: 'close', reason: 'other' }, { action: 'reopen' }]);
	await expectNoAxeViolations(page);
	expect(errors).toEqual([]);
});

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 },
])
	test(`the owner marks the pet home and lands on the calm reunited page (${viewport.width} px)`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		const sent = transitions(page);
		await page.goto('/r/Own12345');

		await page.getByRole('button', { name: 'Žival je spet doma' }).click();
		const dialog = page.getByRole('dialog', { name: 'Je Medo res spet doma?' });
		await expectNoAxeViolations(page);
		await dialog.getByRole('button', { name: 'Da, spet je doma' }).click();

		await expect(page).toHaveURL(/\/r\/Own12345\/spet-doma$/);
		await expect(page).toHaveTitle('Spet doma · Najdimo');
		await expect(page.getByRole('heading', { level: 1, name: 'Medo je spet doma' })).toBeFocused();
		await expect(page.getByRole('switch', { name: 'Delite svojo zgodbo' })).toHaveAttribute(
			'aria-checked',
			'false'
		);
		await expect(page.getByRole('link', { name: 'Končano' })).toHaveAttribute('href', '/zemljevid');
		expect(sent).toEqual([{ action: 'mark_reunited' }]);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
		await expectNoAxeViolations(page);

		// The report now shows the reunited variant, with the quiet reopen for the owner.
		await page.goto('/r/Own12345');
		await expect(page.getByText('Spet doma', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Ponovno odpri' })).toBeVisible();
	});

// TASK-17.7: the /m page's "Uredi prijavo" and the owner's "Uredi" open this page.
test('the edit page saves the changes and goes back to the report', async ({ page }) => {
	await page.goto('/r/Own12345');
	await page.getByRole('link', { name: 'Uredi' }).click();

	await expect(page).toHaveURL(/\/r\/Own12345\/uredi$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uredi prijavo');
	await expectNoAxeViolations(page);
	await page.getByLabel('Opis okoliščin (neobvezno)').fill('Medo se je ustrašil ognjemeta.');
	await page.getByRole('button', { name: 'Shrani' }).click();

	await expect(page).toHaveURL(/\/r\/Own12345$/);
	await expect(page.getByText('Shranjeno.')).toBeVisible();
	await expect(page.getByText('Medo se je ustrašil ognjemeta.')).toBeVisible();
});

test('My reports lists the report with its status', async ({ page }) => {
	await page.goto('/en/my-reports');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('My reports');
	await expect(page.getByRole('link', { name: /Medo/ })).toHaveAttribute('href', '/en/r/Own12345');
	await expectNoAxeViolations(page);
});

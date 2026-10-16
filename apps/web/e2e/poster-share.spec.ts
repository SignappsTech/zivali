import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-24.2: P9 slot B share menu and the P18 poster (e2e/mock-api.ts: Rex12345 lost with a photo served by the mock,
// Gone1234 gone). The native popover and <dialog> only open in a real browser, so they are checked here.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 },
]) {
	test(`the share menu opens, copies the link and is keyboard reachable (${viewport.width} px)`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.goto('/r/Rex12345');

		const button = page.getByRole('button', { name: 'Deli ali natisni plakat' });
		await button.click();
		const menu = page.getByRole('menu', { name: 'Deli ali natisni plakat' });
		await expect(menu).toBeVisible();
		await expect(menu.getByRole('menuitem')).toHaveText([
			'Kopiraj povezavo',
			/WhatsApp/,
			/Facebook/,
			'Več …',
			'Plakat s QR kodo',
		]);
		// Focus starts on the first row; arrows move between rows.
		await expect(menu.getByRole('menuitem', { name: 'Kopiraj povezavo' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(menu.getByRole('menuitem', { name: /WhatsApp/ })).toBeFocused();
		await expectNoAxeViolations(page);

		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('Enter');
		await expect(menu).toBeHidden();
		await expect(page.getByRole('status').filter({ hasText: 'Povezava je kopirana.' })).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/r\/Rex12345$/);
	});
}

test('the poster dialog downloads najdimo-Rex12345.pdf', async ({ page }) => {
	await page.goto('/r/Rex12345');
	await page.getByRole('button', { name: 'Deli ali natisni plakat' }).click();
	await page.getByRole('menuitem', { name: 'Plakat s QR kodo' }).click();

	const dialog = page.getByRole('dialog', { name: 'Plakat s QR kodo' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Plakat ima kodo QR, ki odpre to prijavo.')).toBeVisible();
	await expectNoAxeViolations(page);

	const download = page.waitForEvent('download');
	await dialog.getByRole('button', { name: 'Prenesi PDF' }).click();
	expect((await download).suggestedFilename()).toBe('najdimo-Rex12345.pdf');

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('button', { name: 'Deli ali natisni plakat' })).toBeFocused();
});

test('the poster and square routes answer files, and nothing for a gone report', async ({ request }) => {
	const pdf = await request.get('/r/Rex12345/poster.pdf?lang=en');
	expect(pdf.status()).toBe(200);
	expect(pdf.headers()['content-type']).toBe('application/pdf');
	expect(pdf.headers()['content-disposition']).toBe('inline; filename="najdimo-Rex12345.pdf"');
	expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');

	const square = await request.get('/r/Rex12345/square.png');
	expect(square.status()).toBe(200);
	expect(square.headers()['content-type']).toBe('image/png');

	expect((await request.get('/r/Gone1234/poster.pdf')).status()).toBe(404);
	expect((await request.get('/r/Gone1234/square.png')).status()).toBe(404);
});

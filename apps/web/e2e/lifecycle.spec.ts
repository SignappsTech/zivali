import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { clickUrl, serveAds, unitName, watchShifts } from './ads';
import { api, hydrated, signInAs } from './session';

// TASK-26.4: the owner's lifecycle on web (P9 slot A, P14): close with a reason, reopen, mark reunited and the
// reunited page, and the edit page. e2e/mock-api.ts keeps the owner's report Mine1234 in memory.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const OWNER = { id: '0b5f6a3e-6c1d-4f8e-9a2b-3c4d5e6f7a80', role: 'USER', aal: 'aal1' } as const;

async function expectNoAxeViolations(page: Page) {
	// Axe measures contrast mid-fade otherwise (a slow single-worker CI run): wait for every animation to settle.
	await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}
const transitions = (page: Page) => {
	const sent: unknown[] = [];
	page.on('request', (request) => {
		if (request.url().endsWith('/v1/reports/Mine1234/transitions')) sent.push(request.postDataJSON());
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
	await page.goto('/r/Mine1234');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Medo');
	await expectNoAxeViolations(page);

	// P9: "Zaključi iskanje" is in the owner's "Več možnosti" (slot C).
	await (await hydrated(page.getByRole('button', { name: 'Več možnosti' }))).click();
	await page.getByRole('menuitem', { name: 'Zaključi iskanje' }).click();
	const dialog = page.getByRole('dialog', { name: 'Zaključite iskanje?' });
	await expect(dialog.getByRole('button', { name: 'Zaključi iskanje' })).toBeDisabled();
	await expectNoAxeViolations(page);
	// "Prijava je bila pomota" goes as `other`: `removed` stays with moderation (C4).
	await dialog.getByRole('radio', { name: 'Prijava je bila pomota' }).click();
	await dialog.getByRole('button', { name: 'Zaključi iskanje' }).click();

	// The page's own note, not the toast with the same words.
	await expect(page.getByRole('main').getByText('Iskanje je zaključeno.')).toBeVisible();
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
		const cls = await watchShifts(page);
		await page.goto('/r/Mine1234');

		await (await hydrated(page.getByRole('button', { name: 'Žival je spet doma' }))).click();
		const dialog = page.getByRole('dialog', { name: 'Je Medo res spet doma?' });
		await expectNoAxeViolations(page);
		// TASK-36.5: the reunited page has its one labelled ad unit (P21), and nothing shifts when it fills in.
		const seen = await serveAds(page);
		await dialog.getByRole('button', { name: 'Da, spet je doma' }).click();

		await expect(page).toHaveURL(/\/r\/Mine1234\/spet-doma$/);
		await expect(page).toHaveTitle('Spet doma · Najdimo');
		await expect(page.getByRole('heading', { level: 1, name: 'Medo je spet doma' })).toBeFocused();
		await expect(page.getByRole('switch', { name: 'Delite svojo zgodbo' })).toHaveAttribute(
			'aria-checked',
			'false'
		);
		await expect(page.getByRole('link', { name: 'Končano' })).toHaveAttribute('href', '/zemljevid');
		expect(sent).toEqual([{ action: 'mark_reunited' }]);
		// The ad never sits beside the support ask (TASK-33.2): it shows once the owner answers it.
		await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
		await page
			.getByRole('region', { name: 'Pomagajte, da Najdimo ostane brezplačno', exact: true })
			.getByRole('button', { name: 'Preskoči', exact: true })
			.click();
		const ad = page.locator('a[data-ad-slot="reunited"]');
		await expect(ad).toHaveAccessibleName(unitName);
		await expect(ad).toHaveAttribute('href', clickUrl('reunited'));
		expect(seen.slots).toEqual(['reunited']);
		expect(await cls()).toBeLessThan(0.1);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
		await expectNoAxeViolations(page);

		// The report now shows the reunited variant, with the quiet reopen for the owner.
		await page.goto('/r/Mine1234');
		await expect(page.getByText('Spet doma', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Ponovno odpri' })).toBeVisible();
	});

// TASK-17.7: the /m page's "Uredi prijavo" and the owner's "Uredi" open this page.
test('the edit page saves the changes and goes back to the report', async ({ page }) => {
	await page.goto('/r/Mine1234');
	await page.getByRole('link', { name: 'Uredi' }).click();

	await expect(page).toHaveURL(/\/r\/Mine1234\/uredi$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uredi prijavo');
	await expectNoAxeViolations(page);
	await page.getByLabel('Opis okoliščin (neobvezno)').fill('Medo se je ustrašil ognjemeta.');
	await page.getByRole('button', { name: 'Shrani' }).click();

	await expect(page).toHaveURL(/\/r\/Mine1234$/);
	await expect(page.getByText('Shranjeno.')).toBeVisible();
	await expect(page.getByText('Medo se je ustrašil ognjemeta.')).toBeVisible();
});

test('My reports lists the report with its status', async ({ page }) => {
	await page.goto('/en/my-reports');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('My reports');
	await expect(page.getByRole('link', { name: /Medo/ })).toHaveAttribute('href', '/en/r/Mine1234');
	await expectNoAxeViolations(page);
});

// TASK-26.6, C10: a reminder link changes nothing by being opened; only the press sends, and a made-up code or action
// is ignored.
test('the reminder link ?action=keep sends nothing on load, only the "Nadaljuj iskanje" press extends', async ({
	page,
}) => {
	const sent = transitions(page);
	await page.goto('/moje-prijave?r=Mine1234&action=keep');
	await expect(page.getByText('Še iščete?')).toBeVisible();
	await expect(page.getByRole('link', { name: /Medo/ })).toBeVisible();
	expect(sent).toEqual([]);
	await page.reload();
	await expect(page.getByText('Še iščete?')).toBeVisible();
	expect(sent).toEqual([]);

	await page.getByRole('button', { name: 'Nadaljuj iskanje' }).click();
	await expect(page).toHaveURL(/\/moje-prijave$/);
	expect(sent).toEqual([{ action: 'extend' }]);
	await expect(page.getByRole('heading', { level: 1, name: 'Moje prijave' })).toBeFocused();
});

test('the link ?action=close opens the reason dialog without sending; "Pusti odprto" returns focus to the heading', async ({
	page,
}) => {
	const sent = transitions(page);
	await page.goto('/moje-prijave?r=Mine1234&action=close');
	const dialog = page.getByRole('dialog', { name: 'Zaključite iskanje?' });
	await expect(dialog).toBeVisible();
	expect(sent).toEqual([]);
	await dialog.getByRole('button', { name: 'Pusti odprto' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('heading', { level: 1, name: 'Moje prijave' })).toBeFocused();
	expect(sent).toEqual([]);
});

test('a malformed code or an unknown action opens nothing and sends nothing', async ({ page }) => {
	const sent = transitions(page);
	for (const query of ['r=../x&action=keep', 'r=Mine1234&action=reopen', 'r=Mine1234&action=%3Cb%3E']) {
		await page.goto(`/moje-prijave?${query}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Moje prijave' })).toBeVisible();
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByText('Še iščete?')).toHaveCount(0);
	}
	expect(sent).toEqual([]);
});

test('"Pusti odprto" in the close dialog from the report returns focus to the opener', async ({ page }) => {
	await page.goto('/r/Mine1234');
	await (await hydrated(page.getByRole('button', { name: 'Več možnosti' }))).click();
	await page.getByRole('menuitem', { name: 'Zaključi iskanje' }).click();
	const dialog = page.getByRole('dialog', { name: 'Zaključite iskanje?' });
	await dialog.getByRole('button', { name: 'Pusti odprto' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('button', { name: 'Več možnosti' })).toBeFocused();
});

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-8.2 AC#2, AC#3: the UI kit gallery in SL and EN, light and dark, with axe, 44 px targets and token focus rings.
const pages = [
	{ path: '/dev/kit', lang: 'sl', menu: 'Kaj želite prijaviti?', close: 'Zapri', remove: 'Izbriši profil' },
	{
		path: '/en/dev/kit',
		lang: 'en',
		menu: 'What would you like to report?',
		close: 'Close',
		remove: 'Delete profile',
	},
];

// `scope` limits the pass to an overlay: the rest of the page is inert or aria-hidden while it is open, and a
// whole-page scan of the long gallery is what made this spec slow.
async function expectNoAxeViolations(page: Page, scope?: string) {
	// Let enter fades finish (dialogs, sheet, toast), so contrast is measured on the settled colours. The skeleton
	// shimmer and spinners are CSS animations, not transitions, and keep running.
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every((animation) => !(animation instanceof CSSTransition) || animation.playState === 'finished')
	);
	const builder = new AxeBuilder({ page });
	const { violations } = await (scope ? builder.include(scope) : builder).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

for (const { path, lang, menu, close, remove } of pages) {
	for (const colorScheme of ['light', 'dark'] as const) {
		test(`${path} in ${colorScheme} has no axe violations, closed and with each overlay open`, async ({ page }) => {
			test.setTimeout(90_000); // guard only; the scoped passes keep it well under
			const errors: string[] = [];
			page.on('console', (message) => {
				if (message.type() === 'error') errors.push(message.text());
			});
			await page.emulateMedia({ colorScheme });
			await page.goto(path);
			await expect(page.locator('html')).toHaveAttribute('lang', lang);
			await expect(page.locator('html')).toHaveClass(colorScheme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/);
			await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
			await expectNoAxeViolations(page);

			// Dialog and sheet: the Report menu; both trap focus and close with Escape.
			for (const index of [0, 1]) {
				const trigger = page.getByRole('button', { name: menu }).nth(index);
				await trigger.click();
				const dialog = page.getByRole('dialog', { name: menu });
				await expect(dialog).toBeVisible();
				await expect(dialog.getByRole('button', { name: close })).toBeVisible();
				await expectNoAxeViolations(page, '[role=dialog]');
				await page.keyboard.press('Escape');
				await expect(dialog).toBeHidden();
				await expect(trigger).toBeFocused();
			}

			// Alert dialog: focus starts on the safe action.
			await page.getByRole('button', { name: remove }).last().click();
			const alert = page.getByRole('alertdialog');
			await expect(alert).toBeVisible();
			await expect(alert.getByRole('button', { name: lang === 'sl' ? 'Prekliči' : 'Cancel' })).toBeFocused();
			await expectNoAxeViolations(page, '[role=alertdialog]');
			await page.keyboard.press('Escape');

			// Toast: announced in the polite region, dismissible.
			const copy = page.getByRole('button', { name: lang === 'sl' ? 'Kopiraj povezavo' : 'Copy link' });
			const toast = page
				.locator('section[aria-live=polite]')
				.getByText(lang === 'sl' ? 'Povezava je kopirana.' : 'Link copied.');
			await copy.click();
			await expect(toast).toBeVisible();
			// Keyboard dismissal (the toast moves while it stacks, so a pointer click is flaky here).
			await page.locator('[data-sonner-toast]').getByRole('button', { name: close }).focus();
			await page.keyboard.press('Enter');
			await expect(toast).toBeHidden();
			// axe can take longer than the 5 s the toast stays, so it checks a fresh one.
			await copy.click();
			await expect(toast).toBeVisible();
			await expectNoAxeViolations(page, 'section[aria-live=polite]');

			expect(errors).toEqual([]);
		});
	}
}

test('every interactive target in the gallery is at least 44 px', async ({ page }) => {
	await page.goto('/dev/kit');
	const small = await page.evaluate(() => {
		const selector = 'a, button, input, textarea, [role=checkbox], [role=radio], [role=switch], [role=tab]';
		return (
			[...document.querySelectorAll<HTMLElement>(selector)]
				// Radix's hidden form inputs (aria-hidden, no pointer events) are not targets.
				.filter((element) => element.checkVisibility() && !element.closest('.sr-only, [aria-hidden=true]'))
				.map((element) => {
					// A checkbox, radio or switch is targeted through its whole label row (system §10.3).
					const { width, height } = (element.closest('label') ?? element).getBoundingClientRect();
					return { name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width, height };
				})
				.filter(({ width, height }) => width < 44 || height < 44)
		);
	});

	expect(small).toEqual([]);
});

test('focus rings follow the ring token: 3 px, 2 px offset', async ({ page }) => {
	await page.goto('/en/dev/kit');
	await page.keyboard.press('Tab');
	const ring = await page.evaluate(() => {
		const probe = document.createElement('span');
		probe.style.color = 'hsl(var(--ring))';
		document.body.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	});
	const controls = [
		page.getByRole('button', { name: 'Report a lost pet' }).first(),
		page.getByRole('button', { name: 'Close' }).first(),
		page.getByRole('link', { name: 'SL' }),
		page.getByRole('radio', { name: /^Lost pet/ }).first(),
		page.getByRole('switch', { name: 'Nearby alerts' }).first(),
		page.getByRole('checkbox', { name: 'Also block this person' }),
		page.getByRole('tab', { name: 'Notifications' }).first(),
	];

	for (const control of controls) {
		await control.focus();
		const outline = await control.evaluate((element) => {
			const style = getComputedStyle(element);
			return [style.outlineStyle, style.outlineWidth, style.outlineOffset, style.outlineColor];
		});
		expect(outline).toEqual(['solid', '3px', '2px', ring]);
	}
});

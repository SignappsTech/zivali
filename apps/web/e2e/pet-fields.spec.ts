import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-16.4 AC#3: the shared PetFields section on /dev/pet-fields in a real browser, with axe in each state.
async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

test('SL: no axe violations empty, with errors, with the breed list open and with the chip warning', async ({
	page,
}) => {
	await page.goto('/dev/pet-fields');
	await expect(page.getByRole('heading', { level: 2, name: 'Osnovno' })).toBeVisible();
	await expectNoAxeViolations(page);

	// Required fields: errors under the fields, focus on the first one, nothing saved.
	await page.getByRole('button', { name: 'Shrani' }).click();
	await expect(page.getByText('Izberite, ali je pes ali mačka.')).toBeVisible();
	await expect(page.getByText('Vpišite ime.')).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Pes' })).toBeFocused();
	await expect(page.getByTestId('saved')).toHaveCount(0);
	await expectNoAxeViolations(page);

	await page.getByRole('radio', { name: 'Mačka' }).click();
	await page.getByRole('textbox', { name: 'Ime' }).fill('Luna');
	const breed = page.getByRole('combobox', { name: 'Pasma' });
	await breed.fill('evrop');
	await expect(page.getByRole('option', { name: 'Evropska kratkodlaka' })).toBeVisible();
	await expectNoAxeViolations(page);
	await breed.press('Enter');
	await expect(breed).toHaveValue('Evropska kratkodlaka');

	// Grouped as typed; a short number warns once the field is left, and the save still goes through.
	const chip = page.getByRole('textbox', { name: 'Številka čipa' });
	await chip.pressSequentially('7051234');
	await expect(chip).toHaveValue('705 1234');
	await chip.blur();
	await expect(page.getByText('Številka čipa je običajno dolga 15 števk.', { exact: false })).toBeVisible();
	await expect(page.getByRole('radiogroup', { name: 'Kje živi?' })).toBeVisible();
	await expectNoAxeViolations(page);

	await page.getByRole('button', { name: 'Shrani' }).click();
	const saved = page.getByTestId('saved');
	await expect(saved).toContainText('"species": "cat"');
	await expect(saved).toContainText('"chip": "705 1234"');
	await expect(saved).toContainText('"cat.european_shorthair"');
});

test.describe('dark', () => {
	test.use({ colorScheme: 'dark' });

	test('EN: no axe violations with errors and the dog fields', async ({ page }) => {
		await page.goto('/en/dev/pet-fields');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByText('Choose dog or cat.')).toBeVisible();
		await page.getByRole('radio', { name: 'Dog' }).click();
		await page.getByRole('radio', { name: 'Very large' }).click();
		await page.getByRole('button', { name: 'Black' }).click();
		await expect(page.getByText('Very small up to 5 kg', { exact: false })).toBeVisible();
		await expectNoAxeViolations(page);
	});
});

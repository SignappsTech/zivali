import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

import { match } from '@zivali/api/__fixtures__/matches';
import { me } from '@zivali/api/__fixtures__/me';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import type { MatchSuggestion, ReportOwnerView } from '@zivali/types';

import { api, dismissConsent, signInAs } from './session';

// TASK-20.3: P11 match review on web (/r/[code]/ujemanja, FR-008): compare, confirm (the inbox until the web
// conversation page, TASK-21.3), reject with an optional reason, and the non-manager refusal. The browser's API calls
// are answered here (C8 matches, C4 report, C6 reverse lookup, C3 me); the session is signed by the e2e mock
// (e2e/session.ts) and the photos come from its /media.

const CODE = 'Luna1234';
const SISKA = {
	label: 'Šiška, Ljubljana',
	lat: 46.0739,
	lng: 14.4851,
	kind: 'district',
	municipality_slug: 'ljubljana',
};

const photo = (name: string, alt: string) => ({
	url: `${api()}/media/${name}.png`,
	thumb_url: `${api()}/media/${name}.png`,
	alt,
	width: 800,
	height: 600,
});
const luna = (): ReportOwnerView => ({
	...ownerReport,
	short_code: CODE,
	type: 'lost',
	name: 'Luna',
	manager_role: 'owner',
	sex: 'female',
	photos: [photo('luna', 'Pogrešana psička Luna')],
});
const chip = (): MatchSuggestion => ({
	...match,
	id: 'b2d4e2f6-3b5c-4d7e-9f1a-2b3c4d5e6f01',
	score: 1,
	strength: 'strong',
	chip_match: true,
	reasons: [{ code: 'chip' }, { code: 'distance', band: 'lt1' }, { code: 'time', hours_band: 'lt24' }],
	other: { ...match.other, sex: 'female', photos: [photo('found', 'Najden pes, zlate barve')] },
});
const sighted = (): MatchSuggestion => ({
	...match,
	other: { ...match.other, short_code: 'Seen0001', type: 'sighted', photos: [photo('seen', 'Opažen pes')] },
});

/** Signs in and answers the endpoints; returns the reject bodies and the confirmed ids the page sent. */
async function signIn(page: Page, baseURL: string, { forbidden = false } = {}) {
	let items = [sighted(), chip()];
	const rejected: unknown[] = [];
	const confirmed: string[] = [];
	const answer = (url: RegExp, handler: (route: Route) => Promise<void>) =>
		page.route(url, (route) => (route.request().method() === 'OPTIONS' ? route.continue() : handler(route)));
	await signInAs(page, { id: me.id, role: 'USER', aal: 'aal1' }, baseURL);
	await dismissConsent(page);
	await answer(/\/v1\/me$/, (route) => route.fulfill({ json: me }));
	await answer(/\/v1\/notifications(\?.*)?$/, (route) =>
		route.fulfill({ json: { items: [], next_cursor: null, unread: 0 } })
	);
	await answer(/\/v1\/geo\/reverse$/, (route) => route.fulfill({ json: { place: SISKA } }));
	await answer(new RegExp(`/v1/reports/${CODE}$`), (route) => route.fulfill({ json: luna() }));
	await answer(new RegExp(`/v1/reports/${CODE}/matches(\\?.*)?$`), (route) =>
		forbidden
			? route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', message: 'FORBIDDEN' } } })
			: route.fulfill({ json: { items } })
	);
	await answer(/\/v1\/matches\/[^/]+\/reject$/, (route) => {
		const id = route.request().url().split('/').at(-2);
		rejected.push(route.request().postDataJSON());
		items = items.filter((m) => m.id !== id);
		return route.fulfill({ status: 204 });
	});
	await answer(/\/v1\/matches\/[^/]+\/confirm$/, (route) => {
		confirmed.push(route.request().url().split('/').at(-2)!);
		return route.fulfill({ json: { conversation_id: 'c0e1d2f3-4a5b-4c6d-8e7f-9a0b1c2d3e00' } });
	});
	return { rejected, confirmed };
}

async function expectNoAxeViolations(page: Page) {
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every((animation) => !(animation instanceof CSSTransition) || animation.playState === 'finished')
	);
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

test('desktop: the list beside the first match, chip match first, no ads, no axe violations', async ({
	page,
	baseURL,
}) => {
	await signIn(page, baseURL!);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(`/r/${CODE}/ujemanja`);

	await expect(page).toHaveTitle('Možna ujemanja · Najdimo');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Možna ujemanja');
	await expect(page.getByText('2 možni ujemanji')).toBeVisible();
	const rows = page.locator('a[href*="?m="]');
	await expect(rows.first()).toContainText('Številka čipa se ujema');
	await expect(rows.first()).toHaveAttribute('aria-current', 'true');
	await expect(rows.first().getByRole('img', { name: 'Moč ujemanja: Zelo verjetno' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Ujemanje' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Vaša žival: Pogrešana psička Luna' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Prijavljena žival: Najden pes, zlate barve' })).toBeVisible();
	await expect(page.getByText('Najdena žival ima enako številko čipa kot vaša.', { exact: false })).toBeVisible();
	await expect(page.getByRole('table', { name: 'Primerjava podatkov' })).toBeVisible();
	await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
	await expectNoAxeViolations(page);

	// The other row opens its match in place, with the sighting caveat.
	await rows.nth(1).click();
	await expect(page).toHaveURL(/\?m=/);
	await expect(page.getByRole('heading', { level: 2, name: 'Ujemanje' })).toBeFocused();
	await expect(page.getByText('Žival je bila le opažena, zato je morda že drugje.')).toBeVisible();
});

test('mobile 390 dark: list first, a picked match on its own with the way back, no horizontal scroll', async ({
	page,
	baseURL,
}) => {
	await signIn(page, baseURL!);
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`/en/r/${CODE}/matches`);

	const main = page.getByRole('main');
	await expect(main.getByRole('heading', { level: 1 })).toHaveText('Possible matches');
	await expect(main.getByRole('heading', { level: 2 })).toHaveCount(0);
	await expectNoAxeViolations(page);

	await page.locator('a[href*="?m="]').first().click();
	await expect(page.getByRole('heading', { level: 2, name: 'Match' })).toBeFocused();
	await expect(page.getByRole('tab', { name: 'Found animal' })).toHaveAttribute('aria-selected', 'true');
	await page.getByRole('tab', { name: 'My pet' }).click();
	await expect(page.getByRole('img', { name: 'Your pet: Pogrešana psička Luna' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await expectNoAxeViolations(page);

	await main.getByRole('link', { name: 'Back' }).click();
	await expect(main.getByRole('heading', { level: 2 })).toHaveCount(0);
	await expect(page.locator('a[href*="?m="]').first()).toBeVisible();
});

test('reject by keyboard: one confirmation, the optional reason, and the match is gone for good', async ({
	page,
	baseURL,
}) => {
	const { rejected } = await signIn(page, baseURL!);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(`/r/${CODE}/ujemanja`);

	const reject = page.getByRole('button', { name: 'Ni moja žival' });
	await reject.focus();
	await page.keyboard.press('Enter');
	const dialog = page.getByRole('alertdialog', { name: 'Skrijete to ujemanje?' });
	await expect(dialog.getByRole('button', { name: 'Prekliči' })).toBeFocused();
	await expectNoAxeViolations(page);
	await dialog.getByRole('textbox', { name: 'Razlog (neobvezno)' }).fill('Druga ovratnica');
	await dialog.getByRole('button', { name: 'Skrij za vedno' }).press('Enter');

	await expect(page.getByText('Ujemanje je skrito.')).toBeVisible();
	expect(rejected).toEqual([{ reason: 'Druga ovratnica' }]);
	await expect(page.getByText('1 možno ujemanje')).toBeVisible();
	await expect(page.locator('a[href*="?m="]')).toHaveCount(1);
	await expect(page.locator('a[href*="?m="]').first()).not.toContainText('Številka čipa se ujema');
});

test('confirm opens the conversation in the inbox', async ({ page, baseURL }) => {
	const { confirmed } = await signIn(page, baseURL!);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(`/r/${CODE}/ujemanja`);

	await expect(page.getByText('Ko potrdite, se odpre pogovor. Telefonske številke ostanejo skrite.')).toBeVisible();
	await page.getByRole('button', { name: 'To je moja žival' }).click();
	await expect(page).toHaveURL(/\/nabiralnik$/);
	expect(confirmed).toEqual([chip().id]);
});

test('a non-manager is refused with a way back to the report, not a retry', async ({ page, baseURL }) => {
	await signIn(page, baseURL!, { forbidden: true });
	await page.goto(`/r/${CODE}/ujemanja`);

	const main = page.getByRole('main');
	await expect(main.getByRole('alert')).toHaveText(
		'Za to nimate dovoljenja. Če mislite, da je to napaka, se vpišite z drugim računom.'
	);
	await expect(main.getByRole('link', { name: 'Nazaj' })).toHaveAttribute('href', `/r/${CODE}`);
	await expect(main.getByRole('button', { name: 'Poskusi znova' })).toHaveCount(0);
	await expectNoAxeViolations(page);
});

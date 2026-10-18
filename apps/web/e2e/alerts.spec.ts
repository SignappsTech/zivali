import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import { prefs } from '@zivali/api/__fixtures__/notifications';
import type { AlertSubscription, AlertSubscriptionInput, Me } from '@zivali/types';

import { signInAs } from './session';

// TASK-23.2: P13 nearby-alert settings on web (/racun/opozorila, FR-010): opt-in, pause, and the confirm-email gate.
// The API is answered here (C10 alert subscription, C3 me, C6 reverse lookup) and the session is signed by the e2e
// mock (e2e/session.ts).

const SISKA = {
	label: 'Šiška, Ljubljana',
	lat: 46.0739,
	lng: 14.4851,
	kind: 'district',
	municipality_slug: 'ljubljana',
};

/** Signs in as `profile` and answers the endpoints; returns the subscription bodies the page sent. */
async function signIn(page: Page, baseURL: string, profile: Me = me) {
	const sent: (AlertSubscriptionInput | 'DELETE')[] = [];
	// What the API stores, so the refetch after each change answers the new values.
	let stored: AlertSubscription | null = null;
	await signInAs(page, { id: profile.id, role: 'USER', aal: 'aal1' }, baseURL);
	await page.route(/\/v1\/me$/, (route) =>
		route.request().method() === 'OPTIONS' ? route.continue() : route.fulfill({ json: profile })
	);
	await page.route(/\/v1\/notifications(\?.*)?$/, (route) =>
		route.request().method() === 'OPTIONS'
			? route.continue()
			: route.fulfill({ json: { items: [], next_cursor: null, unread: 0 } })
	);
	await page.route(/\/v1\/notification-prefs$/, (route) =>
		route.request().method() === 'OPTIONS' ? route.continue() : route.fulfill({ json: prefs })
	);
	await page.route(/\/v1\/geo\/reverse$/, (route) =>
		route.request().method() === 'OPTIONS' ? route.continue() : route.fulfill({ json: { place: SISKA } })
	);
	await page.route(/\/v1\/alert-subscription$/, (route) => {
		const method = route.request().method();
		if (method === 'OPTIONS') return route.continue();
		if (method === 'DELETE') {
			sent.push('DELETE');
			stored = null;
			return route.fulfill({ status: 204 });
		}
		if (method === 'PUT') {
			const body = route.request().postDataJSON() as AlertSubscriptionInput;
			sent.push(body);
			const now = new Date().toISOString();
			stored = { ...body, daily_cap: 5, created_at: stored?.created_at ?? now, updated_at: now };
		}
		return route.fulfill({ json: stored });
	});
	return sent;
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

for (const [width, colorScheme] of [
	[1440, 'light'],
	[390, 'dark'],
] as const)
	test(`alert settings at ${width} in ${colorScheme}: opt in, pause, off; no ads, no axe violations`, async ({
		page,
		baseURL,
	}) => {
		const sent = await signIn(page, baseURL!);
		await page.emulateMedia({ colorScheme });
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/racun/opozorila');

		await expect(page).toHaveTitle('Opozorila v bližini · Najdimo');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Opozorila v bližini');
		const master = page.getByRole('switch', { name: 'Opozorila o izgubljenih živalih v bližini' });
		await expect(master).not.toBeChecked();
		// "Kako vas obvestimo" is a closed section at the end (TASK-114.15): its summary under the title, Enter opens it.
		const channels = page.getByRole('button', { name: 'Kako vas obvestimo' });
		await expect(channels).toHaveAttribute('aria-expanded', 'false');
		await expect(page.getByText('Na telefonu in po e-pošti · Tihi čas 22:00 do 07:00')).toBeVisible();
		await expect(page.getByRole('switch', { name: 'Sporočila: Po e-pošti' })).toBeHidden();
		await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
		await expectNoAxeViolations(page);
		await channels.press('Enter');
		await expect(channels).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('switch', { name: 'Sporočila: Po e-pošti' })).toBeVisible();
		await expectNoAxeViolations(page);
		await channels.press('Space');
		await expect(channels).toHaveAttribute('aria-expanded', 'false');

		// Opt in: the profile's home area, 5 km, dogs and cats.
		await master.click();
		await expect(master).toBeChecked();
		await expect(page.getByText('Shranjeno.')).toBeVisible();
		await expect(page.getByText('Šiška, Ljubljana, 5 km')).toBeVisible();
		expect(sent).toEqual([{ center: me.home, radius_km: 5, species: ['dog', 'cat'], paused: false }]);
		await expect(page.getByRole('slider', { name: 'Polmer' })).toHaveAttribute('aria-valuetext', '5 km');
		await expect(page.getByRole('button', { name: 'Psi' })).toHaveAttribute('aria-pressed', 'true');
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
		await expectNoAxeViolations(page);

		// Pause keeps the settings.
		const pause = page.getByRole('switch', { name: 'Začasno ustavi opozorila' });
		await pause.click();
		await expect(pause).toBeChecked();
		await expect.poll(() => sent.at(-1)).toEqual({ ...(sent[0] as object), paused: true });
		await expect(master).toBeChecked();

		// The radius saves where it is let go (one arrow step: 7 km).
		await page.getByRole('slider', { name: 'Polmer' }).press('ArrowRight');
		await expect.poll(() => sent.at(-1)).toEqual({ ...(sent[0] as object), paused: true, radius_km: 7 });

		// Every animal can be switched off (TASK-114.14): none chosen means no alerts, said plainly.
		await page.getByRole('button', { name: 'Psi' }).click();
		await expect.poll(() => sent.at(-1)).toMatchObject({ species: ['cat'] });
		await page.getByRole('button', { name: 'Mačke' }).click();
		await expect.poll(() => sent.at(-1)).toMatchObject({ species: [] });
		await expect(page.getByText('Ne prejemate opozoril za živali v bližini.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Mačke' })).toBeEnabled();

		await master.click();
		await expect(master).not.toBeChecked();
		await expect.poll(() => sent.at(-1)).toBe('DELETE');
		await expect(pause).toHaveCount(0);
	});

test('an unconfirmed email gets "Potrdite svoj e-naslov" on opt-in and nothing is saved', async ({ page, baseURL }) => {
	const sent = await signIn(page, baseURL!, { ...me, email_verified: false });
	await page.goto('/en/account/alerts');

	await expect(page).toHaveTitle('Nearby alerts · Najdimo');
	await page.getByRole('switch', { name: 'Alerts about lost pets nearby' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('heading', { name: 'Confirm your email address' })).toBeVisible();
	await expectNoAxeViolations(page);
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(page.getByRole('switch', { name: 'Alerts about lost pets nearby' })).not.toBeChecked();
	expect(sent).toEqual([]);
});

// TASK-23.4: the radius never leaves 1-25 km, whatever is typed in the number field (keyboard only).
test('a typed radius is snapped into 1-25 km before it is saved; an empty field saves nothing', async ({
	page,
	baseURL,
}) => {
	const sent = await signIn(page, baseURL!);
	await page.goto('/racun/opozorila');
	await page.getByRole('switch', { name: 'Opozorila o izgubljenih živalih v bližini' }).press('Space');
	await expect.poll(() => sent.length).toBe(1);

	const km = page.getByRole('spinbutton', { name: 'Polmer v kilometrih' });
	await km.fill('99');
	await km.press('Enter');
	await expect.poll(() => (sent.at(-1) as AlertSubscriptionInput).radius_km).toBe(25);
	await expect(page.getByRole('slider', { name: 'Polmer' })).toHaveAttribute('aria-valuetext', '25 km');

	await km.fill('0');
	await km.press('Enter');
	await expect.poll(() => (sent.at(-1) as AlertSubscriptionInput).radius_km).toBe(1);

	const saved = sent.length;
	await km.fill('');
	await km.press('Enter');
	await expect(page.getByRole('slider', { name: 'Polmer' })).toHaveAttribute('aria-valuetext', '1 km');
	expect(sent).toHaveLength(saved);
	for (const body of sent) expect((body as AlertSubscriptionInput).radius_km).toBeLessThanOrEqual(25);
});

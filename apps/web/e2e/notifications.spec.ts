import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { conversations } from '@zivali/api/__fixtures__/chat';
import { me } from '@zivali/api/__fixtures__/me';
import { prefs } from '@zivali/api/__fixtures__/notifications';
import type { Notification, NotificationType } from '@zivali/types';

import { signInAs } from './session';

// TASK-22.4: P13 notifications view in the inbox, the header's unread state and the notification settings (FR-010).
// The API is answered here from the @zivali/api fixtures and the session is signed by the e2e mock (e2e/session.ts).

const now = new Date('2026-10-15T14:20:00+02:00');
const items: Notification[] = [
	{
		id: '5e1d0a2b-0000-4000-8000-000000000001',
		type: 'match_chip',
		payload: { lost_code: 'Pq7xK2mN', other_type: 'found', has_name: 'yes', pet_name: 'Luna', species: 'dog' },
		read_at: null,
		created_at: '2026-10-15T13:52:00+02:00',
	},
	{
		id: '5e1d0a2b-0000-4000-8000-000000000002',
		type: 'report_reminder',
		payload: { report_code: 'Rm7xK2mN', day: 7, has_name: 'yes', pet_name: 'Luna', species: 'dog' },
		read_at: null,
		created_at: '2026-10-13T08:00:00+02:00',
	},
	{
		id: '5e1d0a2b-0000-4000-8000-000000000003',
		type: 'payment_receipt',
		payload: { amount_cents: 300, purpose: 'tip', is_test: false },
		read_at: '2026-10-03T09:00:00+02:00',
		created_at: '2026-10-03T08:00:00+02:00',
	},
];

/** Signs in and answers the C10 endpoints and the conversation list (all read); returns the bodies the page sent. */
async function signIn(page: Page, baseURL: string) {
	const sent = { read: [] as unknown[], prefs: [] as [string, unknown][], me: [] as unknown[] };
	let readIds = new Set<string>(items.filter((item) => item.read_at).map((item) => item.id));
	// What the API stores, so the refetch after each change answers the new values.
	const stored = structuredClone(prefs);
	await signInAs(page, { id: me.id, role: 'USER', aal: 'aal1' }, baseURL);
	await page.clock.setFixedTime(now);
	await page.route(/\/v1\/me$/, (route) => {
		if (route.request().method() === 'PATCH') {
			const body = route.request().postDataJSON();
			sent.me.push(body);
			Object.assign(stored, body);
		}
		return route.fulfill({ json: { ...me, quiet_from: stored.quiet_from, quiet_to: stored.quiet_to } });
	});
	await page.route(/\/v1\/notifications(\?.*)?$/, (route) => {
		const list = items.map((item) => ({ ...item, read_at: readIds.has(item.id) ? now.toISOString() : null }));
		route.fulfill({
			json: { items: list, next_cursor: null, unread: list.filter((item) => !item.read_at).length },
		});
	});
	await page.route(/\/v1\/conversations(\?.*)?$/, (route) =>
		route.fulfill({
			json: { ...conversations, items: conversations.items.map((item) => ({ ...item, unread: 0 })) },
		})
	);
	await page.route(/\/v1\/notifications\/read$/, (route) => {
		const body = route.request().postDataJSON();
		sent.read.push(body);
		readIds = 'all' in body ? new Set(items.map((item) => item.id)) : new Set([...readIds, ...body.ids]);
		route.fulfill({ status: 204 });
	});
	await page.route(/\/v1\/notification-prefs(\/[a-z_]+)?$/, (route) => {
		const type = new URL(route.request().url()).pathname.split('/')[3] as NotificationType | undefined;
		if (!type) return route.fulfill({ json: stored });
		const body = route.request().postDataJSON();
		sent.prefs.push([type, body]);
		let pref = stored.items.find((item) => item.type === type);
		if (!pref) stored.items.push((pref = { type, in_app: true, push: true, email: true }));
		Object.assign(pref, body);
		return route.fulfill({ json: pref });
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
	test(`notifications view at ${width} in ${colorScheme}: groups, unread, mark as read, no ads, no axe violations`, async ({
		page,
		baseURL,
	}) => {
		const sent = await signIn(page, baseURL!);
		await page.emulateMedia({ colorScheme });
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/nabiralnik?view=notifications');

		await expect(page).toHaveTitle('Obvestila · Najdimo');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		await expect(page.getByRole('tab', { name: 'Obvestila' })).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Obvestila');
		await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
			'Danes',
			'Ta teden',
			'Prej',
		]);
		const chip = page.getByRole('link', { name: /Številka čipa se ujema · Luna, neprebrano/ });
		await expect(chip).toHaveAttribute('href', '/r/Pq7xK2mN/ujemanja');
		await expect(page.getByRole('link', { name: 'Nadaljuj iskanje' })).toHaveAttribute(
			'href',
			'/moje-prijave?r=Rm7xK2mN&action=keep'
		);
		// The header's inbox link carries the unread state (lg and up; below lg it is in the menu sheet).
		if (width >= 1024)
			await expect(
				page.getByRole('banner').getByRole('link', { name: 'Sporočila in obvestila, neprebrano' })
			).toBeVisible();
		await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
		await expectNoAxeViolations(page);

		await page.getByRole('button', { name: 'Označi vse kot prebrano' }).click();
		await expect(page.getByRole('button', { name: 'Označi vse kot prebrano' })).toHaveCount(0);
		expect(sent.read).toEqual([{ all: true }]);
		await expect(page.getByRole('link', { name: /neprebrano/ })).toHaveCount(0);
		await expectNoAxeViolations(page);
	});

test('opening an unread row marks it read; the view switch keeps ?view= in the URL', async ({ page, baseURL }) => {
	const sent = await signIn(page, baseURL!);
	await page.goto('/en/inbox?view=conversations');

	await expect(page).toHaveTitle('Messages and notifications · Najdimo');
	await page.getByRole('tab', { name: 'Notifications' }).click();
	await expect(page).toHaveURL(/\/en\/inbox\?view=notifications$/);
	// Caught as it happens: My reports then runs the action and drops the query (TASK-26.4).
	await Promise.all([
		page.waitForURL(/\/en\/my-reports\?r=Rm7xK2mN&action=keep$/),
		page.getByRole('link', { name: /Still looking for your pet\?, unread/ }).click(),
	]);
	await expect.poll(() => sent.read).toEqual([{ ids: [items[1]!.id] }]);
});

for (const colorScheme of ['light', 'dark'] as const)
	test(`notification settings in ${colorScheme}: channel switches and quiet hours save, no axe violations`, async ({
		page,
		baseURL,
	}) => {
		const sent = await signIn(page, baseURL!);
		await page.route(/\/v1\/alert-subscription$/, (route) => route.fulfill({ json: null }));
		await page.emulateMedia({ colorScheme });
		// The old URL (and the emails' "manage notifications" link) lands on the open section of the alerts page.
		await page.goto('/racun/obvestila');
		await expect(page).toHaveURL(/\/racun\/opozorila#kako-vas-obvestimo$/);

		await expect(page).toHaveTitle('Opozorila v bližini · Najdimo');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Opozorila v bližini');
		await expect(page.getByRole('button', { name: 'Kako vas obvestimo' })).toHaveAttribute('aria-expanded', 'true');
		const section = page.getByRole('region', { name: 'Kako vas obvestimo' });
		await expect(section.getByRole('switch')).toHaveCount(12);
		// No lock (TASK-114.14): in app turns off for matches and messages too, with no note.
		await expect(page.getByRole('switch', { name: 'Možna ujemanja: V aplikaciji' })).toBeEnabled();
		await expect(page.getByRole('switch', { name: 'Sporočila: V aplikaciji' })).toBeEnabled();
		await expect(page.getByText(/ni mogoče izklopiti/)).toHaveCount(0);
		await expect(page.getByRole('switch', { name: 'Opozorila v bližini: Po e-pošti' })).not.toBeChecked();
		await expect(page.getByLabel('Od', { exact: true })).toHaveValue('22:00');
		await expectNoAxeViolations(page);

		const reminders = page.getByRole('switch', { name: 'Opomniki: Po e-pošti' });
		await reminders.click();
		await expect(reminders).not.toBeChecked();
		await expect(page.getByText('Shranjeno.')).toBeVisible();
		expect(sent.prefs).toEqual([
			['report_reminder', { email: false }],
			['report_expiring', { email: false }],
			['report_closed', { email: false }],
		]);

		await page.getByLabel('Od', { exact: true }).fill('23:30');
		await page.getByLabel('Do', { exact: true }).focus();
		await expect.poll(() => sent.me).toEqual([{ quiet_from: '23:30', quiet_to: '07:00' }]);
		await page.getByRole('button', { name: 'Brez tihega časa' }).click();
		await expect.poll(() => sent.me.at(-1)).toEqual({ quiet_from: null, quiet_to: null });
		await expectNoAxeViolations(page);
	});

test('/en/account/notifications goes to the open section of /en/account/alerts', async ({ page, baseURL }) => {
	await signIn(page, baseURL!);
	await page.route(/\/v1\/alert-subscription$/, (route) => route.fulfill({ json: null }));
	await page.goto('/en/account/notifications');
	await expect(page).toHaveURL(/\/en\/account\/alerts#kako-vas-obvestimo$/);
	await expect(page.getByRole('button', { name: 'How we tell you' })).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('switch', { name: 'Messages: By email' })).toBeVisible();
});

// TASK-114.10: the tabs show where the unread items are, and /nabiralnik without ?view= opens there (Pogovori first).
test('without ?view= the inbox opens where the unread items are; tabs and header show them', async ({
	page,
	baseURL,
}) => {
	await signIn(page, baseURL!);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/nabiralnik');
	const tabs = page.getByRole('tablist', { name: 'Sporočila' });
	await expect(tabs.getByRole('tab', { name: 'Obvestila, neprebrano' })).toHaveAttribute('aria-selected', 'true');
	await expect(tabs.getByRole('tab', { name: 'Pogovori', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Obvestila');
	await expect(page).toHaveURL(/\/nabiralnik$/);
	await expectNoAxeViolations(page);

	// An unread conversation comes first, and lights the header's dot on its own (the last route registered wins).
	await page.route(/\/v1\/conversations(\?.*)?$/, (route) => route.fulfill({ json: conversations }));
	await page.route(/\/v1\/notifications(\?.*)?$/, (route) =>
		route.fulfill({ json: { items: [], next_cursor: null, unread: 0 } })
	);
	await page.reload();
	await expect(tabs.getByRole('tab', { name: 'Pogovori, neprebrano' })).toHaveAttribute('aria-selected', 'true');
	await expect(tabs.getByRole('tab', { name: 'Obvestila', exact: true })).toBeVisible();
	await expect(
		page.getByRole('banner').getByRole('link', { name: 'Sporočila in obvestila, neprebrano' })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

// TASK-22.6 (QA): empty and error states of the notifications view (TASK-22.4 AC3), keyboard-reachable retry.
test('empty inbox shows the empty state with a link to the alert settings', async ({ page, baseURL }) => {
	await signIn(page, baseURL!);
	await page.route(/\/v1\/notifications(\?.*)?$/, (route) =>
		route.fulfill({ json: { items: [], next_cursor: null, unread: 0 } })
	);
	await page.goto('/nabiralnik?view=notifications');

	await expect(page.getByText('Obvestil še ni')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Nastavi opozorila' })).toHaveAttribute('href', '/racun/opozorila');
	await expect(page.getByRole('button', { name: 'Označi vse kot prebrano' })).toHaveCount(0);
	await expectNoAxeViolations(page);
});

test('a failed load shows an inline error and Try again reloads the list', async ({ page, baseURL }) => {
	await signIn(page, baseURL!);
	let fail = true;
	await page.route(/\/v1\/notifications(\?.*)?$/, (route) =>
		fail
			? route.fulfill({ status: 500, json: { error: { code: 'INTERNAL', message: 'x' } } })
			: route.fulfill({ json: { items, next_cursor: null, unread: 2 } })
	);
	await page.goto('/en/inbox?view=notifications');

	const retry = page.getByRole('button', { name: 'Try again' });
	await expect(retry).toBeVisible();
	await retry.focus();
	fail = false;
	await page.keyboard.press('Enter');
	await expect(page.getByRole('link', { name: /unread/ }).first()).toBeVisible();
});

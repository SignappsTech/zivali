import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { CONSENT_VERSION } from '@zivali/analytics';

import { expectNoAnalyticsBeforeConsent } from '../../../tests/quality/guards.mjs';

test.use({ storageState: { cookies: [], origins: [] } }); // no stored choice: the banner is under test

// TASK-13.4 QA (story TASK-13, P17): the acceptance criteria end to end against the ga4 build (playwright.config.ts).
// Every request off localhost is answered here, so nothing leaves the machine and each one is seen.

// Every public page, SL and EN (the content, legal, auth, manage and shelter pages, and a 404).
const PUBLIC = [
	'/',
	'/en',
	'/kako-deluje',
	'/en/how-it-works',
	'/varnost',
	'/en/safety',
	'/pogosta-vprasanja',
	'/en/faq',
	'/za-zavetisca',
	'/en/for-shelters',
	'/o-nas',
	'/en/about',
	'/zavetisca',
	'/en/shelters',
	'/zavetisca/zavetisce-ljubljana',
	'/en/shelters/zavetisce-ljubljana',
	'/zasebnost',
	'/en/privacy',
	'/piskotki',
	'/en/cookies',
	'/pogoji-uporabe',
	'/en/terms',
	'/podatki-o-podjetju',
	'/en/company-information',
	'/dostopnost',
	'/en/accessibility',
	'/vpis',
	'/en/sign-in',
	'/registracija',
	'/en/sign-up',
	'/pozabljeno-geslo',
	'/en/reset-password',
	'/m',
	'/en/m',
	'/ni-te-strani',
];

// The consent copy (packages/i18n/messages/*/consent.json, footer.json).
const COPY = {
	sl: {
		dialog: 'Izbira piškotkov',
		title: 'Piškotki in vaša zasebnost',
		buttons: ['Zavrni vse', 'Sprejmi vse', 'Prilagodi'],
		settings: 'Nastavitve piškotkov',
	},
	en: {
		dialog: 'Cookie choice',
		title: 'Cookies and your privacy',
		buttons: ['Reject all', 'Accept all', 'Customise'],
		settings: 'Cookie settings',
	},
};

// Strictly necessary cookies only: the consent record and the locale cookie (cookie policy, "Essential").
const NECESSARY = new Set(['zz_consent', 'NEXT_LOCALE']);
// Known bug pages: focus stays on the page heading on a first visit (TASK-13.6).
const FOCUS_BUG = ['/m', '/en/m'];
const GTAG = 'googletagmanager.com/gtag/js';

async function visit(page: Page, path: string) {
	const external: string[] = [];
	await page.context().route(
		(url) => url.hostname !== 'localhost',
		(route) => {
			external.push(route.request().url());
			return route.fulfill({ contentType: 'text/javascript', body: '' });
		}
	);
	await page.goto(path);
	return external;
}

const storeChoice = (context: BrowserContext, record: object) =>
	context.addCookies([
		{
			name: 'zz_consent',
			value: encodeURIComponent(JSON.stringify(record)),
			domain: 'localhost',
			path: '/',
		},
	]);

const cookieNames = async (context: BrowserContext) => (await context.cookies()).map((cookie) => cookie.name);

/** No dataLayer and no gtag: Consent Mode never left its denied default (the script is never loaded). */
const gtagStarted = (page: Page) => page.evaluate(() => 'dataLayer' in window || 'gtag' in window);

test.describe('AC#1, AC#2: first visit on every public page', () => {
	for (const path of PUBLIC) {
		test(`${path}: banner in the page language; nothing reaches Google; Escape keeps it denied`, async ({
			page,
		}) => {
			const external = await visit(page, path);
			// A 404's first HTML is Next's error shell; the locale layout (and the banner) follow on the client.
			await page.locator('html[lang]').waitFor({ state: 'attached' });
			const lang = (await page.locator('html').getAttribute('lang')) as 'sl' | 'en';
			const copy = COPY[lang];
			const banner = page.getByRole('dialog', { name: copy.dialog });
			const heading = banner.getByRole('heading', { name: copy.title });

			await expect(banner).toBeVisible();
			await expect(heading).toBeFocused();
			await expect(banner.getByRole('button')).toHaveText(copy.buttons);
			await page.waitForLoadState('networkidle');
			await expectNoAnalyticsBeforeConsent(page);

			await heading.focus();
			await page.keyboard.press('Escape');
			await expect(banner).toBeHidden();
			await page.reload();
			await page.waitForLoadState('networkidle');
			// Ignored: asked again, nothing stored, only necessary storage, no Google request.
			await expect(banner).toBeVisible();
			await expectNoAnalyticsBeforeConsent(page);
			expect(external).toEqual([]);
			expect(await gtagStarted(page)).toBe(false);
			expect((await cookieNames(page.context())).filter((name) => !NECESSARY.has(name))).toEqual([]);
			expect(await cookieNames(page.context())).not.toContain('zz_consent');
		});
	}

	test('the manage page (/m) moves focus into the banner too', async ({ page }) => {
		for (const path of FOCUS_BUG) {
			await visit(page, path);
			await expect(page.getByRole('dialog')).toBeVisible();
			await expect(page.getByRole('dialog').getByRole('heading').first()).toBeFocused({ timeout: 3_000 });
		}
	});
});

test.describe('AC#1: equal weight, nothing pre-selected, every width', () => {
	for (const [name, viewport] of [
		['desktop', { width: 1440, height: 900 }],
		['mobile', { width: 390, height: 844 }],
		['320', { width: 320, height: 640 }],
	] as const) {
		test(`${name}: Reject and Accept identical, Reject first, Customise a text button, none primary, no overflow, header uncovered`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			await visit(page, '/en');
			const banner = page.getByRole('dialog', { name: 'Cookie choice' });
			await expect(banner).toBeVisible();

			const looks = async () =>
				banner.getByRole('button').evaluateAll((els) =>
					els.map((el) => {
						const s = getComputedStyle(el);
						const r = el.getBoundingClientRect();
						return {
							look: [s.backgroundColor, s.color, s.fontWeight, s.fontSize, s.borderRadius, s.borderWidth],
							width: Math.round(r.width),
							height: Math.round(r.height),
						};
					})
				);
			const first = await looks();
			expect(first).toHaveLength(3);
			// Reject and Accept weigh the same; Customise is a text button (TASK-115.11), still a 44 px target.
			expect(JSON.stringify(first[1]), JSON.stringify(first)).toBe(JSON.stringify(first[0]));
			for (const { height } of first) expect(height).toBeGreaterThanOrEqual(44);
			// The `secondary` fill, never `primary` (P17).
			const classes = await banner.getByRole('button').evaluateAll((els) => els.map((el) => el.classList.value));
			for (const value of classes.slice(0, 2)) expect(value.split(' ')).toContain('bg-secondary');
			for (const value of classes) expect(value.split(' ')).not.toContain('bg-primary');

			const layout = await page.evaluate(() => {
				const box = document.querySelector('[role="dialog"]')!.getBoundingClientRect();
				const header = document.querySelector('header')?.getBoundingClientRect();
				return {
					overflow: document.documentElement.scrollWidth - window.innerWidth,
					left: box.left,
					right: box.right,
					top: box.top,
					headerBottom: header?.bottom ?? 0,
				};
			});
			expect(layout.overflow).toBeLessThanOrEqual(0);
			expect(layout.left).toBeGreaterThanOrEqual(0);
			expect(layout.right).toBeLessThanOrEqual(viewport.width);
			expect(layout.top).toBeGreaterThanOrEqual(layout.headerBottom);

			await banner.getByRole('button', { name: 'Customise' }).click();
			await expect(banner.getByRole('switch', { name: 'Analytics cookies' })).not.toBeChecked();
			const necessary = banner.getByRole('switch', { name: /Essential/ });
			await expect(necessary).toBeChecked();
			await expect(necessary).toBeDisabled();
			await page.mouse.move(0, 0); // no hover fill on the button now under the pointer
			const custom = await looks();
			// Back is a text button; Save choice, Accept all and Reject all weigh the same.
			expect(new Set(custom.slice(1).map((b) => JSON.stringify(b))).size, JSON.stringify(custom)).toBe(1);
			expect(
				(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze())
					.violations
			).toEqual([]);
		});
	}

	test('390 px: the first view is about a third of the screen, its three buttons in one row (TASK-115.11)', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await visit(page, '/');
		const banner = page.getByRole('dialog', { name: 'Izbira piškotkov' });
		await expect(banner).toBeVisible();
		expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(844 * 0.36);
		const tops = await banner
			.getByRole('button')
			.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
		expect(new Set(tops).size, JSON.stringify(tops)).toBe(1);
	});

	test('200 % text at 320 px: the banner scrolls inside itself and every button stays reachable', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await visit(page, '/');
		await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
		const banner = page.getByRole('dialog', { name: 'Izbira piškotkov' });
		for (const name of COPY.sl.buttons) {
			const button = banner.getByRole('button', { name });
			const box = await button.evaluate((el) => {
				el.scrollIntoView({ block: 'nearest' });
				const r = el.getBoundingClientRect();
				return { top: r.top, bottom: r.bottom };
			});
			expect(box.top).toBeGreaterThanOrEqual(0);
			expect(box.bottom).toBeLessThanOrEqual(568);
		}
		// The banner itself never needs sideways scrolling (the page shell at 200 % is P1's, not checked here).
		const box = await banner.evaluate((el) => ({
			overflow: el.scrollWidth - el.clientWidth,
			left: el.getBoundingClientRect().left,
			right: el.getBoundingClientRect().right,
		}));
		expect(box.overflow).toBeLessThanOrEqual(0);
		expect(box.left).toBeGreaterThanOrEqual(0);
		expect(box.right).toBeLessThanOrEqual(320);
	});
});

test.describe('AC#2, AC#3, AC#4: storing, persisting, changing and withdrawing', () => {
	test('Reject: across client-side navigation no Google request, no dataLayer, only necessary cookies', async ({
		page,
	}) => {
		const external = await visit(page, '/');
		await page.getByRole('dialog').getByRole('button', { name: 'Zavrni vse' }).click();
		await expect(page.getByRole('dialog')).toBeHidden();
		for (const link of ['Politika piškotkov', 'Pogosta vprašanja', 'O nas']) {
			const target = page.getByRole('contentinfo').getByRole('link', { name: link });
			if ((await target.count()) === 0) continue;
			await target.first().click();
			await page.waitForLoadState('networkidle');
			await expect(page.getByRole('dialog')).toBeHidden();
		}
		await expectNoAnalyticsBeforeConsent(page);
		expect(external).toEqual([]);
		expect(await gtagStarted(page)).toBe(false);
		expect((await cookieNames(page.context())).filter((name) => !NECESSARY.has(name))).toEqual([]);
	});

	test('Accept: { v, analytics, ts } in a 12-month first-party cookie; GA at once; a new session keeps it', async ({
		page,
		browser,
		browserName,
	}) => {
		const external = await visit(page, '/en');
		const before = Date.now();
		await page.getByRole('dialog').getByRole('button', { name: 'Accept all' }).click();
		await expect.poll(() => external.some((url) => url.includes(GTAG))).toBe(true);

		const cookie = (await page.context().cookies()).find((c) => c.name === 'zz_consent')!;
		const record = JSON.parse(decodeURIComponent(cookie.value));
		expect(record).toEqual({ v: CONSENT_VERSION, analytics: true, ts: expect.any(String) });
		expect(Date.parse(record.ts)).toBeGreaterThanOrEqual(before - 5_000);
		const days = (cookie.expires * 1000 - Date.now()) / 86_400_000;
		expect(days).toBeGreaterThan(364);
		expect(days).toBeLessThanOrEqual(400); // Chrome's cap
		expect(cookie).toMatchObject({ path: '/', httpOnly: false });
		// Playwright's WebKit on Windows reports every cookie as SameSite=None.
		if (browserName !== 'webkit') expect(cookie.sameSite).toBe('Lax');

		// A new browser session with the stored cookies: no banner, GA starts on load.
		const next = await browser.newContext({ storageState: await page.context().storageState() });
		const again = await next.newPage();
		const seen = await visit(again, '/');
		await expect(again.getByRole('dialog')).toBeHidden();
		await expect.poll(() => seen.some((url) => url.includes(GTAG))).toBe(true);
		await next.close();
	});

	test('change later: after Reject, Cookie settings shows it off; switch + Save grants at once; Reject all withdraws', async ({
		page,
	}) => {
		const external = await visit(page, '/en');
		await page.getByRole('dialog').getByRole('button', { name: 'Reject all' }).click();

		await page.getByRole('button', { name: 'Cookie settings' }).click();
		const dialog = page.getByRole('dialog', { name: 'Cookie choice' });
		await expect(dialog.getByRole('heading', { name: 'Cookie settings' })).toBeFocused();
		const analytics = dialog.getByRole('switch', { name: 'Analytics cookies' });
		await expect(analytics).not.toBeChecked();
		await analytics.check();
		await dialog.getByRole('button', { name: 'Save choice' }).click();
		await expect(page.getByRole('status')).toHaveText('Choice saved.');
		await expect.poll(() => external.some((url) => url.includes(GTAG))).toBe(true);
		await page.context().addCookies([{ name: '_ga', value: 'GA1.1.1.1', domain: 'localhost', path: '/' }]);

		// Withdrawal: the same two steps as granting (open settings, one button).
		await page.getByRole('button', { name: 'Cookie settings' }).click();
		await expect(analytics).toBeChecked();
		await dialog.getByRole('button', { name: 'Reject all' }).click();
		await expect(dialog).toBeHidden();
		expect((await cookieNames(page.context())).filter((name) => name.startsWith('_ga'))).toEqual([]);
		const record = JSON.parse(
			decodeURIComponent((await page.context().cookies()).find((c) => c.name === 'zz_consent')!.value)
		);
		expect(record.analytics).toBe(false);
	});
});

test.describe('AC#5: keyboard and screen reader', () => {
	test('keyboard only: Tab order, Customise, Space on the switch, Enter on Save; settings by keyboard, focus returns', async ({
		page,
		browserName,
	}) => {
		const external = await visit(page, '/en');
		const dialog = page.getByRole('dialog', { name: 'Cookie choice' });
		await expect(dialog.getByRole('heading', { name: 'Cookies and your privacy' })).toBeFocused();
		await expect(dialog).toHaveAttribute('aria-describedby', 'consent-body');

		// Playwright's WebKit skips links on Tab (Safari's default), so the policy link is a Chromium-only stop.
		if (browserName !== 'webkit') {
			await page.keyboard.press('Tab');
			await expect(dialog.getByRole('link', { name: 'Cookie policy' })).toBeFocused();
		}
		for (const name of ['Reject all', 'Accept all', 'Customise']) {
			await page.keyboard.press('Tab');
			await expect(dialog.getByRole('button', { name })).toBeFocused();
		}
		await page.keyboard.press('Enter');
		await expect(dialog.getByRole('heading', { name: 'Cookie settings' })).toBeFocused();
		await page.keyboard.press('Shift+Tab');
		await expect(dialog.getByRole('button', { name: 'Back' })).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(dialog.getByRole('heading', { name: 'Cookies and your privacy' })).toBeFocused();
		await dialog.getByRole('button', { name: 'Customise' }).focus();
		await page.keyboard.press('Enter');

		// The necessary-cookies text links to the policy before the Analytics switch (Chromium-only stop, as above).
		if (browserName !== 'webkit') {
			await page.keyboard.press('Tab');
			await expect(dialog.getByRole('link', { name: 'cookie policy' })).toBeFocused();
		}
		await page.keyboard.press('Tab');
		const analytics = dialog.getByRole('switch', { name: 'Analytics cookies' });
		await expect(analytics).toBeFocused();
		await page.keyboard.press('Space');
		await expect(analytics).toBeChecked();
		await page.keyboard.press('Tab');
		await expect(dialog.getByRole('button', { name: 'Save choice' })).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(dialog).toBeHidden();
		await expect.poll(() => external.some((url) => url.includes(GTAG))).toBe(true);

		const settings = page.getByRole('button', { name: 'Cookie settings' });
		await settings.focus();
		await page.keyboard.press('Enter');
		await expect(dialog.getByRole('heading', { name: 'Cookie settings' })).toBeFocused();
		await expect(analytics).toBeChecked();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(settings).toBeFocused();
	});

	for (const [name, viewport] of [
		['mobile', { width: 390, height: 844 }],
		['desktop', { width: 1440, height: 900 }],
	] as const) {
		test(`WCAG 2.4.11 at ${name}: while the banner is open, Tab never lands on a control it hides entirely`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport);
			await visit(page, '/en');
			await expect(page.getByRole('dialog')).toBeVisible();
			const hidden: string[] = [];
			for (let i = 0; i < 80; i++) {
				await page.keyboard.press('Tab');
				const covered = await page.evaluate(() => {
					const el = document.activeElement as HTMLElement | null;
					const banner = document.querySelector('[role="dialog"]');
					if (!el || !banner || el === document.body || banner.contains(el)) return null;
					const a = el.getBoundingClientRect();
					const b = banner.getBoundingClientRect();
					const inside = a.top >= b.top && a.bottom <= b.bottom && a.left >= b.left && a.right <= b.right;
					const hit = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2);
					return inside && hit && banner.contains(hit)
						? (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40)
						: null;
				});
				if (covered && !hidden.includes(covered)) hidden.push(covered);
			}
			expect(hidden, 'focused controls entirely behind the banner').toEqual([]);
		});
	}
});

test.describe('AC#6: asked again', () => {
	test('the consent cookie outlives the 12-month window, so the re-ask can say a year has passed', async ({
		page,
	}) => {
		await visit(page, '/en');
		await page.getByRole('dialog').getByRole('button', { name: 'Reject all' }).click();
		const cookie = (await page.context().cookies()).find((c) => c.name === 'zz_consent')!;
		expect((cookie.expires * 1000 - Date.now()) / 86_400_000).toBeGreaterThan(366);
	});

	test('a grant older than 12 months: banner says a year has passed; nothing reaches Google', async ({ page }) => {
		await storeChoice(page.context(), {
			v: CONSENT_VERSION,
			analytics: true,
			ts: new Date(Date.now() - 366 * 86_400_000).toISOString(),
		});
		const external = await visit(page, '/en');
		const dialog = page.getByRole('dialog', { name: 'Cookie choice' });
		await expect(dialog).toContainText('It has been a year since your last choice. Please choose again.');
		await page.waitForLoadState('networkidle');
		expect(external).toEqual([]);
		await expectNoAnalyticsBeforeConsent(page);
	});

	test('a grant from an older consent version: asked again; nothing reaches Google', async ({ page }) => {
		await storeChoice(page.context(), { v: CONSENT_VERSION - 1, analytics: true, ts: new Date().toISOString() });
		const external = await visit(page, '/');
		await expect(page.getByRole('dialog', { name: 'Izbira piškotkov' })).toBeVisible();
		await page.waitForLoadState('networkidle');
		expect(external).toEqual([]);
		await expectNoAnalyticsBeforeConsent(page);
	});
});

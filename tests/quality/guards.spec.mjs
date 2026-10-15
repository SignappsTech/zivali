// Tests for guards.mjs on fixture pages: offline, no web app needed.
import { expect, test } from '@playwright/test';

import { expectNoAdSlots, expectNoAnalyticsBeforeConsent } from './guards.mjs';

const ORIGIN = 'http://fixture.test';

// Serves `html` at ORIGIN and stubs Google's endpoints so nothing leaves the machine.
async function open(page, html) {
	await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html', body: html }));
	await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.fulfill({ body: '' }));
	await page.goto(`${ORIGIN}/`);
}

test.describe('expectNoAdSlots', () => {
	test('passes on a page without ad slots', async ({ page }) => {
		await open(page, '<main><h1>Prijava izgubljene živali</h1></main>');
		await expectNoAdSlots(page);
	});

	test('fails on a page with an ad slot', async ({ page }) => {
		await open(page, '<main><aside data-ad-slot="sidebar"></aside></main>');
		await expect(expectNoAdSlots(page)).rejects.toThrow(/sidebar/);
	});
});

test.describe('expectNoAnalyticsBeforeConsent', () => {
	test('passes on a page without analytics', async ({ page }) => {
		await open(page, '<main><h1>Najdimo</h1></main>');
		await expectNoAnalyticsBeforeConsent(page);
	});

	test('fails when the page loads gtag.js', async ({ page }) => {
		await open(page, '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>');
		await expect(expectNoAnalyticsBeforeConsent(page)).rejects.toThrow(/googletagmanager\.com/);
	});

	test('fails when the page sends a GA4 hit', async ({ page }) => {
		await open(page, '<img alt="" src="https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST">');
		await expect(expectNoAnalyticsBeforeConsent(page)).rejects.toThrow(/region1\.google-analytics\.com/);
	});

	test('fails when the page sets a _ga cookie', async ({ page }) => {
		await open(page, "<script>document.cookie = '_ga=GA1.1.123.456; Path=/';</script>");
		await expect(expectNoAnalyticsBeforeConsent(page)).rejects.toThrow(/_ga/);
	});
});

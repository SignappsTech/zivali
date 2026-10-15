// Reusable Playwright guards for two docs/05 gates: "no ads in protected flows" and "analytics without consent".
// Import them in any Playwright spec: import { expectNoAdSlots, expectNoAnalyticsBeforeConsent } from '…/guards.mjs';
import { expect } from '@playwright/test';

// GA4 endpoints: gtag.js, the collect hits (www./regionN.) and Google signals. None may load before consent (ADR-009).
const ANALYTICS_HOST = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)$/;
const ANALYTICS_COOKIE = /^_(ga|gid|gat)(_|$)/;

/** Fails if the page renders an ad slot (`[data-ad-slot]`). Call it once the page has rendered. */
export async function expectNoAdSlots(page) {
	const slots = await page
		.locator('[data-ad-slot]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-ad-slot')));
	expect(slots, `ad slots on ${page.url()}`).toEqual([]);
}

/**
 * Fails if the page has requested an analytics endpoint or holds an analytics cookie. Call it before consent is granted.
 * It sees the page's last 100 requests (Playwright `page.requests()`), so in a long flow call it after each step.
 */
export async function expectNoAnalyticsBeforeConsent(page) {
	const requests = (await page.requests())
		.map((request) => request.url())
		.filter((url) => ANALYTICS_HOST.test(new URL(url).hostname));
	const cookies = (await page.context().cookies())
		.map(({ name }) => name)
		.filter((name) => ANALYTICS_COOKIE.test(name));
	expect({ requests, cookies }, `analytics before consent on ${page.url()}`).toEqual({ requests: [], cookies: [] });
}

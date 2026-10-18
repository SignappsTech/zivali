import { expect, type Locator, type Page } from '@playwright/test';

import { CONSENT_VERSION } from '@zivali/analytics';

// A session the server guard (getClaims) accepts: the token is signed by the mock API (e2e/mock-api.ts), which also
// serves the JWKS the web build verifies it against. The cookie is the one @supabase/ssr reads.
const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

export type E2eUser = { id: string; role: string; aal: 'aal1' | 'aal2' };

/** Origin of the mock API, which the web build also uses as its Supabase URL (playwright.config.ts). */
export const api = () => `http://localhost:${process.env.E2E_API_PORT}`;
const cookieName = () => `sb-${new URL(api()).hostname.split('.')[0]}-auth-token`;

async function setSession(page: Page, baseURL: string, accessToken: string, id: string) {
	const exp = Math.floor(Date.now() / 1000) + 86_400;
	const session = {
		access_token: accessToken,
		token_type: 'bearer',
		expires_in: 86_400,
		expires_at: exp,
		refresh_token: 'e2e',
		user: { id, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
	};
	await page.context().addCookies([{ name: cookieName(), value: `base64-${base64url(session)}`, url: baseURL }]);
}

export async function signInAs(page: Page, user: E2eUser, baseURL: string) {
	const query = new URLSearchParams({ sub: user.id, role: user.role.toLowerCase(), aal: user.aal });
	const token = await (await fetch(`${api()}/e2e/token?${query}`)).text();
	await setSession(page, baseURL, token, user.id);
}

/**
 * The PKCE verifier a sign-up leaves in this browser (supabase-js's fixed key, the one a server-side exchange reads),
 * so a confirmation link opened here signs in (e2e/mock-api.ts answers the exchange).
 */
export async function holdVerifier(page: Page, baseURL: string) {
	const value = `base64-${Buffer.from(JSON.stringify('e2e-verifier')).toString('base64url')}`;
	await page.context().addCookies([{ name: `${cookieName()}-code-verifier`, value, url: baseURL }]);
}

/** A recorded "analytics declined" choice, so the consent banner (TASK-13.2) does not cover the page under test. */
export async function dismissConsent(page: Page) {
	const choice = { v: CONSENT_VERSION, analytics: false, ts: new Date().toISOString() };
	const value = encodeURIComponent(JSON.stringify(choice));
	await page.context().addCookies([{ name: 'zz_consent', value, domain: 'localhost', path: '/' }]);
}

/**
 * Resolves once React has hydrated the element. Code that loads on demand (the owner's slots, owner-lazy.tsx) hydrates
 * after the page has loaded; until then its server-rendered button is inert and a press does nothing.
 */
export async function hydrated(locator: Locator) {
	await expect
		.poll(() => locator.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps$'))))
		.toBe(true);
	return locator;
}

/** The cookie of a forged session: right shape and kid, no valid signature. */
export async function signInForged(page: Page, baseURL: string) {
	const claims = { sub: 'forged', aal: 'aal2', exp: 4_000_000_000 };
	const token = [base64url({ alg: 'ES256', typ: 'JWT', kid: 'e2e-key' }), base64url(claims), 'e2e'].join('.');
	await setSession(page, baseURL, token, 'forged');
}

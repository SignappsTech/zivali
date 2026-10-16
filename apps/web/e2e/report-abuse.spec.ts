import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request, test } from '@playwright/test';

import { dismissConsent } from './session';

// TASK-25.3: P10 report abuse from slot C of /r/Rex12345 (e2e/mock-api.ts serves the report to the server). The
// browser's calls are answered here: GoTrue's anonymous sign-in (POST /auth/v1/signup, only on send) and the API.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const ACCESS_TOKEN = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: 'anon-1', is_anonymous: true, exp }), 'e2e'].join(
	'.'
);

/** Answers sign-in and POST /v1/abuse-reports (CORS preflights pass); returns the requests it saw. */
async function answer(page: Page, report: { status: number; body: object }) {
	const seen: Request[] = [];
	const signup = {
		status: 200,
		body: {
			access_token: ACCESS_TOKEN,
			token_type: 'bearer',
			expires_in: 3600,
			expires_at: exp,
			refresh_token: 'e2e',
			user: {
				id: 'anon-1',
				aud: 'authenticated',
				role: 'authenticated',
				is_anonymous: true,
				app_metadata: {},
				user_metadata: {},
				created_at: new Date().toISOString(),
			},
		},
	};
	await page.route(
		(url) => url.pathname === '/v1/abuse-reports' || url.pathname === '/auth/v1/signup',
		(route) => {
			const request = route.request();
			const cors = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
			};
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
			seen.push(request);
			const reply = new URL(request.url()).pathname === '/auth/v1/signup' ? signup : report;
			return route.fulfill({ status: reply.status, json: reply.body, headers: cors });
		}
	);
	return seen;
}

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

async function openDialog(page: Page) {
	await page.getByRole('button', { name: 'Več možnosti' }).click();
	await page.getByRole('menuitem', { name: 'Prijavi zlorabo' }).click();
	const dialog = page.getByRole('dialog', { name: 'Kaj je narobe?' });
	await expect(dialog.getByRole('heading', { name: 'Kaj je narobe?' })).toBeFocused();
	return dialog;
}

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 },
]) {
	test(`a visitor reports /r/Rex12345 from "Več možnosti" (${viewport.width} px)`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await dismissConsent(page);
		const seen = await answer(page, { status: 201, body: { id: 'ab1', duplicate: false } });
		await page.goto('/r/Rex12345');

		const dialog = await openDialog(page);
		await expect(dialog).toContainText('Glede objave: Rex');
		await expect(dialog.getByRole('button', { name: 'Pošlji' })).toBeDisabled();
		await expect(dialog.getByText('Najprej izberite razlog.')).toBeVisible();
		await expectNoAxeViolations(page);
		// The session waits for "Pošlji".
		expect(seen).toEqual([]);

		await dialog.getByRole('radio', { name: 'Prevara ali zahteva po denarju' }).click();
		await dialog.getByRole('textbox', { name: 'Kaj ste opazili? (neobvezno)' }).fill('Hoče denar vnaprej.');
		await dialog.getByRole('button', { name: 'Pošlji' }).click();

		const thanks = page.getByRole('dialog', { name: 'Hvala' });
		await expect(thanks.getByRole('heading', { name: 'Hvala' })).toBeFocused();
		expect(seen.map((request) => new URL(request.url()).pathname)).toEqual([
			'/auth/v1/signup',
			'/v1/abuse-reports',
		]);
		expect(seen[1]!.postDataJSON()).toMatchObject({
			target_type: 'report',
			reason: 'scam',
			note: 'Hoče denar vnaprej.',
		});
		expect(seen[1]!.headers().authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
		await expectNoAxeViolations(page);

		await thanks.getByRole('button', { name: 'Končano' }).click();
		await expect(page.getByRole('button', { name: 'Več možnosti' })).toBeFocused();
	});
}

test('rate limited: the calm note, the choice kept, axe clean', async ({ page }) => {
	await dismissConsent(page);
	const seen = await answer(page, { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'slow down' } } });
	await page.goto('/r/Rex12345');

	const dialog = await openDialog(page);
	await dialog.getByRole('radio', { name: 'Neželena vsebina' }).click();
	await dialog.getByRole('button', { name: 'Pošlji' }).click();

	await expect(dialog.getByRole('status')).toHaveText(
		'Ta trenutek ne morete poslati nove prijave zlorabe. Poskusite znova pozneje.'
	);
	await expect(dialog.getByRole('radio', { name: 'Neželena vsebina' })).toHaveAttribute('aria-checked', 'true');
	await expect(dialog.getByRole('button', { name: 'Pošlji' })).toBeDisabled();
	await expectNoAxeViolations(page);
	expect(seen.filter((request) => request.url().endsWith('/v1/abuse-reports'))).toHaveLength(1);

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('button', { name: 'Več možnosti' })).toBeFocused();
});

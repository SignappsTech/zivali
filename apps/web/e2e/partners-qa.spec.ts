import { expect, type Page, test } from '@playwright/test';

// TASK-38.4 QA additions to partners.spec.ts: error notes with the data kept and no auto-retry, lazy captcha, consent
// not pre-ticked, FAQ JSON-LD parity, sitemap. Written against the page sources; run in the merge queue on main.
const appUrl = `http://localhost:${process.env.PLAYWRIGHT_PORT}`;

async function answerLeads(page: Page, status: number, body: unknown) {
	const sent: unknown[] = [];
	await page.route('**/v1/leads', (route) => {
		const request = route.request();
		const cors = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
		};
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
		sent.push(request.postDataJSON());
		return route.fulfill({ status, json: body, headers: cors });
	});
	return sent;
}

for (const { status, code, note } of [
	{
		status: 400,
		code: 'CAPTCHA_FAILED',
		note: 'The check did not work. Your details are still in the form; please try again.',
	},
	{ status: 500, code: 'INTERNAL', note: 'The enquiry could not be sent. Please try again in a few minutes.' },
]) {
	test(`P22 enquiry: ${code} shows its note, keeps the details and does not retry on its own`, async ({ page }) => {
		const sent = await answerLeads(page, status, { error: { code, message: 'x' } });
		await page.goto('/en/advertise#enquiry');
		const form = page.locator('#enquiry');
		await form.getByLabel('Company').fill('Example clinic');
		await form.getByLabel('Full name').fill('Ana Novak');
		await form.getByLabel('Email address').fill('ana@example.com');
		await form.getByLabel('Message').fill('Interested in the report page slot.');
		await form.getByRole('checkbox', { name: /I agree/ }).check();

		await form.getByRole('button', { name: 'Send enquiry' }).click();

		await expect(form.getByRole('alert')).toHaveText(note);
		await expect(form.getByLabel('Company')).toHaveValue('Example clinic');
		await expect(form.getByRole('checkbox', { name: /I agree/ })).toBeChecked();
		await page.waitForTimeout(1500);
		expect(sent).toHaveLength(1);
	});
}

test('P22 enquiry: consent is not pre-ticked and no captcha script loads before the first submit', async ({ page }) => {
	const captchaRequests: string[] = [];
	page.on('request', (request) => {
		if (/turnstile|challenges\.cloudflare/.test(request.url())) captchaRequests.push(request.url());
	});
	await page.goto('/en/advertise');
	await expect(page.getByRole('checkbox', { name: /I agree/ })).not.toBeChecked();
	expect(captchaRequests).toEqual([]);
});

test('P22 the FAQ JSON-LD matches the visible FAQ, in both languages', async ({ page }) => {
	for (const path of ['/oglasevanje', '/en/advertise']) {
		await page.goto(path);
		const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!)['@graph'];
		const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
		expect(faq.mainEntity).toHaveLength(6);
		for (const { name } of faq.mainEntity as { name: string }[]) {
			await expect(page.getByText(name, { exact: true })).toBeVisible();
		}
	}
});

test('P22 the sitemap lists both locales with hreflang alternates', async ({ request }) => {
	const xml = await (await request.get('/sitemap.xml')).text();
	expect(xml).toContain(`${appUrl}/oglasevanje`);
	expect(xml).toContain(`hreflang="en" href="${appUrl}/en/advertise"`);
});

// Quality gates per page and viewport (docs/05 §Quality gates): axe WCAG 2.0/2.1/2.2 A + AA (0 violations), no console
// or page errors, no analytics before consent, visual snapshot (≤ 2 % pixel diff, reviewed by the design lead), and no ad
// slots in protected flows. Run it with `pnpm quality`, which builds and serves the web app on :8080.
import { existsSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { expectNoAdSlots, expectNoAnalyticsBeforeConsent } from './guards.mjs';

// Key public pages (docs/03 page inventory). Each story that adds a public route adds it here.
// The shelter pages (TASK-90) read the directory API at NEXT_PUBLIC_API_URL (apps/api, or apps/web/e2e/mock-api.ts).
const PAGES = [
	'/',
	'/en',
	'/zavetisca',
	'/en/shelters',
	'/zavetisca/zavetisce-ljubljana',
	'/en/shelters/zavetisce-ljubljana',
];
// Protected flows (report-lost, report-found, sign-in, chat, payment), SL and EN. Each of those stories adds its routes.
const PROTECTED = [
	// TASK-9.3 sign-in, sign-up and reset (P16)
	'/vpis',
	'/en/sign-in',
	'/registracija',
	'/en/sign-up',
	'/pozabljeno-geslo',
	'/en/reset-password',
	// TASK-17.2 manage link (P7)
	'/m',
	'/en/m',
];
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const path of PAGES) {
	const slug = path === '/' ? 'home' : path.slice(1).replace(/\W+/g, '-');

	for (const [name, viewport] of Object.entries(VIEWPORTS)) {
		test(`${path} @${name}`, async ({ page }) => {
			const errors = [];
			page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
			page.on('pageerror', (error) => errors.push(error.message));
			await page.setViewportSize(viewport);
			await page.goto(path, { waitUntil: 'networkidle' });

			const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
			const violations = axe.violations.map((v) => `${v.id}: ${v.nodes.length} node(s), ${v.helpUrl}`);
			expect.soft(violations, 'axe violations').toEqual([]);
			expect.soft(errors, 'console and page errors').toEqual([]);
			await expectNoAnalyticsBeforeConsent(page);

			// Visual: compared only with a design-lead-approved baseline; until one is committed the run notes it.
			const file = `${slug}-${name}.png`;
			const writing = ['all', 'changed'].includes(test.info().config.updateSnapshots);
			if (writing || existsSync(test.info().snapshotPath(file, { kind: 'screenshot' }))) {
				await expect(page).toHaveScreenshot(file, { fullPage: true });
			} else {
				test.info().annotations.push({ type: 'visual', description: `no approved baseline for ${file} yet` });
			}
		});
	}
}

for (const path of PROTECTED) {
	test(`${path} has no ad slots`, async ({ page }) => {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expectNoAdSlots(page);
	});
}

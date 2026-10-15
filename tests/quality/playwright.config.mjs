// Playwright config for the quality kit. `pnpm quality` (scripts/quality.mjs) serves the web app on a free port (BASE_URL) first;
// guards.spec.mjs runs offline on its own: pnpm exec playwright test -c tests/quality guards
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: '.',
	forbidOnly: !!process.env.CI,
	outputDir: '../../quality-report/test-results',
	reporter: [['list'], ['html', { outputFolder: '../../quality-report/playwright', open: 'never' }]],
	// Visual baselines: once the design lead approves the build against the mockup, write them with
	// `pnpm quality --update-snapshots` and commit them (per OS: fonts render differently). Pages without one are skipped.
	snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
	expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
	use: { baseURL: process.env.BASE_URL ?? `http://localhost:${process.env.QUALITY_PORT || 8080}` },
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
});

import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Values from .env.local win; the fallbacks let the smoke test run without a local Supabase.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
	testDir: './e2e',
	forbidOnly: !!process.env.CI,
	use: { baseURL: 'http://localhost:3000' },
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
	webServer: {
		command: 'pnpm build && pnpm start',
		url: 'http://localhost:3000/api/health',
		reuseExistingServer: !process.env.CI,
		timeout: 300_000,
		env: {
			NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
			NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'e2e-placeholder',
		},
	},
});

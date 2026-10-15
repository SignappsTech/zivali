import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

import { freePort } from '../../scripts/free-port.mjs';

// Values from .env.local win; the fallbacks let the smoke test run without a local Supabase.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
// The C18 directory mock (e2e/mock-api.ts) stands in for apps/api; the web app is built against it.
const apiPort = (process.env.E2E_API_PORT ||= String(freePort()));
const api = `http://localhost:${apiPort}`;

// One free port per run (parallel worktrees); written back to the env so Playwright's workers load the same value.
const port = (process.env.PLAYWRIGHT_PORT ||= String(freePort()));
const origin = `http://localhost:${port}`;

export default defineConfig({
	testDir: './e2e',
	forbidOnly: !!process.env.CI,
	use: { baseURL: origin },
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
	webServer: [
		{
			command: 'node e2e/mock-api.ts',
			url: `${api}/health`,
			reuseExistingServer: process.env.PW_REUSE === '1',
			env: { PORT: apiPort },
		},
		{
			// The standalone server, as deployed; it does not copy public/ and .next/static itself.
			command:
				"pnpm build && node -e \"const{cpSync,existsSync}=require('fs'),d='.next/standalone/apps/web/';cpSync('.next/static',d+'.next/static',{recursive:true});existsSync('public')&&cpSync('public',d+'public',{recursive:true})\" && node .next/standalone/apps/web/server.js",
			url: `${origin}/api/health`,
			// Only with PW_REUSE=1: a foreign server on the port would otherwise be tested silently.
			reuseExistingServer: process.env.PW_REUSE === '1',
			timeout: 300_000,
			env: {
				PORT: port,
				APP_ENV: 'local',
				HOSTNAME: 'localhost',
				NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
				NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
					process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'e2e-placeholder',
				// e2e/analytics.spec.ts: ga4 with a test id; the spec answers every Google request itself.
				NEXT_PUBLIC_ANALYTICS_PROVIDER: 'ga4',
				NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-E2ETEST',
				NEXT_PUBLIC_API_URL: api,
				NEXT_PUBLIC_APP_URL: origin,
			},
		},
	],
});

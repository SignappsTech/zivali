import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		// lib/env.ts validates on import; unit tests never reach Supabase.
		env: {
			NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
			NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test',
			NEXT_PUBLIC_APP_URL: 'https://najdimo.si',
		},
		// e2e/ holds the Playwright specs.
		exclude: [...configDefaults.exclude, 'e2e/**'],
		// Through Vite, so its `next/*` imports resolve and vi.mock('next/navigation') reaches them.
		server: { deps: { inline: ['next-intl'] } },
		// Agents run tests in parallel worktrees: a quarter of the cores each instead of one worker per core.
		maxWorkers: '25%',
		// jsdom start-up takes over 5 s when many agents share the machine.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});

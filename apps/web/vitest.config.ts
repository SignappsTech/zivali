import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: 'jsdom',
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
		// jsdom start-up takes over 5 s when many agents share the machine.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});

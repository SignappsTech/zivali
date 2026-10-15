// Vitest + Supertest against the real local database (ADR-015). Needs `pnpm db:start` and apps/api/.env.local.
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		globalSetup: ['test/global-setup.ts'],
		setupFiles: ['test/setup.ts'],
		// One shared database: test files run one after another.
		fileParallelism: false,
		// DB-heavy tests (seeders through Auth, geocoder, idempotency) pass in 1-2 s alone but exceed 5 s when many
		// worktrees share the machine and the local database; same headroom as apps/web.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});

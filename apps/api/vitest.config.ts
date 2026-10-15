// Vitest + Supertest against the real local database (ADR-015). Needs `pnpm db:start` and apps/api/.env.local.
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		globalSetup: ['test/global-setup.ts'],
		setupFiles: ['test/setup.ts'],
		// One shared database: test files run one after another.
		fileParallelism: false,
	},
});

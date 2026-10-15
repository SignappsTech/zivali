// Vitest + Supertest against the real local database (ADR-015). Needs `pnpm db:start` and apps/api/.env.local.
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// @zivali/* from this checkout's packages (tsconfig.base.json paths), not the shared node_modules links.
	resolve: { tsconfigPaths: true },
	test: {
		include: ['test/**/*.test.ts'],
		globalSetup: ['test/global-setup.ts'],
		setupFiles: ['test/setup.ts'],
		// ctx.adapters.storage is the in-memory adapter in tests, whatever .env.local says: tests never reach R2 or
		// MinIO (the storage adapter test builds its MinIO client explicitly). Payments likewise stay on the mock provider:
		// no test reaches Stripe (the stripe adapter test stubs fetch).
		env: { STORAGE_PROVIDER: 'memory', PAYMENTS_PROVIDER: 'mock' },
		// One shared database: test files run one after another.
		fileParallelism: false,
		// DB-heavy tests (seeders through Auth, geocoder, idempotency) pass in 1-2 s alone but exceed 5 s when many
		// worktrees share the machine and the local database; same headroom as apps/web.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});

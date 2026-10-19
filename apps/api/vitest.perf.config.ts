// On-demand performance checks (`pnpm --filter api test:perf`), never part of `pnpm test` / `pnpm verify`: the main
// config only picks up test/**/*.test.ts. Same setup and env as the main config; seeding 50k vectors needs minutes.
import { defineConfig } from 'vitest/config';

import base from './vitest.config.ts';

export default defineConfig({
	...base,
	test: { ...base.test, include: ['test/perf/**/*.perf.ts'], testTimeout: 900_000, hookTimeout: 900_000 },
});

import { defineConfig } from 'vitest/config';

// Mirrors the API process: the zod-to-openapi extension is installed before any schema loads. @zivali/types comes
// from this checkout (tsconfig.base.json paths), not the shared node_modules links.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: { setupFiles: ['./src/openapi-extend.ts'] },
});

import { defineConfig } from 'vitest/config';

// Mirrors the API process: the zod-to-openapi extension is installed before any schema loads.
export default defineConfig({ test: { setupFiles: ['./src/openapi-extend.ts'] } });

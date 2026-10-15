// One build for both processes of the image: dist/server.js (API) and dist/worker.js (pg-boss worker).
// Dependencies stay external (installed in the image); our code and the generated Prisma client are bundled.
import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['server.ts', 'worker.ts'],
	format: 'esm',
	target: 'node22',
	platform: 'node',
	outDir: 'dist',
	sourcemap: true,
	clean: true,
});

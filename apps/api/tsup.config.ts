// One build for both processes of the image: dist/server.js (API) and dist/worker.js (pg-boss worker).
// npm dependencies stay external (installed in the image); our code, the generated Prisma client and the workspace
// packages (TypeScript source, which Node does not run from node_modules) are bundled.
import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['server.ts', 'worker.ts'],
	noExternal: [/^@zivali\//],
	format: 'esm',
	target: 'node22',
	platform: 'node',
	outDir: 'dist',
	sourcemap: true,
	clean: true,
});

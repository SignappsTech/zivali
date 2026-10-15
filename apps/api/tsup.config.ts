// One build for both processes of the image: dist/server.js (API) and dist/worker.js (pg-boss worker), plus the seed
// that deploy/remote.sh runs after the migrations. npm dependencies stay external (installed in the image); our code,
// the generated Prisma client and the workspace packages (TypeScript source, which Node does not run from
// node_modules) are bundled.
import { readdirSync } from 'node:fs';

import { defineConfig } from 'tsup';

// prisma/seed.ts and every seeder, under dist/seed/ in the repo's own layout (dist/seed/apps/api/prisma/…): the
// seeders find their data relative to their own file (./data/, ../../../../supabase/seed/geo/,
// ../../../../scripts/geo-to-sql.mjs), and the Dockerfile copies that data to the same places under dist/seed/.
// A seeder that reads files must not be imported by another one: shared code moves into a chunk in dist/.
const seed = Object.fromEntries(
	[
		'seed.ts',
		...readdirSync('prisma/seeders')
			.filter((file) => file.endsWith('.seeder.ts'))
			.map((f) => `seeders/${f}`),
	].map((file) => [`seed/apps/api/prisma/${file.slice(0, -'.ts'.length)}`, `prisma/${file}`])
);

export default defineConfig({
	entry: { server: 'server.ts', worker: 'worker.ts', ...seed },
	noExternal: [/^@zivali\//],
	format: 'esm',
	target: 'node22',
	platform: 'node',
	outDir: 'dist',
	sourcemap: true,
	clean: true,
});

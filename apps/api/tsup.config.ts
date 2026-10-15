// Two builds for the image. dist/server.js (API) and dist/worker.js (pg-boss worker) share one build. The seed that
// deploy/remote.sh runs after the migrations gets its own build under dist/seed/: its entries must not change how the
// processes' shared chunks are split, because a shared chunk that evaluated @zivali/validation before its openapi
// extension crashed the API at start (71b8b15). npm dependencies stay external (installed in the image); our code,
// the generated Prisma client and the workspace packages (TypeScript source, which Node does not run from
// node_modules) are bundled.
import { readdirSync } from 'node:fs';

import { defineConfig, type Options } from 'tsup';

const common = {
	noExternal: [/^@zivali\//],
	format: 'esm',
	target: 'node22',
	platform: 'node',
	sourcemap: true,
} satisfies Options;

// prisma/seed.ts and every seeder, under dist/seed/ in the repo's own layout (dist/seed/apps/api/prisma/…): the
// seeders find their data relative to their own file (./data/, ../../../../supabase/seed/geo/,
// ../../../../scripts/geo-to-sql.mjs), and the Dockerfile copies that data to the same places under dist/seed/.
// A seeder that reads files must not be imported by another one: shared code moves into a chunk in dist/seed/.
const seed = Object.fromEntries(
	[
		'seed.ts',
		...readdirSync('prisma/seeders')
			.filter((file) => file.endsWith('.seeder.ts'))
			.map((f) => `seeders/${f}`),
	].map((file) => [`apps/api/prisma/${file.slice(0, -'.ts'.length)}`, `prisma/${file}`])
);

export default defineConfig([
	// Each build cleans only its own output: the two run in parallel.
	{ ...common, entry: { server: 'server.ts', worker: 'worker.ts' }, outDir: 'dist', clean: ['!seed/**'] },
	{ ...common, entry: seed, outDir: 'dist/seed', clean: true },
]);

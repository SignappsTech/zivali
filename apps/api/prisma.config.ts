// Prisma CLI config (Prisma 7). The CLI runs from apps/api, so `.env.local` is read from here; real env vars win.
import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

// ADR-021: Prisma only owns schema `app`. Without `?schema=app` the migrations table and
// `migrate reset` would target Supabase's `public` schema.
if (url && new URL(url).searchParams.get('schema') !== 'app') {
	throw new Error('DATABASE_URL and DIRECT_URL must end with ?schema=app (ADR-021)');
}

export default defineConfig({
	schema: 'prisma/schemas',
	migrations: {
		path: 'prisma/schemas/migrations',
		seed: 'tsx prisma/seed.ts',
	},
	typedSql: { path: 'prisma/sql' },
	datasource: { url },
});

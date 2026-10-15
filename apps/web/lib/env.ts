import { z } from 'zod';

// Add a variable here when the first code reads it (names: docs/tech/frontend.md, .env.example).
const schema = z.object({
	NEXT_PUBLIC_SUPABASE_URL: z.url(),
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	NEXT_PUBLIC_API_URL: z.url().default('http://localhost:4000'),
	// Server only: undefined in the browser, so read them on the server.
	APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
	APP_VERSION: z.string().default('dev'),
});

export type Env = z.infer<typeof schema>;

/** Throws once, naming every missing or invalid variable. Empty values count as missing. */
export function parseEnv(source: Record<string, string | undefined>): Env {
	const values = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value || undefined]));
	const result = schema.safeParse(values);
	if (!result.success) {
		const problems = result.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`);
		throw new Error(
			`Invalid environment: ${problems.join(', ')}. Set it in apps/web/.env.local (see .env.example).`
		);
	}
	return result.data;
}

// NEXT_PUBLIC_* are inlined at build time only when written out in full, so no `...process.env`.
const source = {
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
	APP_ENV: process.env.APP_ENV,
	APP_VERSION: process.env.APP_VERSION,
};

// `next build` loads route modules without reading them (every page renders per request for the CSP nonce), so a
// build without .env.local still passes `pnpm verify`; the server and the browser fail on the first import instead.
export const env = process.env.NEXT_PHASE === 'phase-production-build' ? (source as Env) : parseEnv(source);
